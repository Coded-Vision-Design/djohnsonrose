<?php
// api/copilot.php - Copilot's one endpoint, for the app in both builds.
//
//   GET  -> 200 {enabled: true}, or 503 {code: "off"} until ANTHROPIC_API_KEY is set.
//   POST {task: "chat", question, history} -> {answer, covered, grounded, citations}
//   POST {task: "match", job} -> {requirements, gaps, summary, cv}
//
// Same-site only, JSON only, with length caps, rate limits per shortened
// address and per day (lib/copilot.php), a timeout and capped output. The
// question or job description goes to Anthropic with the site's own data and
// is never stored here: the only thing kept is the rate-limit counters, as
// hashes and times. Errors come back as {error, code} with a short message for
// the visitor; Anthropic's own error text is never passed on. The privacy
// notice (pages/privacy.php) describes this, so keep the two in step.

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/copilot.php';
require_once __DIR__ . '/../lib/anthropic.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

function copilot_respond(int $status, array $body, array $headers = []): void {
    http_response_code($status);
    foreach ($headers as $header) header($header);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function copilot_fail(int $status, string $code, string $message, array $headers = []): void {
    copilot_respond($status, ['error' => $message, 'code' => $code], $headers);
}

$settings = copilot_settings($config);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'GET' && $method !== 'POST') {
    copilot_fail(405, 'method', 'Method not allowed', ['Allow: GET, POST']);
}
if (!request_same_origin($_SERVER)) {
    copilot_fail(403, 'origin', 'Requests from other sites are not allowed.');
}
if (!$settings['enabled']) {
    copilot_fail(503, 'off', 'Copilot is not switched on yet.');
}
if ($method === 'GET') {
    copilot_respond(200, ['enabled' => true]);
}

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > COPILOT_BODY_MAX) {
    copilot_fail(413, 'too_large', 'That is more text than Copilot can take.');
}
$raw = read_request_body(COPILOT_BODY_MAX);
if ($raw === null) {
    copilot_fail(413, 'too_large', 'That is more text than Copilot can take.');
}
$input = json_decode($raw, true);
$task = is_array($input) ? ($input['task'] ?? null) : null;
if ($task !== 'chat' && $task !== 'match') {
    copilot_fail(400, 'invalid_input', 'Copilot could not read that request.');
}
$parsed = $task === 'chat' ? copilot_chat_input($input) : copilot_match_input($input);
if (isset($parsed['error'])) {
    copilot_fail($parsed['status'], 'invalid_input', $parsed['error']);
}

$visitor = ip_truncate(client_ip($_SERVER, $config['trusted_proxies'] ?? []));
$limited = copilot_rate_check(state_dir($config), $task, $visitor, $settings, time());
if ($limited !== null) {
    copilot_fail($limited['status'], $limited['code'], $limited['error'], ['Retry-After: ' . $limited['retry']]);
}

$profile = load_shared_data('profile');
$portfolio = load_shared_data('portfolio');
$email = (string)($config['email'] ?? '');
$sources = copilot_sources($profile, $portfolio, load_shared_data('filesystem'), copilot_word_cv_text(__DIR__ . '/../data/cv.php'), $email);
if (count($sources) < 3) {
    copilot_fail(500, 'no_data', 'Copilot has no data to answer from.');
}

$request = $task === 'chat'
    ? copilot_chat_request($settings, $sources, $parsed['question'], $parsed['history'])
    : copilot_match_request($settings, $sources, $parsed['job']);
// Waiting on the network does not count towards PHP's limit on Linux, but it does on Windows.
@set_time_limit((int)ceil($settings['timeout']) + 15);
$result = anthropic_structured($request, $settings['api_key'], $settings['base_url'], $settings['timeout'], 'anthropic_curl_transport');

if (!$result['ok']) {
    switch ($result['reason']) {
        case 'refused':
            if ($task === 'chat') {
                copilot_respond(200, [
                    'answer' => 'Copilot cannot help with that. Ask about DeVanté\'s experience, skills, projects or certificates.',
                    'covered' => false,
                    'grounded' => false,
                    'citations' => [],
                ]);
            }
            copilot_fail(422, 'refused', 'Copilot could not match that text. Paste a job description and try again.');
        case 'timeout':
            copilot_fail(504, 'timeout', 'Copilot took too long to answer. Please try again.');
        case 'busy':
            copilot_fail(503, 'busy', 'Copilot is busy right now. Please try again in a minute.', ['Retry-After: 60']);
        case 'unavailable':
            copilot_fail(502, 'unavailable', 'Copilot is unavailable right now. Please try again later.');
        default:
            copilot_fail(502, 'invalid', 'Copilot could not finish its answer. Please try again.');
    }
}

$reply = $task === 'chat'
    ? copilot_chat_reply($result['output'], $sources)
    : copilot_match_reply($result['output'], $sources, $portfolio, $profile, $email);
if ($reply === null) {
    copilot_fail(502, 'invalid', 'Copilot could not finish its answer. Please try again.');
}
copilot_respond(200, $reply);
