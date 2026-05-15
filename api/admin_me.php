<?php
// api/admin_me.php — returns the signed-in admin's email, or 401.
// The v2 Admin Console hits this on mount to decide whether to show the
// Google Sign-In button or the dashboard.

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

// The Google OAuth Client ID is intentionally public — it's required by the
// JS SDK to render the sign-in button. We return it alongside the auth state
// so the React app has everything it needs from a single round-trip.
$clientId = (string)($config['oauth_client_id'] ?? '');
$email = currentAdminEmail($config['admin_session_secret'] ?? '');
$admins = array_map('strtolower', $config['admin_emails'] ?? []);

if (!$email || !in_array(strtolower($email), $admins, true)) {
    echo json_encode([
        'authenticated' => false,
        'client_id'     => $clientId,
    ]);
    exit;
}

echo json_encode([
    'authenticated' => true,
    'email'         => $email,
    'client_id'     => $clientId,
]);
