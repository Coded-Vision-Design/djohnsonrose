<?php
// api/admin_me.php - returns the signed-in admin's email, or authenticated: false.
// The Admin Console in both builds calls this on mount to decide whether to
// show the Google Sign-In button or the dashboard.

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

// The Google OAuth Client ID is intentionally public: the JS SDK needs it to
// render the sign-in button. It is returned alongside the auth state so the
// console has everything it needs from a single round trip.
$clientId = (string)($config['oauth_client_id'] ?? '');
$email = currentAdminEmail($config);

if ($email === null) {
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
