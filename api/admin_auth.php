<?php
// api/admin_auth.php — exchanges a Google id_token for an admin session cookie.
//
// Flow:
//   1. POST { id_token } from the v2 Admin Console (Google Identity Services).
//   2. Verify the token by hitting Google's `tokeninfo` endpoint (no extra
//      dependencies — we already have curl/file_get_contents available).
//   3. Confirm aud == GOOGLE_OAUTH_CLIENT_ID, iss is google, email_verified is
//      true, and the email is in ADMIN_EMAILS.
//   4. Issue an HMAC-signed session cookie via issueAdminSession().

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$idToken = is_array($input) ? (string)($input['id_token'] ?? '') : '';

if ($idToken === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing id_token']);
    exit;
}

$clientId = $config['oauth_client_id'] ?? '';
$secret   = $config['admin_session_secret'] ?? '';
$admins   = $config['admin_emails'] ?? [];

if ($clientId === '' || $secret === '' || empty($admins)) {
    http_response_code(500);
    echo json_encode(['error' => 'Admin auth is not configured on the server.']);
    exit;
}

// Verify via Google's tokeninfo endpoint. This validates signature, audience,
// and expiry server-side without us shipping a JWT lib.
$verifyUrl = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken);
$ctx = stream_context_create([
    'http' => ['timeout' => 5, 'ignore_errors' => true],
]);
$raw = @file_get_contents($verifyUrl, false, $ctx);
$claims = $raw ? json_decode($raw, true) : null;

if (!is_array($claims) || isset($claims['error'])) {
    if (!empty($config['debug'])) {
        error_log('admin_auth: tokeninfo rejection ' . ($raw ?: '(null)'));
    }
    http_response_code(401);
    echo json_encode(['error' => 'Token verification failed']);
    exit;
}

$aud = (string)($claims['aud'] ?? '');
$iss = (string)($claims['iss'] ?? '');
$email = strtolower((string)($claims['email'] ?? ''));
$ev = $claims['email_verified'] ?? false;
$emailVerified = ($ev === true || $ev === 'true');

$validIss = in_array($iss, ['https://accounts.google.com', 'accounts.google.com'], true);

if (!hash_equals($clientId, $aud) || !$validIss || !$emailVerified || $email === '') {
    http_response_code(401);
    echo json_encode(['error' => 'Token rejected']);
    exit;
}

$allowed = array_map('strtolower', $admins);
if (!in_array($email, $allowed, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'This Google account is not on the admin allowlist.']);
    exit;
}

issueAdminSession($email, $secret);

echo json_encode([
    'ok'    => true,
    'email' => $email,
    'name'  => (string)($claims['name'] ?? ''),
    'picture' => (string)($claims['picture'] ?? ''),
]);
