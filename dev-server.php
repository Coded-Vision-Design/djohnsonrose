<?php
// dev-server.php — router for `php -S` built-in dev server.
// Mirrors .htaccess: real files served as-is, everything else → index.php.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $path;
if ($path !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}
require __DIR__ . '/index.php';
