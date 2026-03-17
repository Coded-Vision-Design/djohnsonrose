<?php
// api/log.php
require_once __DIR__ . '/../bootstrap.php';

// Set timezone to London
date_default_timezone_set('Europe/London');

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    exit('Invalid input');
}

$action = $input['action'] ?? 'Unknown Action';
$details = $input['details'] ?? [];
$deviceInfo = $input['deviceInfo'] ?? [];

// Get IP address
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'];

// Rough location (using a simple public API or just identifying)
$location = "Unknown";
try {
    $geo = file_get_contents("http://ip-api.com/json/{$ip}?fields=status,country,city,isp");
    $geoData = json_decode($geo, true);
    if ($geoData && $geoData['status'] === 'success') {
        $location = "{$geoData['city']}, {$geoData['country']} ({$geoData['isp']})";
    }
} catch (Exception $e) {
    // Fail silently
}

// Format Email
$to = $config['admin_email'];
$subject = "OS Notification: [{$action}] from {$ip}";

$message = "OS Action Log\n";
$message .= "==============================\n";
$message .= "Time (London): " . date('Y-m-d H:i:s') . "\n";
$message .= "Action: {$action}\n";
$message .= "IP Address: {$ip}\n";
$message .= "Location: {$location}\n";
$message .= "------------------------------\n";
$message .= "Device Details:\n";
$message .= "OS: " . ($deviceInfo['os'] ?? 'Unknown') . "\n";
$message .= "Browser: " . ($deviceInfo['browser'] ?? 'Unknown') . "\n";
$message .= "Resolution: " . ($deviceInfo['resolution'] ?? 'Unknown') . "\n";
$message .= "Device Time: " . ($deviceInfo['deviceTime'] ?? 'Unknown') . "\n";
$message .= "------------------------------\n";
$message .= "Action Details:\n";
foreach ($details as $key => $val) {
    if (is_array($val)) $val = json_encode($val);
    $message .= ucfirst($key) . ": {$val}\n";
}
$message .= "==============================\n";

$headers = [
    'From' => "{$config['smtp']['name']} <{$config['smtp']['from']}>",
    'Reply-To' => $config['smtp']['from'],
    'X-Mailer' => 'PHP/' . phpversion()
];

// Send Email
$mailSent = false;
if ($_SERVER['HTTP_HOST'] !== 'localhost' && $_SERVER['HTTP_HOST'] !== '127.0.0.1') {
    $mailSent = mail($to, $subject, $message, $headers);
}

header('Content-Type: application/json');
echo json_encode([
    'success' => $mailSent,
    'id' => uniqid('log_', true)
]);
