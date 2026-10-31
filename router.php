<?php
// router.php
require_once __DIR__ . '/bootstrap.php';

$path = getRequestPath();
$htmx = isHtmx();

// Route mapping
if ($path === '/' || $path === '/login') {
    $route = 'login';
} elseif ($path === '/desktop' || strpos($path, '/app/') === 0) {
    $route = 'desktop';
} else {
    // Default to desktop or 404
    $route = 'desktop'; 
}

// Handle deep links for apps
$appToOpen = app_from_path($path, array_column(load_app_manifest()['apps'], 'id'));

return [
    'route' => $route,
    'htmx' => $htmx,
    'appToOpen' => $appToOpen
];
