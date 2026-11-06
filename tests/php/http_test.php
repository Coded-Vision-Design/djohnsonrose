<?php
// tests/php/http_test.php - end-to-end checks through PHP's built-in server
// and dev-server.php: routes and 404s, the privacy page, telemetry, weather,
// admin sign-in and sign-out, and inputs that used to cause a 500. The server
// gets its own state folder and a database that is not there, unless
// TEST_DB_NAME names a throwaway database (see tests/php/db_test.php), in
// which case stored events are checked too.
// Run with: php tests/php/http_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/admin_session.php';
require_once __DIR__ . '/../../lib/request.php';
require_once __DIR__ . '/../../lib/weather.php';
require_once __DIR__ . '/../../lib/telemetry.php';

$failures = 0;
$passes = 0;

function check(string $label, bool $ok): void {
    global $failures, $passes;
    if ($ok) {
        $passes++;
        return;
    }
    $failures++;
    echo "FAIL: {$label}\n";
}

function freePort(): int {
    $socket = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int)substr(strrchr(stream_socket_get_name($socket, false), ':'), 1);
    fclose($socket);
    return $port;
}

/** Starts php -S and waits until it answers. */
function startServer(int $port, string $docroot, string $router, array $env) {
    $command = [PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $docroot, $router];
    $process = proc_open($command, [1 => ['file', sys_get_temp_dir() . "/http_test_{$port}.log", 'a'], 2 => ['file', sys_get_temp_dir() . "/http_test_{$port}.log", 'a']], $pipes, $docroot, $env + getenv());
    for ($i = 0; $i < 100; $i++) {
        $probe = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
        if ($probe) {
            fclose($probe);
            return $process;
        }
        usleep(100_000);
    }
    throw new RuntimeException("php -S did not start on port {$port}");
}

function stopServer($process): void {
    $status = proc_get_status($process);
    if (PHP_OS_FAMILY === 'Windows') {
        exec('taskkill /F /T /PID ' . (int)$status['pid'] . ' 2>NUL');
    } else {
        proc_terminate($process);
    }
    proc_close($process);
}

/** A raw HTTP/1.0 request, so every header is under the test's control. */
function http(string $method, string $path, array $headers = [], ?string $body = null, ?int $port = null): array {
    global $sitePort;
    $port ??= $sitePort;
    $socket = fsockopen('127.0.0.1', $port, $errno, $errstr, 5);
    $request = "{$method} {$path} HTTP/1.0\r\nHost: localhost:{$port}\r\n";
    foreach ($headers as $name => $value) $request .= "{$name}: {$value}\r\n";
    if ($body !== null) $request .= 'Content-Length: ' . strlen($body) . "\r\n";
    fwrite($socket, $request . "Connection: close\r\n\r\n" . ($body ?? ''));
    stream_set_timeout($socket, 20);
    $raw = (string)stream_get_contents($socket);
    fclose($socket);

    [$head, $content] = array_pad(explode("\r\n\r\n", $raw, 2), 2, '');
    $lines = explode("\r\n", $head);
    preg_match('#^HTTP/\S+ (\d{3})#', (string)array_shift($lines), $m);
    $parsed = [];
    foreach ($lines as $line) {
        [$name, $value] = array_pad(explode(':', $line, 2), 2, '');
        $parsed[strtolower(trim($name))][] = trim($value);
    }
    return ['status' => (int)($m[1] ?? 0), 'headers' => $parsed, 'body' => $content];
}

function header_value(array $response, string $name): string {
    return implode(', ', $response['headers'][strtolower($name)] ?? []);
}

$root = realpath(__DIR__ . '/../..');
$stateDir = sys_get_temp_dir() . '/http_test_state_' . bin2hex(random_bytes(6));
mkdir($stateDir);
$secret = 'http-test-secret';
$withDb = (string)getenv('TEST_DB_NAME') !== '';
$env = [
    'APP_STATE_DIR' => $stateDir,
    'APP_DEBUG' => 'false',
    'DB_HOST' => getenv('TEST_DB_HOST') ?: '127.0.0.1',
    'DB_PORT' => getenv('TEST_DB_PORT') ?: '1',
    'DB_NAME' => $withDb ? getenv('TEST_DB_NAME') : 'portfolio_os_no_such_db',
    'DB_USER' => getenv('TEST_DB_USER') ?: 'root',
    'DB_PASS' => getenv('TEST_DB_PASS') ?: '',
    'ADMIN_EMAILS' => 'Owner@Example.com',
    'ADMIN_SESSION_SECRET' => $secret,
    'GOOGLE_OAUTH_CLIENT_ID' => 'http-test-client',
    'TRUSTED_PROXIES' => '127.0.0.1',
    'WEATHER_LATITUDE' => '51.87',
    'WEATHER_LONGITUDE' => '0.56',
    'WEATHER_CITY' => 'Essex',
];
if ($withDb) {
    // Fresh tables in the throwaway database, made by lib/migrate.php itself.
    $pdo = new PDO('mysql:host=' . $env['DB_HOST'] . ';port=' . $env['DB_PORT'] . ';dbname=' . $env['DB_NAME'], $env['DB_USER'], $env['DB_PASS']);
    $pdo->exec('DROP TABLE IF EXISTS event_logs, email_logs');
    $migrate = proc_open([PHP_BINARY, $root . '/lib/migrate.php'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $root, $env + getenv());
    $output = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    check('migrate: runs cleanly' . ($output !== '' ? " ({$output})" : ''), proc_close($migrate) === 0 && str_contains($output, 'Tables are in place.'));
}

$sitePort = freePort();
$server = startServer($sitePort, $root, $root . '/dev-server.php', $env);
$origin = "http://localhost:{$sitePort}";

try {
    // ---- Routes: real paths keep working ----
    foreach (['/', '/login', '/desktop', '/app/word', '/app/word/', '/app/calculator?x=1'] as $path) {
        $r = http('GET', $path);
        check("route: {$path} gives 200", $r['status'] === 200);
        check("route: {$path} is the desktop", str_contains($r['body'], 'window.portfolioConfig'));
    }
    // The CV page's own template replaces the desktop here once it lands.
    check('route: /cv is kept, not a 404', http('GET', '/cv')['status'] === 200);
    check('route: a deep link opens its app', str_contains(http('GET', '/app/word')['body'], 'appToOpen: "word"'));
    foreach (['/api/news.php', '/assets/css/app.css', '/data/portfolio.json', '/portfolio/1uthealth.webp', '/manifest.json', '/favicon.ico', '/robots.txt'] as $path) {
        check("route: {$path} gives 200", http('GET', $path)['status'] === 200);
    }
    $r = http('GET', '/v2/');
    check('route: /v2/ is handed to the React build, not a 404', $r['status'] === 302 && str_contains(header_value($r, 'Location'), '/v2/'));

    // ---- Routes: anything else is a real 404 ----
    foreach (['/nonexistent-page', '/app/nope', '/app/%27+alert(1)+%27', '/api/nope.php', '/assets/nope.js',
              '/sitemaps.php', '/api/database_query.php', '/desktop/extra', '/admin-panel'] as $path) {
        $r = http('GET', $path);
        check("404: {$path} gives 404", $r['status'] === 404);
        check("404: {$path} shows the simple page", str_contains($r['body'], '<h1>Page not found</h1>'));
    }
    $r = http('GET', '/nonexistent-page');
    check('404: has no script at all', !str_contains($r['body'], '<script'));
    check('404: is not indexed', str_contains($r['body'], '<meta name="robots" content="noindex">'));
    check('404: links home', str_contains($r['body'], 'href="/"'));
    check('404: does not echo the path back', !str_contains(http('GET', '/%3Cb%3Ehello')['body'], '<b>hello'));

    // ---- The privacy page ----
    $r = http('GET', '/privacy');
    $page = $r['body'];
    check('privacy: gives 200', $r['status'] === 200);
    check('privacy: is HTML in UTF-8', str_contains(header_value($r, 'Content-Type'), 'text/html; charset=UTF-8'));
    check('privacy: runs no JavaScript', !preg_match('/<script|\son[a-z]+=/i', $page));
    check('privacy: its policy allows no scripts', str_contains(header_value($r, 'Content-Security-Policy'), "default-src 'none'"));
    check('privacy: its styles carry the nonce', preg_match("/style-src 'nonce-([^']+)'/", header_value($r, 'Content-Security-Policy'), $nonce) === 1 && str_contains($page, "<style nonce=\"{$nonce[1]}\">"));
    check('privacy: has a skip link to the main content', str_contains($page, 'href="#main-content"') && str_contains($page, 'id="main-content"'));
    check('privacy: uses landmarks', str_contains($page, '<header') && str_contains($page, '<nav') && str_contains($page, '<main') && str_contains($page, '<footer'));
    check('privacy: has a sticky header', str_contains($page, 'position: sticky') && str_contains($page, 'top: 0'));
    check('privacy: fits a phone', str_contains($page, 'name="viewport" content="width=device-width, initial-scale=1"') && str_contains($page, 'overflow-x: clip'));
    check('privacy: is in British English', str_contains($page, 'lang="en-GB"'));
    check('privacy: matches the cookie banner', str_contains($page, 'If you accept, the site records which apps you open and a shortened IP address, and may load Google Analytics. Records are kept for 90 days.'));
    check('privacy: names the events', str_contains($page, 'opening or closing an app') && str_contains($page, 'Terminal'));
    check('privacy: explains the shortened address', str_contains($page, '203.0.113.0') && str_contains($page, '48 bits'));
    check('privacy: gives the retention period', str_contains($page, TELEMETRY_RETENTION_DAYS . ' days old'));
    check('privacy: mentions the daily digest', str_contains($page, 'once a day I receive one summary email'));
    check('privacy: describes Google Analytics accurately', str_contains($page, 'G-64PRMY8EKD') && str_contains($page, 'v2 never loads Google Analytics'));
    check('privacy: names the fixed weather place', str_contains($page, 'one fixed place, Essex'));
    check('privacy: says how to withdraw consent', str_contains($page, 'Open Settings, go to Privacy'));
    check('privacy: has no em or en dashes', !preg_match('/\x{2013}|\x{2014}|&mdash;|&ndash;/u', $page));
    check('privacy: marks itself in the nav', str_contains($page, 'href="/privacy" aria-current="page"'));
    check('privacy: the template cannot be fetched directly through the router', http('GET', '/pages/privacy')['status'] === 404);

    // ---- Telemetry ----
    $event = json_encode([
        'action' => 'System: Information',
        'details' => ['description' => 'Starting application: Word', 'app' => 'word', 'source' => 'react', 'sessionID' => 'http-test-session'],
        'deviceInfo' => ['resolution' => '390x844', 'os' => 'MacOS', 'browser' => 'Netscape 5.0'],
    ]);
    $iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    $post = fn(array $headers, string $body) => http('POST', '/api/log.php', $headers + ['Content-Type' => 'application/json'], $body);

    check('log: GET is not allowed', http('GET', '/api/log.php')['status'] === 405);
    check('log: another site cannot post', $post(['Origin' => 'https://evil.example'], $event)['status'] === 403);
    check('log: a cross-site fetch cannot post', $post(['Sec-Fetch-Site' => 'cross-site'], $event)['status'] === 403);
    check('log: a body over 8 KB is refused', $post(['Origin' => $origin], str_repeat('x', TELEMETRY_MAX_BYTES + 1))['status'] === 413);
    check('log: a body of exactly 8 KB is read', $post(['Origin' => $origin], str_pad('{"action":"x"}', TELEMETRY_MAX_BYTES))['status'] === 200);
    check('log: broken JSON is refused', $post(['Origin' => $origin], '{nope')['status'] === 400);
    check('log: an event with no action is refused', $post(['Origin' => $origin], '{"details":{}}')['status'] === 400);

    $r = $post(['Origin' => $origin, 'User-Agent' => $iphone, 'X-Forwarded-For' => '203.0.113.77'], $event);
    $reply = json_decode($r['body'], true);
    check('log: a good event gives 200', $r['status'] === 200);
    check('log: the reply keeps its shape', is_array($reply) && array_keys($reply) === ['success', 'persisted', 'id']);
    check('log: says whether it was stored', $reply['persisted'] === $withDb && $reply['success'] === $withDb);
    check('log: never looks up a location', !str_contains((string)file_get_contents(__DIR__ . '/../../api/log.php'), 'ip-api'));

    if ($withDb) {
        $pdo = new PDO('mysql:host=' . $env['DB_HOST'] . ';port=' . $env['DB_PORT'] . ';dbname=' . $env['DB_NAME'], $env['DB_USER'], $env['DB_PASS']);
        $row = $pdo->query("SELECT * FROM event_logs WHERE session_id = 'http-test-session' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        check('log (db): stores the event', is_array($row) && $row['action'] === 'System: Information');
        check('log (db): stores only the shortened address', $row['ip'] === '203.0.113.0');
        check('log (db): reads the device from the real user agent', $row['os'] === 'iOS' && $row['browser'] === 'Safari');
        check('log (db): stores the app', $row['app'] === 'word');
        check('log (db): stores no location or user agent', $row['country'] === null && $row['city'] === null && $row['user_agent'] === null);
        check('log (db): claims the daily jobs', is_file("{$stateDir}/job-telemetry-digest.json") && is_file("{$stateDir}/job-telemetry-purge.json"));
    }

    // Fill the visitor's allowance, as rate_limit_allow would after 120 events.
    $hits = array_fill(0, TELEMETRY_RATE_LIMIT, time());
    file_put_contents("{$stateDir}/rate-telemetry.json", json_encode([hash('sha256', '198.51.100.9') => $hits]));
    $r = $post(['Origin' => $origin, 'X-Forwarded-For' => '198.51.100.9'], $event);
    check('log: a visitor over the limit gets 429', $r['status'] === 429);
    check('log: and is told when to try again', header_value($r, 'Retry-After') === (string)TELEMETRY_RATE_WINDOW);
    check('log: other visitors carry on', $post(['Origin' => $origin, 'X-Forwarded-For' => '198.51.100.10'], $event)['status'] === 200);
    check('log: a forged header from an untrusted peer is ignored', client_ip(['REMOTE_ADDR' => '198.51.100.1', 'HTTP_X_FORWARDED_FOR' => '1.2.3.4'], []) === '198.51.100.1');

    // ---- Weather ----
    $place = ['latitude' => 51.87, 'longitude' => 0.56, 'city' => 'Essex'];
    $key = weather_cache_key($place);
    $answer = ['latitude' => 51.87, 'longitude' => 0.56, 'current_weather' => ['temperature' => 12.3, 'weathercode' => 2], 'city' => 'Essex'];
    file_put_contents("{$stateDir}/weather.json", json_encode(['key' => $key, 'fetched_at' => time(), 'data' => $answer]));
    $r = http('GET', '/api/weather.php', ['X-Forwarded-For' => '198.51.100.20']);
    $data = json_decode($r['body'], true);
    check('weather: serves the cached answer', $r['status'] === 200 && ($data['current_weather']['temperature'] ?? null) === 12.3);
    check('weather: names the fixed place', ($data['city'] ?? null) === 'Essex');
    file_put_contents("{$stateDir}/weather.json", json_encode(['key' => $key, 'failed_at' => time()]));
    $started = microtime(true);
    $r = http('GET', '/api/weather.php');
    check('weather: after a failure it answers at once instead of waiting on the service again', $r['status'] === 503 && microtime(true) - $started < 1.5);
    check('weather: sends no visitor address anywhere', !preg_match('/REMOTE_ADDR|FORWARDED|ip-api/', (string)file_get_contents(__DIR__ . '/../../api/weather.php')));

    // ---- Inputs that used to cause a 500 ----
    $r = http('GET', '/api/app.php?name[]=x');
    check('arrays: ?name[]= on app.php is not a 500', $r['status'] === 200 && !str_contains($r['body'], 'Fatal error'));
    check('arrays: an unknown app is a 404', http('GET', '/api/app.php?name=nope')['status'] === 404);
    $r = http('GET', '/api/cv_data.php?table[]=x');
    check('arrays: ?table[]= on cv_data.php is a clean 400', $r['status'] === 400 && is_array(json_decode($r['body'], true)));
    $r = http('GET', '/api/admin_me.php', ['Cookie' => 'admin_session[]=x']);
    check('arrays: an array cookie on admin_me.php is not a 500', $r['status'] === 200 && json_decode($r['body'], true)['authenticated'] === false);
    check('arrays: an array cookie on stats.php is a 401', http('GET', '/api/stats.php', ['Cookie' => 'admin_session[a]=x'])['status'] === 401);

    // ---- Admin sign-in ----
    check('sign-in: GET is not allowed', http('GET', '/api/admin_auth.php')['status'] === 405);
    check('sign-in: another site cannot post', http('POST', '/api/admin_auth.php', ['Origin' => 'https://evil.example'], '{}')['status'] === 403);
    $statuses = [];
    for ($i = 0; $i < ADMIN_SIGN_IN_LIMIT + 1; $i++) {
        $statuses[] = http('POST', '/api/admin_auth.php', ['Origin' => $origin, 'X-Forwarded-For' => '198.51.100.30'], '{}')['status'];
    }
    check('sign-in: five attempts are allowed', array_slice($statuses, 0, ADMIN_SIGN_IN_LIMIT) === array_fill(0, ADMIN_SIGN_IN_LIMIT, 400));
    check('sign-in: the sixth in 15 minutes is refused', end($statuses) === 429);
    check('sign-in: other visitors can still try', http('POST', '/api/admin_auth.php', ['Origin' => $origin, 'X-Forwarded-For' => '198.51.100.31'], '{}')['status'] === 400);

    // ---- Admin sign-out revokes the cookie ----
    $cookie = 'admin_session=' . admin_session_encode('owner@example.com', 0, $secret, time(), 3600);
    $me = json_decode(http('GET', '/api/admin_me.php', ['Cookie' => $cookie])['body'], true);
    check('admin: a valid cookie signs in, whatever the case of ADMIN_EMAILS', $me['authenticated'] === true && $me['email'] === 'owner@example.com');
    check('admin: and opens the stats', http('GET', '/api/stats.php', ['Cookie' => $cookie])['status'] !== 401);
    check('sign-out: GET is not allowed', http('GET', '/api/admin_logout.php', ['Cookie' => $cookie])['status'] === 405);
    check('sign-out: another site cannot sign the admin out', http('POST', '/api/admin_logout.php', ['Cookie' => $cookie, 'Origin' => 'https://evil.example'])['status'] === 403);
    check('sign-out: a refused request leaves the session alone', json_decode(http('GET', '/api/admin_me.php', ['Cookie' => $cookie])['body'], true)['authenticated'] === true);
    $r = http('POST', '/api/admin_logout.php', ['Cookie' => $cookie, 'Origin' => $origin]);
    check('sign-out: works from this site', $r['status'] === 200 && json_decode($r['body'], true) === ['ok' => true, 'revoked' => true]);
    check('sign-out: clears the cookie', str_contains(header_value($r, 'Set-Cookie'), 'admin_session=deleted') || str_contains(header_value($r, 'Set-Cookie'), 'admin_session=;'));
    check('sign-out: the old cookie no longer signs in', json_decode(http('GET', '/api/admin_me.php', ['Cookie' => $cookie])['body'], true)['authenticated'] === false);
    check('sign-out: the old cookie no longer opens the stats', http('GET', '/api/stats.php', ['Cookie' => $cookie])['status'] === 401);
    $fresh = 'admin_session=' . admin_session_encode('owner@example.com', 1, $secret, time(), 3600);
    check('sign-out: signing in again works', json_decode(http('GET', '/api/admin_me.php', ['Cookie' => $fresh])['body'], true)['authenticated'] === true);
} finally {
    stopServer($server);
}

// ---- Upstream calls give up in time ----
$slowDir = sys_get_temp_dir() . '/http_test_slow_' . bin2hex(random_bytes(6));
mkdir($slowDir);
file_put_contents("{$slowDir}/router.php", '<?php
if ($_SERVER["REQUEST_URI"] === "/slow") sleep(5);
if ($_SERVER["REQUEST_URI"] === "/missing") { http_response_code(404); echo "{}"; return; }
header("Content-Type: application/json");
echo json_encode(["ok" => true]);
');
$slowPort = freePort();
$slow = startServer($slowPort, $slowDir, "{$slowDir}/router.php", []);
try {
    check('upstream: reads a quick answer', http_get_json("http://127.0.0.1:{$slowPort}/fast", WEATHER_TIMEOUT) === ['ok' => true]);
    check('upstream: an error status gives nothing', http_get_json("http://127.0.0.1:{$slowPort}/missing", WEATHER_TIMEOUT) === null);
    $started = microtime(true);
    $result = http_get_json("http://127.0.0.1:{$slowPort}/slow", WEATHER_TIMEOUT);
    $took = microtime(true) - $started;
    check('upstream: a slow service gives nothing', $result === null);
    check('upstream: and is abandoned after about 2 seconds', $took >= 1.5 && $took < 3.5);
} finally {
    stopServer($slow);
}

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
