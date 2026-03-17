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