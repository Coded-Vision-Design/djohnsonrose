<?php
// api/send_email.php
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Invalid request method']);
    exit;
}

// Since we are now sending FormData (for attachments), we use $_POST
$recipient = $_POST['recipient'] ?? '';
$subject = $_POST['subject'] ?? '';
$body = $_POST['body'] ?? '';
$honeypot = $_POST['website_hp'] ?? '';

// Honeypot Check
if (!empty($honeypot)) {
    // Silently fail for bots
    echo json_encode(['success' => true, 'message' => 'Email sent successfully!']);
    exit;
}

if (empty($recipient) || empty($subject) || empty($body)) {
    echo json_encode(['error' => 'All fields are required']);
    exit;
}

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 1. Generate UUID
    $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    // 2. Handle Attachments (Metadata logging)
    $attachmentNames = [];
    foreach ($_FILES as $file) {
        if ($file['error'] === UPLOAD_ERR_OK) {
            $attachmentNames[] = $file['name'];
        }
    }
    
    $fullBody = $body;
    if (!empty($attachmentNames)) {
        $fullBody .= "\n\n[Attachments: " . implode(', ', $attachmentNames) . "]";
    }

    // 3. Log to audit table
    $stmt = $pdo->prepare("INSERT INTO email_logs (id, sender, recipient, subject, body, status, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $sender = "Web Visitor";
    $status = "sent";
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    $stmt->execute([$uuid, $sender, $recipient, $subject, $fullBody, $status, $ip]);

    // REAL SENDING LOGIC (Placeholder)
    // In production, use PHPMailer here:
    /*
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['smtp']['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['smtp']['user'];
    $mail->Password = $config['smtp']['pass'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $config['smtp']['port'];
    $mail->setFrom($config['smtp']['from'], 'Portfolio No-Reply');
    $mail->addAddress($recipient);
    $mail->Subject = $subject;
    $mail->Body = $body;
    foreach ($_FILES as $file) {
        $mail->addAttachment($file['tmp_name'], $file['name']);
    }
    $mail->send();
    */

    echo json_encode([
        'success' => true,
        'message' => 'Email processed and logged.',
        'log_id' => $uuid,
        'attachments_count' => count($attachmentNames)
    ]);

} catch (Throwable $e) {
    if (!empty($config['debug'])) {
        error_log('send_email failed: ' . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['error' => 'Unable to send email at this time.']);
}
