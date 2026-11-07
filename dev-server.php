<?php
// dev-server.php - router for `php -S` built-in dev server.
// Mirrors .htaccess: real files served as-is, everything else → index.php.
//
// parse_url() does NOT percent-decode, so a request for
//   /assets/img/fl%20studio.webp
// would arrive here with $path still containing the literal %20 and
// file_exists() would miss the file (which has a real space in its name).
// Decode before checking the filesystem.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$decoded = rawurldecode($path);

// Local-dev convenience: in production v2's addresses are served by Apache from
// v2/dist/, but PHP's built-in server doesn't know that. Hand them off to
// the Vite dev server so the v1↔v2 cross-link buttons in the taskbar work
// during development without any extra steps. Any other /v2/ address is v1's
// 404 page, as on Apache; Vite's dev server fetches it from here.
if ($decoded === '/v2' || strncmp($decoded, '/v2/', 4) === 0) {
    require_once __DIR__ . '/lib/routes.php';
    if (v2_address_known($decoded, array_column(load_app_manifest()['apps'], 'id'))) {
        header('Location: http://localhost:5173' . $_SERVER['REQUEST_URI'], true, 302);
        exit;
    }
}

$file = __DIR__ . $decoded;
if ($decoded !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}
// Apache rewrites to /index.php, so that is the script name there. PHP's
// server would otherwise name the nearest real folder (/pages/x gives
// /pages/), which shifts the base path and the route with it.
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
