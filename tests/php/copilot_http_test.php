<?php
// tests/php/copilot_http_test.php - api/copilot.php end to end, through PHP's
// built-in server and dev-server.php. Anthropic is replaced by
// tests/php/stubs/anthropic.php on another local port (ANTHROPIC_BASE_URL), so
// no request ever reaches the real API. One site server has a test key and one
// has none; both get their own state folder.
// Run with: php tests/php/copilot_http_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/copilot.php';
require_once __DIR__ . '/../../lib/anthropic.php';

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
    $log = sys_get_temp_dir() . "/copilot_http_test_{$port}.log";
    $process = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $docroot, $router], [1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes, $docroot, $env);
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
function http(int $port, string $method, string $path, array $headers = [], ?string $body = null): array {
    $socket = fsockopen('127.0.0.1', $port, $errno, $errstr, 5);
    $request = "{$method} {$path} HTTP/1.0\r\nHost: localhost:{$port}\r\n";
    foreach ($headers as $name => $value) $request .= "{$name}: {$value}\r\n";
    if ($body !== null) $request .= 'Content-Length: ' . strlen($body) . "\r\n";
    fwrite($socket, $request . "Connection: close\r\n\r\n" . ($body ?? ''));
    stream_set_timeout($socket, 30);
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
    return ['status' => (int)($m[1] ?? 0), 'headers' => $parsed, 'body' => $content, 'json' => json_decode($content, true)];
}

function header_value(array $response, string $name): string {
    return implode(', ', $response['headers'][strtolower($name)] ?? []);
}

$root = realpath(__DIR__ . '/../..');
$scratch = sys_get_temp_dir() . '/copilot_http_test_' . bin2hex(random_bytes(6));
foreach (['stub', 'state', 'state-off'] as $folder) mkdir("{$scratch}/{$folder}", 0777, true);
$stubDir = "{$scratch}/stub";

/** The next answer from the stub, and a fresh record of what it is sent. */
function scenario(array $scenario): void {
    global $stubDir;
    file_put_contents("{$stubDir}/scenario.json", json_encode($scenario));
    @unlink("{$stubDir}/requests.jsonl");
}

/** What the stub was sent since the last scenario. */
function stubRequests(): array {
    global $stubDir;
    $lines = array_filter(explode("\n", (string)@file_get_contents("{$stubDir}/requests.jsonl")));
    return array_map(fn($line) => json_decode($line, true), array_values($lines));
}

// No inherited Anthropic or Copilot settings: a real key on this machine must never be used.
$inherited = array_filter(getenv(), fn($name) => !preg_match('/^(ANTHROPIC_|COPILOT_)/i', (string)$name), ARRAY_FILTER_USE_KEY);
$common = [
    'APP_DEBUG' => 'false',
    'TRUSTED_PROXIES' => '127.0.0.1',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '1',
    'DB_NAME' => 'portfolio_os_no_such_db',
] + $inherited;

$stubPort = freePort();
$stub = startServer($stubPort, $root, $root . '/tests/php/stubs/anthropic.php', ['STUB_DIR' => $stubDir] + $inherited);
$sitePort = freePort();
$site = startServer($sitePort, $root, $root . '/dev-server.php', [
    'APP_STATE_DIR' => "{$scratch}/state",
    'ANTHROPIC_API_KEY' => 'test-key-123',
    'ANTHROPIC_BASE_URL' => "http://127.0.0.1:{$stubPort}",
    'COPILOT_TIMEOUT' => '2',
] + $common);
$offPort = freePort();
$off = startServer($offPort, $root, $root . '/dev-server.php', ['APP_STATE_DIR' => "{$scratch}/state-off"] + $common);

$origin = "http://localhost:{$sitePort}";
$visitor = 0;
/** A POST from the site's own page, from a new visitor each time unless one is given. */
$post = function (array $body, array $headers = [], ?string $ip = null) use ($sitePort, $origin, &$visitor): array {
    $ip ??= '203.0.' . (++$visitor) . '.10';
    return http($sitePort, 'POST', '/api/copilot.php', $headers + ['Origin' => $origin, 'Content-Type' => 'application/json', 'X-Forwarded-For' => $ip], json_encode($body));
};

$goodAnswer = ['answer' => 'He maintains business-critical applications at Killik & Co and automates them with PowerShell.', 'covered' => true, 'citations' => ['role-killik-co', 'made-up-section']];
$job = "Applications Support Engineer\nWe need someone with PowerShell automation, SQL Server and Kubernetes experience, and a pilot licence.";
$goodMatch = [
    'requirements' => [
        ['requirement' => 'PowerShell automation', 'strength' => 'strong', 'note' => 'He writes PowerShell automation at Killik & Co.', 'citations' => ['role-killik-co']],
        ['requirement' => 'Kubernetes', 'strength' => 'partial', 'note' => 'Made up.', 'citations' => ['no-such-section']],
        ['requirement' => 'Pilot licence', 'strength' => 'none', 'note' => 'The data does not mention one.', 'citations' => []],
    ],
    'gaps' => ['No Kubernetes experience is shown.', 'No pilot licence is shown.'],
    'summary' => ['text' => 'A good fit for the automation side of the role.', 'citations' => ['role-killik-co']],
    'cv' => [
        'roles' => [['id' => 'role-killik-co', 'highlights' => [1, 0]]],
        'projects' => ['project-earth-echo'],
        'skills' => ['PowerShell', 'MS SQL Server', 'Kubernetes'],
        'certificates' => ['certificates-microsoft'],
    ],
];

try {
    // ---- Switched off ----
    $r = http($offPort, 'GET', '/api/copilot.php');
    check('off: the status check is a clear 503', $r['status'] === 503 && ($r['json']['code'] ?? null) === 'off');
    check('off: says it is not switched on yet', ($r['json']['error'] ?? null) === 'Copilot is not switched on yet.');
    scenario(['output' => $goodAnswer]);
    $r = http($offPort, 'POST', '/api/copilot.php', ['Origin' => "http://localhost:{$offPort}", 'Content-Type' => 'application/json'], json_encode(['task' => 'chat', 'question' => 'Hi']));
    check('off: a question gets the same 503', $r['status'] === 503 && ($r['json']['code'] ?? null) === 'off');
    check('off: nothing is sent to Anthropic', stubRequests() === []);

    // ---- Switched on: the status check and the method ----
    $r = http($sitePort, 'GET', '/api/copilot.php');
    check('status: switched on is a 200', $r['status'] === 200 && ($r['json']['enabled'] ?? null) === true);
    check('status: is never cached', str_contains(header_value($r, 'Cache-Control'), 'no-store'));
    check('status: never shows the key', !str_contains($r['body'], 'test-key-123'));
    $r = http($sitePort, 'PUT', '/api/copilot.php', ['Origin' => $origin], '{}');
    check('method: only GET and POST', $r['status'] === 405 && str_contains(header_value($r, 'Allow'), 'POST'));

    // ---- Same site only ----
    scenario(['output' => $goodAnswer]);
    $r = $post(['task' => 'chat', 'question' => 'Hi'], ['Origin' => 'https://evil.example']);
    check('origin: another site is refused', $r['status'] === 403 && ($r['json']['code'] ?? null) === 'origin');
    $r = http($sitePort, 'POST', '/api/copilot.php', ['Sec-Fetch-Site' => 'cross-site', 'Content-Type' => 'application/json'], json_encode(['task' => 'chat', 'question' => 'Hi']));
    check('origin: a cross-site fetch is refused', $r['status'] === 403);
    check('origin: nothing refused reaches Anthropic', stubRequests() === []);

    // ---- Caps and broken input ----
    $r = $post(['task' => 'match', 'job' => str_repeat('a', COPILOT_BODY_MAX)]);
    check('caps: a body over the limit is refused', $r['status'] === 413);
    $r = http($sitePort, 'POST', '/api/copilot.php', ['Origin' => $origin, 'Content-Type' => 'application/json'], '{nope');
    check('input: broken JSON is a 400', $r['status'] === 400 && ($r['json']['code'] ?? null) === 'invalid_input');
    check('input: an unknown task is a 400', $post(['task' => 'poem'])['status'] === 400);
    $r = $post(['task' => 'chat', 'question' => str_repeat('a', COPILOT_QUESTION_MAX + 1)]);
    check('caps: a long question is refused, saying why', $r['status'] === 400 && str_contains($r['json']['error'] ?? '', (string)COPILOT_QUESTION_MAX));
    $r = $post(['task' => 'match', 'job' => str_repeat('a ', COPILOT_JOB_MAX)]);
    check('caps: a long job description is refused, saying why', $r['status'] === 400 && str_contains($r['json']['error'] ?? '', '6,000'));
    check('caps: a short job description is refused', $post(['task' => 'match', 'job' => 'PHP dev'])['status'] === 400);
    check('caps: question[]= is a clean 400', $post(['task' => 'chat', 'question' => ['x']])['status'] === 400);
    check('caps: nothing refused reaches Anthropic', stubRequests() === []);

    // ---- A good answer with real citations ----
    scenario(['output' => $goodAnswer]);
    $r = $post(['task' => 'chat', 'question' => 'What does he do at Killik?', 'history' => [['role' => 'user', 'text' => 'Hello'], ['role' => 'assistant', 'text' => 'Hi, ask me about DeVanté.']]]);
    $reply = $r['json'];
    check('chat: a good answer is a 200', $r['status'] === 200);
    check('chat: keeps the answer', str_starts_with($reply['answer'] ?? '', 'He maintains business-critical applications'));
    check('chat: a citation that does not exist is dropped', array_column($reply['citations'] ?? [], 'id') === ['role-killik-co']);
    check('chat: a citation names its section and where it opens', ($reply['citations'][0]['title'] ?? '') === 'Applications Support Engineer, Killik & Co'
        && ($reply['citations'][0]['target'] ?? null) === ['type' => 'cv', 'anchor' => 'experience-title']);
    check('chat: is grounded', ($reply['grounded'] ?? null) === true && ($reply['covered'] ?? null) === true);
    check('chat: is never cached', str_contains(header_value($r, 'Cache-Control'), 'no-store'));
    check('chat: the reply never carries the key or the prompt', !str_contains($r['body'], 'test-key-123') && !str_contains($r['body'], 'site_data'));
    $sent = stubRequests();
    check('chat: one request reaches Anthropic', count($sent) === 1);
    $call = $sent[0] ?? ['headers' => [], 'body' => []];
    check('chat: it goes to the Messages endpoint', ($call['path'] ?? '') === '/v1/messages' && ($call['method'] ?? '') === 'POST');
    check('chat: the key is sent in x-api-key only', ($call['headers']['x-api-key'] ?? '') === 'test-key-123' && !str_contains(json_encode($call['body']), 'test-key-123'));
    check('chat: with the current API version', ($call['headers']['anthropic-version'] ?? '') === '2026-10-21');
    check('chat: on the chat model, with capped output', ($call['body']['model'] ?? '') === 'claude-haiku-5-5' && ($call['body']['max_tokens'] ?? 0) === COPILOT_CHAT_MAX_TOKENS);
    check('chat: the data is a cached system block', ($call['body']['system'][1]['cache_control']['type'] ?? '') === 'ephemeral' && str_contains($call['body']['system'][1]['text'] ?? '', '<section id="role-killik-co"'));
    check('chat: asks for structured output', ($call['body']['output_config']['format']['type'] ?? '') === 'json_schema');
    check('chat: sends the history, then the question as the visitor\'s', count($call['body']['messages'] ?? []) === 3
        && str_contains(end($call['body']['messages'])['content'], '<visitor_question>What does he do at Killik?</visitor_question>'));

    scenario(['output' => ['answer' => 'He holds a pilot licence.', 'covered' => true, 'citations' => ['no-such-section']]]);
    $reply = $post(['task' => 'chat', 'question' => 'Can he fly planes?'])['json'];
    check('chat: an answer citing only a section that does not exist is flagged', ($reply['citations'] ?? null) === [] && ($reply['grounded'] ?? null) === false);

    scenario(['output' => ['answer' => 'The site\'s data does not cover that.', 'covered' => false, 'citations' => []]]);
    $reply = $post(['task' => 'chat', 'question' => 'What is his favourite food?'])['json'];
    check('chat: says plainly when the data does not cover it', ($reply['covered'] ?? null) === false);

    // ---- The matcher ----
    scenario(['output' => $goodMatch]);
    $r = $post(['task' => 'match', 'job' => $job]);
    $match = $r['json'];
    check('match: a good match is a 200', $r['status'] === 200);
    check('match: requirements keep their strengths', array_column($match['requirements'] ?? [], 'strength') === ['strong', 'none', 'none']);
    check('match: evidence that cites nothing real is not evidence', ($match['requirements'][1]['citations'] ?? null) === []);
    check('match: gaps are stated', count($match['gaps'] ?? []) === 2);
    check('match: the summary is marked as generated', ($match['summary']['generated'] ?? null) === true);
    check('match: the tailored CV leads with the chosen role', ($match['cv']['roles'][0]['id'] ?? '') === 'role-killik-co');
    $skills = array_merge(...array_map(fn($group) => $group['items'], $match['cv']['skills'] ?? [[]]));
    check('match: matched skills are marked, invented ones never added', in_array(['name' => 'PowerShell', 'matched' => true], $skills, true) && !in_array('Kubernetes', array_column($skills, 'name'), true));
    $call = stubRequests()[0] ?? ['headers' => [], 'body' => []];
    check('match: runs on the matcher model', ($call['body']['model'] ?? '') === 'claude-sonnet-5-5');
    check('match: opts into refusal fallbacks with their beta header', ($call['body']['fallbacks'] ?? '') === 'default' && ($call['headers']['anthropic-beta'] ?? '') === ANTHROPIC_FALLBACK_BETA);
    check('match: the job description is sent as data', str_contains($call['body']['messages'][0]['content'] ?? '', "<job_description>\n" . $job));

    // ---- Anthropic in trouble ----
    scenario(['status' => 529, 'body' => '{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}']);
    $r = $post(['task' => 'chat', 'question' => 'Hi']);
    check('upstream: overloaded is a 503 to try again later', $r['status'] === 503 && ($r['json']['code'] ?? null) === 'busy' && header_value($r, 'Retry-After') !== '');
    scenario(['status' => 401, 'body' => '{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key test-key-123"}}']);
    $r = $post(['task' => 'chat', 'question' => 'Hi']);
    check('upstream: a bad key is a 502, with no detail', $r['status'] === 502 && ($r['json']['code'] ?? null) === 'unavailable' && !str_contains($r['body'], 'x-api-key') && !str_contains($r['body'], 'test-key-123'));
    scenario(['output' => 'Sure! Here is a poem instead.']);
    $r = $post(['task' => 'chat', 'question' => 'Hi']);
    check('upstream: output that is not the asked-for JSON is a 502', $r['status'] === 502 && ($r['json']['code'] ?? null) === 'invalid');
    scenario(['output' => ['wrong' => 'shape']]);
    check('upstream: JSON of the wrong shape is a 502', $post(['task' => 'chat', 'question' => 'Hi'])['status'] === 502);
    scenario(['output' => [], 'stop_reason' => 'refusal']);
    $r = $post(['task' => 'chat', 'question' => 'Hi']);
    check('upstream: a refused question gets a polite answer, not an error', $r['status'] === 200 && ($r['json']['covered'] ?? null) === false && ($r['json']['citations'] ?? null) === []);
    $r = $post(['task' => 'match', 'job' => $job]);
    check('upstream: a refused match is a 422', $r['status'] === 422 && ($r['json']['code'] ?? null) === 'refused');
    scenario(['output' => [], 'stop_reason' => 'max_tokens']);
    check('upstream: a cut-off answer is a 502', $post(['task' => 'chat', 'question' => 'Hi'])['status'] === 502);

    // ---- Rate limits ----
    scenario(['output' => $goodAnswer]);
    $statuses = [];
    for ($i = 0; $i <= COPILOT_RATE_LIMIT; $i++) $statuses[] = $post(['task' => 'chat', 'question' => "Question {$i}"], [], '198.51.100.7')['status'];
    check('rate: a few a minute are answered', array_slice($statuses, 0, COPILOT_RATE_LIMIT) === array_fill(0, COPILOT_RATE_LIMIT, 200));
    $r = $post(['task' => 'chat', 'question' => 'One more'], [], '198.51.100.99');
    check('rate: then the visitor waits, counted by shortened address', $statuses[COPILOT_RATE_LIMIT] === 429 && $r['status'] === 429 && ($r['json']['code'] ?? null) === 'rate_limited' && header_value($r, 'Retry-After') === (string)COPILOT_RATE_WINDOW);
    check('rate: a visitor from another network is still answered', $post(['task' => 'chat', 'question' => 'Hi'], [], '198.51.101.7')['status'] === 200);
    check('rate: a held-up visitor costs nothing', count(stubRequests()) === COPILOT_RATE_LIMIT + 1);

    // ---- The privacy notice says so ----
    $page = http($sitePort, 'GET', '/privacy')['body'];
    check('privacy: has a Copilot section', str_contains($page, '<h2 id="copilot">Copilot</h2>'));
    check('privacy: names Anthropic and says nothing is kept', str_contains($page, 'Anthropic') && str_contains($page, 'does not keep your questions'));
    check('privacy: explains the rate-limit counts', str_contains($page, 'hashed copy of your shortened IP address'));

    // ---- Nothing about the conversation is kept ----
    $kept = '';
    $names = [];
    foreach (glob("{$scratch}/state/*") as $file) {
        $names[] = basename($file);
        $kept .= file_get_contents($file);
    }
    check('privacy: only rate-limit counters are kept (' . implode(', ', $names) . ')', $names !== [] && array_filter($names, fn($name) => !preg_match('/^(rate|daily)-copilot[a-z-]*\.json$/', $name)) === []);
    check('privacy: no question, answer or address is kept', !str_contains($kept, 'Killik') && !str_contains($kept, 'Question') && !str_contains($kept, '198.51'));

    // ---- Timeouts (last: the stub is still asleep after the site gives up) ----
    scenario(['output' => $goodAnswer, 'sleep' => 4]);
    $started = microtime(true);
    $r = $post(['task' => 'chat', 'question' => 'Hi']);
    $took = microtime(true) - $started;
    check('timeout: a slow answer is a 504', $r['status'] === 504 && ($r['json']['code'] ?? null) === 'timeout');
    check("timeout: the site gives up after its timeout ({$took}s)", $took < 3.8);
    usleep(2_500_000);
} finally {
    stopServer($site);
    stopServer($off);
    stopServer($stub);
}

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
