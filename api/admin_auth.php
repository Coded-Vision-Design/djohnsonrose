<?php
// api/admin_auth.php - exchanges a Google id_token for an admin session cookie.
//
// Flow:
//   1. POST { id_token } from the Admin Console (Google Identity Services).
//   2. At most ADMIN_SIGN_IN_LIMIT attempts per visitor in any fifteen minutes.
//   3. Verify the token with Google's tokeninfo endpoint, which checks the
//      signature, audience and expiry, so no JWT library is needed. The call
//      gives up after ADMIN_TOKENINFO_TIMEOUT seconds.
//   4. Confirm aud == GOOGLE_OAUTH_CLIENT_ID, iss is Google, email_verified
//      is true, and the email is in ADMIN_EMAILS (ignoring case).
//   5. Issue an HMAC-signed session cookie via issueAdminSession().

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/rate_limit.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

function admin_auth_fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    admin_auth_fail(405, 'Method not allowed');
}

if (!request_same_origin($_SERVER)) {
    admin_auth_fail(403, 'Requests from other sites are not allowed.');
}

$ip = client_ip($_SERVER, $config['trusted_proxies'] ?? []);
if (!rate_limit_allow(state_dir($config), 'admin-auth', $ip, ADMIN_SIGN_IN_LIMIT, ADMIN_SIGN_IN_WINDOW, time())) {
    header('Retry-After: ' . ADMIN_SIGN_IN_WINDOW);
    admin_auth_fail(429, 'Too many sign-in attempts. Please try again in 15 minutes.');
}

$input = json_decode((string)read_request_body(8192), true);
$idToken = is_array($input) && is_string($input['id_token'] ?? null) ? $input['id_token'] : '';

if ($idToken === '') {
    admin_auth_fail(400, 'Missing id_token');
}

$clientId = $config['oauth_client_id'] ?? '';
$secret   = $config['admin_session_secret'] ?? '';
$admins   = $config['admin_emails'] ?? [];

if ($clientId === '' || $secret === '' || empty($admins)) {
    admin_auth_fail(500, 'Admin auth is not configured on the server.');
}

$claims = http_get_json(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken),
    ADMIN_TOKENINFO_TIMEOUT
);

if (!is_array($claims) || isset($claims['error'])) {
    if (!empty($config['debug'])) {
        error_log('admin_auth: tokeninfo rejected the token or did not answer in time');
    }
    admin_auth_fail(401, 'Token verification failed');
}

$aud = (string)($claims['aud'] ?? '');
$iss = (string)($claims['iss'] ?? '');
$email = strtolower((string)($claims['email'] ?? ''));
$ev = $claims['email_verified'] ?? false;
$emailVerified = ($ev === true || $ev === 'true');

$validIss = in_array($iss, ['https://accounts.google.com', 'accounts.google.com'], true);

if (!hash_equals($clientId, $aud) || !$validIss || !$emailVerified || $email === '') {
    admin_auth_fail(401, 'Token rejected');
}

if (!admin_email_allowed($email, $admins)) {
    admin_auth_fail(403, 'This Google account is not on the admin allowlist.');
}

issueAdminSession($email, $config);

echo json_encode([
    'ok'    => true,
    'email' => $email,
    'name'  => (string)($claims['name'] ?? ''),
    'picture' => (string)($claims['picture'] ?? ''),
]);
