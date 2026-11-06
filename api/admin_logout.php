<?php
// api/admin_logout.php - signs the admin out everywhere. POST only, and only
// from this site, so another page cannot sign the admin out behind their back.
// Clearing the cookie is not enough on its own, as a copy of it would still be
// valid until it expires, so the admin's sign-out count moves on as well and
// every earlier cookie stops working (see lib/admin_session.php).

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

if (!request_same_origin($_SERVER)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Requests from other sites are not allowed.']);
    exit;
}

$email = currentAdminEmail($config);
$revoked = $email !== null && admin_session_revoke(state_dir($config), $email) !== null;
clearAdminSession();

echo json_encode(['ok' => true, 'revoked' => $revoked]);
