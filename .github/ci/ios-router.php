<?php
// Router for `php -S` in the iOS Safari check. It serves the site as the host
// does: /v2/ from the production build in v2/dist, everything else through the
// usual dev server router.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$root = dirname(__DIR__, 2);

if ($path === '/v2') {
    header('Location: /v2/', true, 301);
    exit;
}

if (strncmp($path, '/v2/', 4) === 0) {
    $file = realpath($root . '/v2/dist/' . substr($path, 4));
    $inBuild = $file !== false && strncmp($file, realpath($root . '/v2/dist'), strlen(realpath($root . '/v2/dist'))) === 0;
    if (!$inBuild || is_dir($file)) {
        // A missing chunk is a 404, as on the host, so a stale tab cannot load the page as script.
        if (strncmp($path, '/v2/assets/', 11) === 0) {
            http_response_code(404);
            exit;
        }
        $file = $root . '/v2/dist/index.html';
    }
    $types = [
        'html' => 'text/html; charset=utf-8',
        'js' => 'text/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'webmanifest' => 'application/manifest+json',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        'png' => 'image/png',
        'ico' => 'image/x-icon',
        'woff2' => 'font/woff2',
    ];
    header('Content-Type: ' . ($types[pathinfo($file, PATHINFO_EXTENSION)] ?? 'application/octet-stream'));
    readfile($file);
    exit;
}

return require $root . '/dev-server.php';
