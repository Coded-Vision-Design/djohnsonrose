<?php
// tests/php/stubs/anthropic.php - stands in for api.anthropic.com in
// tests/php/copilot_http_test.php, run as a php -S router. The test writes the
// next answer to STUB_DIR/scenario.json: an HTTP status, a structured output
// to wrap in a Messages reply (or a raw body), a stop reason and a delay. Each
// request is recorded in STUB_DIR/requests.jsonl so the test can check what
// the site sent.

$dir = (string)getenv('STUB_DIR');
$scenario = json_decode((string)@file_get_contents("{$dir}/scenario.json"), true);
if (!is_array($scenario)) $scenario = [];

$headers = array_change_key_case(function_exists('getallheaders') ? getallheaders() : [], CASE_LOWER);
file_put_contents("{$dir}/requests.jsonl", json_encode([
    'method' => $_SERVER['REQUEST_METHOD'] ?? '',
    'path' => $_SERVER['REQUEST_URI'] ?? '',
    'headers' => $headers,
    'body' => json_decode((string)file_get_contents('php://input'), true),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);

if (!empty($scenario['sleep'])) sleep((int)$scenario['sleep']);

http_response_code((int)($scenario['status'] ?? 200));
header('Content-Type: application/json');
if (array_key_exists('output', $scenario)) {
    echo json_encode([
        'id' => 'msg_stub',
        'type' => 'message',
        'role' => 'assistant',
        'model' => 'stub',
        'content' => [
            ['type' => 'thinking', 'thinking' => '', 'signature' => 'stub'],
            ['type' => 'text', 'text' => is_string($scenario['output']) ? $scenario['output'] : json_encode($scenario['output'])],
        ],
        'stop_reason' => $scenario['stop_reason'] ?? 'end_turn',
        'usage' => ['input_tokens' => 12, 'output_tokens' => 34, 'cache_read_input_tokens' => 9000],
    ]);
} else {
    echo $scenario['body'] ?? '{}';
}
