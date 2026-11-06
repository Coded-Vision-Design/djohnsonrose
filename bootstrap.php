<?php
// bootstrap.php
$config = require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/security.php';
require_once __DIR__ . '/lib/state.php';
require_once __DIR__ . '/lib/admin_session.php';

header_remove('X-Powered-By');

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
    return request_path($_SERVER['REQUEST_URI'], getBasePath());
}

define('BASE_PATH', getBasePath());
define('IMG_PATH', BASE_PATH . 'assets/img/');

// ---- Admin session helpers ----
// The cookie format and its checks live in lib/admin_session.php. Every check
// goes through currentAdminEmail(), which also honours sign-outs.
function adminCookieName() { return 'admin_session'; }

function adminCookieOptions(int $expires): array {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $host = is_string($host) ? strtok($host, ':') : '';
    return [
        'expires'  => $expires,
        'path'     => '/',
        'httponly' => true,
        'secure'   => !in_array($host, ['localhost', '127.0.0.1'], true),
        'samesite' => 'Lax',
    ];
}

function issueAdminSession($email, $config, $ttlSeconds = 86400) {
    $now = time();
    $generation = admin_session_generation(state_dir($config), $email);
    $cookie = admin_session_encode($email, $generation, $config['admin_session_secret'] ?? '', $now, $ttlSeconds);
    setcookie(adminCookieName(), $cookie, adminCookieOptions($now + $ttlSeconds));
    return $cookie;
}

function clearAdminSession() {
    setcookie(adminCookieName(), '', adminCookieOptions(time() - 3600));
}

/**
 * The signed-in admin's email, or null when the cookie is missing, forged,
 * expired, signed out, not on the allowlist, or not even a string.
 */
function currentAdminEmail($config) {
    return admin_session_current(
        $_COOKIE[adminCookieName()] ?? null,
        $config['admin_session_secret'] ?? '',
        $config['admin_emails'] ?? [],
        state_dir($config),
        time()
    );
}

/**
 * Guards an admin-only endpoint. Sends 401 JSON and exits when not signed in
 * or the cookie's email isn't on the allowlist. Returns the verified email.
 */
function requireAdmin($config) {
    $email = currentAdminEmail($config);
    if ($email === null) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Admin auth required']);
        exit;
    }
    return $email;
}
