<?php
// lib/anthropic.php - one call to Claude's Messages API, for Copilot (see
// lib/copilot.php). It is raw HTTP rather than the official PHP SDK because the
// site has no Composer: a deploy copies the repository as it is and leaves
// vendor/ out (deploy-config.json). The request and reply shapes follow the
// API reference for version 2026-10-21.
//
// The key is only ever put in the x-api-key header. It is never logged, never
// returned, and an upstream error message (which can quote the request) is
// never passed on: callers get a short reason instead. The HTTP call itself is
// a $transport callable, so tests replace it with a stub and never reach the
// real API. See tests/php/copilot_test.php.

const ANTHROPIC_API_VERSION = '2026-10-21';

/** The beta header the "default" form of refusal fallbacks needs. */
const ANTHROPIC_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** The Messages endpoint under a base URL such as https://api.anthropic.com. */
function anthropic_messages_url(string $baseUrl): string {
    return rtrim($baseUrl, '/') . '/v1/messages';
}

/** Request headers, as curl takes them. */
function anthropic_headers(string $apiKey, array $betas = []): array {
    $headers = [
        'content-type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: ' . ANTHROPIC_API_VERSION,
    ];
    if ($betas !== []) $headers[] = 'anthropic-beta: ' . implode(',', $betas);
    return $headers;
}

/**
 * The text a reply ends with. A reply that a fallback model finished carries a
 * fallback block where the first model stopped, and only the text after it
 * belongs to the finished answer.
 */
function anthropic_output_text(array $message): string {
    $text = '';
    foreach (is_array($message['content'] ?? null) ? $message['content'] : [] as $block) {
        $type = is_array($block) ? ($block['type'] ?? '') : '';
        if ($type === 'fallback') $text = '';
        if ($type === 'text' && is_string($block['text'] ?? null)) $text .= $block['text'];
    }
    return $text;
}

/**
 * Sends a request that asks for structured output, and decodes that output.
 * Returns ['ok' => true, 'output' => array] or ['ok' => false, 'reason' =>
 * timeout|unavailable|busy|refused|truncated|invalid, 'status' => int], where
 * status is the upstream HTTP status (0 when no reply came back).
 *
 * $transport(url, headers, body, timeout) returns ['status' => int, 'body' =>
 * string, 'error' => '' | 'timeout' | 'network'].
 */
function anthropic_structured(array $request, string $apiKey, string $baseUrl, float $timeout, callable $transport): array {
    $betas = isset($request['fallbacks']) ? [ANTHROPIC_FALLBACK_BETA] : [];
    $sent = $transport(
        anthropic_messages_url($baseUrl),
        anthropic_headers($apiKey, $betas),
        (string)json_encode($request, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        $timeout
    );
    $status = (int)($sent['status'] ?? 0);
    $fail = fn(string $reason) => ['ok' => false, 'reason' => $reason, 'status' => $status];

    if ($status === 0) return $fail(($sent['error'] ?? '') === 'timeout' ? 'timeout' : 'unavailable');
    // Overloaded (529), rate limited (429) or a server error: worth another go later.
    if ($status === 429 || $status >= 500) return $fail('busy');
    // A wrong key, a model the account cannot use, or an endpoint that is not there.
    if (in_array($status, [401, 402, 403, 404], true)) return $fail('unavailable');
    if ($status !== 200) return $fail('invalid');

    $message = json_decode((string)($sent['body'] ?? ''), true);
    if (!is_array($message)) return $fail('invalid');
    $stop = $message['stop_reason'] ?? null;
    if ($stop === 'refusal') return $fail('refused');
    if ($stop === 'max_tokens') return $fail('truncated');

    $output = json_decode(anthropic_output_text($message), true);
    return is_array($output) ? ['ok' => true, 'output' => $output, 'status' => $status] : $fail('invalid');
}

/** The real transport: one POST through curl, given up on after $timeout seconds in all. */
function anthropic_curl_transport(string $url, array $headers, string $body, float $timeout): array {
    if (!function_exists('curl_init')) return ['status' => 0, 'body' => '', 'error' => 'network'];

    $handle = curl_init($url);
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
        CURLOPT_CONNECTTIMEOUT_MS => (int)min(5000, $timeout * 1000),
        CURLOPT_TIMEOUT_MS => (int)($timeout * 1000),
    ]);
    $response = curl_exec($handle);
    $errno = curl_errno($handle);
    $status = (int)curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    unset($handle);

    if (!is_string($response) || $errno !== 0) {
        return ['status' => 0, 'body' => '', 'error' => $errno === CURLE_OPERATION_TIMEDOUT ? 'timeout' : 'network'];
    }
    return ['status' => $status, 'body' => $response, 'error' => ''];
}
