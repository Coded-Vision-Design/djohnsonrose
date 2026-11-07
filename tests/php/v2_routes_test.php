<?php
// tests/php/v2_routes_test.php - which addresses under /v2/ are the React
// build's own (lib/routes.php), and what PHP's dev server does with the rest.
// .htaccess has the same rules for Apache; v2/src/windowing/address.test.ts
// checks them against assets/js/windowing/address.js.
// Run with: php tests/php/v2_routes_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/routes.php';
require_once __DIR__ . '/../../lib/security.php';

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

$apps = array_column(load_app_manifest()['apps'], 'id');
$known = fn(string $path) => v2_address_known($path, $apps);

// The desktop, at the same addresses as v1's, and every app
foreach (['/v2', '/v2/', '/v2/login', '/v2/desktop', '/v2/desktop/', '/v2/app/word', '/v2/app/word/'] as $path) {
    check("v2: {$path} is the React build's", $known($path));
}
check('v2: every app in the manifest has an address', array_filter($apps, fn($id) => !$known("/v2/app/{$id}")) === []);

// Anything else is not
foreach (['/v2/anything', '/v2/app/nope', '/v2/app/', '/v2/app/word/extra', '/v2/app/word//', '/v2/APP/word', '/v2/app/Word',
          '/v2/privacy', '/v2/cv', '/v2/index.php', '/v2x', '/v2x/app/word', '/', '/app/word', '/v2/app/toString'] as $path) {
    check("v2: {$path} is not the React build's", !$known($path));
}
// An unknown v2 address reaches v1's router, which has no route for it either.
check('v2: route_match gives an unknown v2 address the 404 page', route_match('/v2/anything', $apps)['route'] === 'not_found');

// PHP's dev server mirrors Apache: v2's addresses go to Vite, anything else is v1's 404 page.
function freePort(): int {
    $socket = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int)substr(strrchr(stream_socket_get_name($socket, false), ':'), 1);
    fclose($socket);
    return $port;
}

function get(int $port, string $path): array {
    $socket = fsockopen('127.0.0.1', $port, $errno, $errstr, 5);
    fwrite($socket, "GET {$path} HTTP/1.0\r\nHost: localhost:{$port}\r\nConnection: close\r\n\r\n");
    stream_set_timeout($socket, 20);
    $raw = (string)stream_get_contents($socket);
    fclose($socket);
    [$head, $body] = array_pad(explode("\r\n\r\n", $raw, 2), 2, '');
    preg_match('#^HTTP/\S+ (\d{3})#', $head, $m);
    preg_match('/^Location:\s*(\S+)/mi', $head, $location);
    return ['status' => (int)($m[1] ?? 0), 'location' => $location[1] ?? '', 'body' => $body];
}

$root = realpath(__DIR__ . '/../..');
$port = freePort();
$log = sys_get_temp_dir() . "/v2_routes_test_{$port}.log";
$server = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $root, $root . '/dev-server.php'],
    [1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes, $root,
    ['APP_STATE_DIR' => sys_get_temp_dir(), 'DB_PORT' => '1', 'DB_NAME' => 'portfolio_os_no_such_db'] + getenv());
for ($i = 0; $i < 100 && !($probe = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2)); $i++) usleep(100_000);
if (!empty($probe)) fclose($probe);

try {
    foreach (['/v2/', '/v2/desktop', '/v2/app/word'] as $path) {
        $r = get($port, $path);
        check("dev server: {$path} goes to Vite", $r['status'] === 302 && str_ends_with($r['location'], $path));
    }
    foreach (['/v2/anything', '/v2/app/nope'] as $path) {
        $r = get($port, $path);
        check("dev server: {$path} is a 404", $r['status'] === 404);
        check("dev server: {$path} is v1's 404 page", str_contains($r['body'], '<h1>Page not found</h1>'));
    }
} finally {
    $status = proc_get_status($server);
    if (PHP_OS_FAMILY === 'Windows') exec('taskkill /F /T /PID ' . (int)$status['pid'] . ' 2>NUL');
    else proc_terminate($server);
    proc_close($server);
}

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
