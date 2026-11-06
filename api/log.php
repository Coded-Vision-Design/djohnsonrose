<?php
// api/log.php - telemetry sink for both builds: v1 (PHP and Alpine) sends
// source "php" and v2 (React) sends "react". Each event becomes one row in
// event_logs, with the IP address shortened and only known fields kept (see
// lib/telemetry.php). Nothing is emailed per event; the first event of each
// day sends one digest of the day before and deletes rows past the retention
// period. The privacy notice (pages/privacy.php) describes all of this, so
// keep the two in step.
//
// Both clients ignore the reply, but its keys stay as they were: success,
// persisted and id.

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/rate_limit.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/telemetry_db.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

function telemetry_reply(int $status, bool $persisted, ?string $error = null): void {
    http_response_code($status);
    $body = ['success' => $persisted, 'persisted' => $persisted, 'id' => uniqid('log_', true)];
    if ($error !== null) $body['error'] = $error;
    echo json_encode($body);
}

function telemetry_fail(int $status, string $error): void {
    telemetry_reply($status, false, $error);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    telemetry_fail(405, 'Method not allowed');
}

if (!request_same_origin($_SERVER)) {
    telemetry_fail(403, 'Requests from other sites are not allowed.');
}

if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > TELEMETRY_MAX_BYTES) {
    telemetry_fail(413, 'Too large');
}
$raw = read_request_body(TELEMETRY_MAX_BYTES);
if ($raw === null) {
    telemetry_fail(413, 'Too large');
}

$input = json_decode($raw, true);
$event = is_array($input)
    ? telemetry_event($input, (string)($_SERVER['HTTP_USER_AGENT'] ?? ''), load_app_manifest()['apps'])
    : null;
if ($event === null) {
    telemetry_fail(400, 'Invalid input');
}

$stateDir = state_dir($config);
$ip = client_ip($_SERVER, $config['trusted_proxies'] ?? []);
$now = time();
if (!rate_limit_allow($stateDir, 'telemetry', $ip, TELEMETRY_RATE_LIMIT, TELEMETRY_RATE_WINDOW, $now)
    || !rate_limit_daily_allow($stateDir, 'telemetry', TELEMETRY_DAILY_CAP, $now)) {
    header('Retry-After: ' . TELEMETRY_RATE_WINDOW);
    telemetry_fail(429, 'Too many events');
}

// Best effort: a missing table or a database outage only means this event is
// not kept. The table is created by lib/migrate.php, never here.
$pdo = null;
$persisted = false;
try {
    $pdo = db_connect($config);
    telemetry_store($pdo, $event, ip_truncate($ip));
    $persisted = true;
} catch (Throwable $e) {
    if (!empty($config['debug'])) {
        error_log('event_logs insert failed: ' . $e->getMessage());
    }
}

telemetry_reply(200, $persisted);

if ($pdo === null) exit;

// Hand the reply over before the daily jobs, where the server allows it.
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} elseif (function_exists('litespeed_finish_request')) {
    litespeed_finish_request();
}

try {
    telemetry_daily_jobs($pdo, $stateDir, $now, function (string $subject, string $body) use ($config): void {
        // As in api/send_email.php, local development never sends real mail.
        if (request_is_local($_SERVER)) return;
        mail($config['admin_email'], $subject, $body, [
            'From' => "{$config['smtp']['name']} <{$config['smtp']['from']}>",
            'Content-Type' => 'text/plain; charset=UTF-8',
            'X-Mailer' => 'PHP/' . phpversion(),
        ]);
    });
} catch (Throwable $e) {
    if (!empty($config['debug'])) {
        error_log('telemetry daily jobs failed: ' . $e->getMessage());
    }
}
