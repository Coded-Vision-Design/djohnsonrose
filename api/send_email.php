<?php
// api/send_email.php - contact form endpoint for Outlook in both builds.
// Emails the enquiry to the configured address, then records it for the
// Admin Console. Validation and limits live in lib/contact.php.
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/contact.php';

header('Content-Type: application/json');

function contact_fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

/** Best effort: a logging failure must never lose an enquiry already sent. */
function contact_log(array $config, array $data, array $attachments, string $status, string $ip): void {
    try {
        $dbConfig = $config['db'];
        $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 3,
        ]);

        $pdo->exec("CREATE TABLE IF NOT EXISTS email_logs (
            id VARCHAR(36) PRIMARY KEY,
            sender VARCHAR(255) NOT NULL,
            recipient VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            status VARCHAR(32) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) DEFAULT CHARSET=utf8mb4");

        $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $body = $data['body'];
        if ($attachments !== []) {
            $body .= "\n\n[Attachments: " . implode(', ', array_column($attachments, 'name')) . "]";
        }

        $stmt = $pdo->prepare("INSERT INTO email_logs (id, sender, recipient, subject, body, status, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$uuid, $data['reply_to'], $config['email'], $data['subject'], $body, $status, $ip]);
    } catch (Throwable $e) {
        if (!empty($config['debug'])) {
            error_log('send_email log failed: ' . $e->getMessage());
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    contact_fail(405, 'Invalid request method');
}

$host = $_SERVER['HTTP_HOST'] ?? '';
if (!contact_origin_allowed($_SERVER['HTTP_ORIGIN'] ?? null, $host)) {
    contact_fail(403, 'Requests from other sites are not allowed.');
}

// Bots fill the hidden field. Tell them it worked and do nothing.
if (!empty($_POST['website_hp'])) {
    echo json_encode(['success' => true, 'message' => 'Your message has been sent.']);
    exit;
}

$validated = contact_validate($_POST);
if (!$validated['ok']) {
    contact_fail(422, $validated['error']);
}
$data = $validated['data'];

$collected = contact_collect_attachments($_FILES);
if (!$collected['ok']) {
    contact_fail(422, $collected['error']);
}
$attachments = $collected['files'];

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!contact_rate_allowed(sys_get_temp_dir(), $ip, time())) {
    contact_fail(429, "Too many messages. Please try again later, or email {$config['email']} directly.");
}

$mail = contact_build_mail($data, $attachments, [
    'to' => $config['email'],
    'from' => $config['smtp']['from'],
    'from_name' => $config['smtp']['name'],
]);

// As in api/log.php, local development never sends real mail.
$isLocal = $host === 'localhost' || $host === '127.0.0.1' || strpos($host, 'localhost:') === 0;
$sent = $isLocal || mail($mail['to'], $mail['subject'], $mail['body'], $mail['headers']);

contact_log($config, $data, $attachments, $sent ? ($isLocal ? 'local' : 'sent') : 'failed', $ip);

if (!$sent) {
    contact_fail(502, "Sorry, that did not send. Please email {$config['email']} directly.");
}

echo json_encode([
    'success' => true,
    'message' => 'Your message has been sent.',
    'attachments_count' => count($attachments),
]);
