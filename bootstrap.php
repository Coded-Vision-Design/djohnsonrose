<?php
// bootstrap.php
$config = require_once __DIR__ . '/config.php';

// Helper to check if request is HTMX
function isHtmx() {
    return isset($_SERVER['HTTP_HX_REQUEST']) && $_SERVER['HTTP_HX_REQUEST'] === 'true';
}

// Helper to get base path
function getBasePath() {
    $scriptName = $_SERVER['SCRIPT_NAME'];
    // Handle both index.php and api/app.php or other scripts
    $path = dirname($scriptName);
    if ($path === '/' || $path === '\\') {
        return '/';
    }
    // If the script is in a subdirectory like 'api/', go up one level
    if (basename($path) === 'api') {
        $path = dirname($path);
    }
    return rtrim($path, '/\\') . '/';
}

// Helper to get request path
function getRequestPath() {
    $uri = $_SERVER['REQUEST_URI'];
    $basePath = getBasePath();
    $path = str_replace($basePath, '', $uri);
    $path = parse_url($path, PHP_URL_PATH);
    return '/' . ltrim($path, '/');
}

define('BASE_PATH', getBasePath());
define('IMG_PATH', BASE_PATH . 'assets/img/');

// ---- Admin session helpers ----
// HMAC-signed cookie format: base64url(payload).base64url(sig)
// payload is JSON { email, exp } where exp is a unix timestamp.
function adminCookieName() { return 'admin_session'; }

function b64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function issueAdminSession($email, $secret, $ttlSeconds = 86400) {
    $payload = json_encode(['email' => $email, 'exp' => time() + $ttlSeconds]);
    $encoded = b64UrlEncode($payload);
    $sig = b64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
    $cookie = $encoded . '.' . $sig;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $secure = !in_array(strtok($host, ':'), ['localhost', '127.0.0.1'], true);
    setcookie(adminCookieName(), $cookie, [
        'expires'  => time() + $ttlSeconds,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
    return $cookie;
}

function clearAdminSession() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $secure = !in_array(strtok($host, ':'), ['localhost', '127.0.0.1'], true);
    setcookie(adminCookieName(), '', [
        'expires'  => time() - 3600,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ]);
}

function currentAdminEmail($secret) {
    if (empty($secret)) return null;
    $cookie = $_COOKIE[adminCookieName()] ?? '';
    if (!$cookie || strpos($cookie, '.') === false) return null;
    list($encoded, $sig) = explode('.', $cookie, 2);
    $expected = b64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(b64UrlDecode($encoded), true);
    if (!is_array($payload)) return null;
    if (($payload['exp'] ?? 0) < time()) return null;
    return is_string($payload['email'] ?? null) ? $payload['email'] : null;
}

/**
 * Guards an admin-only endpoint. Sends 401 JSON and exits when not signed in
 * or the cookie's email isn't on the allowlist. Returns the verified email.
 */
function requireAdmin($config) {
    $email = currentAdminEmail($config['admin_session_secret'] ?? '');
    if (!$email || !in_array($email, $config['admin_emails'] ?? [], true)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Admin auth required']);
        exit;
    }
    return $email;
}