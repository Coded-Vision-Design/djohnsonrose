<?php
// api/log.php — telemetry sink for both v1 (PHP/Alpine) and v2 (React).
// Persists every event to MySQL `event_logs` and emails the admin if the
// event is interesting. The `source` field on every row makes it easy to
// split v1 vs v2 stats in the admin console.

require_once __DIR__ . '/../bootstrap.php';

date_default_timezone_set('Europe/London');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$action     = (string)($input['action'] ?? 'Unknown Action');
$details    = is_array($input['details'] ?? null) ? $input['details'] : [];
$deviceInfo = is_array($input['deviceInfo'] ?? null) ? $input['deviceInfo'] : [];

// `source` lives inside details — v1 stores 'php', v2 stores 'react'.
$source = strtolower((string)($details['source'] ?? 'unknown'));
if (!in_array($source, ['php', 'react'], true)) {
    $source = 'unknown';
}
$sessionId = (string)($details['sessionID'] ?? 'guest');

// Best-effort IP + geo lookup (silent fail).
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$location = 'Unknown';
$country = null;
$city = null;
$isp = null;
try {
    $geo = @file_get_contents("http://ip-api.com/json/{$ip}?fields=status,country,city,isp");
    $geoData = json_decode($geo, true);
    if ($geoData && ($geoData['status'] ?? '') === 'success') {
        $country = $geoData['country'] ?? null;
        $city = $geoData['city'] ?? null;
        $isp = $geoData['isp'] ?? null;
        $location = "{$city}, {$country} ({$isp})";
    }
} catch (Exception $e) {
    // intentionally silent
}

// --- Persist to MySQL `event_logs` (best-effort, doesn't block email) ---
$persistOk = false;
try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    // Idempotent table creation — keeps deploys self-contained.
    $pdo->exec("CREATE TABLE IF NOT EXISTS event_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(120) NOT NULL,
        source ENUM('php','react','unknown') NOT NULL DEFAULT 'unknown',
        session_id VARCHAR(64) NOT NULL DEFAULT 'guest',
        ip VARCHAR(64) NOT NULL DEFAULT '',
        country VARCHAR(80) NULL,
        city VARCHAR(120) NULL,
        isp VARCHAR(200) NULL,
        os VARCHAR(60) NULL,
        browser VARCHAR(200) NULL,
        resolution VARCHAR(32) NULL,
        user_agent VARCHAR(500) NULL,
        app VARCHAR(60) NULL,
        details JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_logs_source_created (source, created_at),
        INDEX idx_event_logs_action (action),
        INDEX idx_event_logs_app (app),
        INDEX idx_event_logs_session (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $stmt = $pdo->prepare("INSERT INTO event_logs
        (action, source, session_id, ip, country, city, isp, os, browser, resolution, user_agent, app, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $action,
        $source,
        $sessionId,
        $ip,
        $country,
        $city,
        $isp,
        $deviceInfo['os'] ?? null,
        $deviceInfo['browser'] ?? null,
        $deviceInfo['resolution'] ?? null,
        $deviceInfo['userAgent'] ?? null,
        is_string($details['app'] ?? null) ? $details['app'] : null,
        json_encode($details, JSON_UNESCAPED_SLASHES),
    ]);
    $persistOk = true;
} catch (Throwable $e) {
    // Persisting failure mustn't break email. Surface it in dev only.
    if (!empty($config['debug'])) {
        error_log('event_logs insert failed: ' . $e->getMessage());
    }
}

// --- Email the admin (with a v1/v2 tag in the subject) ---
$tag = $source === 'php' ? '[v1 PHP]' : ($source === 'react' ? '[v2 React]' : '[unknown]');
$to = $config['admin_email'];
$subject = "OS Notification {$tag}: [{$action}] from {$ip}";

$message  = "OS Action Log\n";
$message .= "==============================\n";
$message .= "Build: {$tag}\n";
$message .= "Time (London): " . date('Y-m-d H:i:s') . "\n";
$message .= "Action: {$action}\n";
$message .= "IP Address: {$ip}\n";
$message .= "Location: {$location}\n";
$message .= "Session: {$sessionId}\n";
$message .= "------------------------------\n";
$message .= "Device Details:\n";
$message .= 'OS: ' . ($deviceInfo['os'] ?? 'Unknown') . "\n";
$message .= 'Browser: ' . ($deviceInfo['browser'] ?? 'Unknown') . "\n";
$message .= 'Resolution: ' . ($deviceInfo['resolution'] ?? 'Unknown') . "\n";
$message .= 'Device Time: ' . ($deviceInfo['deviceTime'] ?? 'Unknown') . "\n";
$message .= "------------------------------\n";
$message .= "Action Details:\n";
foreach ($details as $key => $val) {
    if (is_array($val)) $val = json_encode($val);
    $message .= ucfirst($key) . ": {$val}\n";
}
$message .= "==============================\n";

$headers = [
    'From'     => "{$config['smtp']['name']} <{$config['smtp']['from']}>",
    'Reply-To' => $config['smtp']['from'],
    'X-Mailer' => 'PHP/' . phpversion(),
];

$mailSent = false;
$host = $_SERVER['HTTP_HOST'] ?? '';
if ($host !== 'localhost' && $host !== '127.0.0.1' && strpos($host, 'localhost:') !== 0) {
    $mailSent = mail($to, $subject, $message, $headers);
}

echo json_encode([
    'success'   => $mailSent,
    'persisted' => $persistOk,
    'id'        => uniqid('log_', true),
]);
