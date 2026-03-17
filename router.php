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
$appToOpen = null;
if (strpos($path, '/app/') === 0) {
    $appToOpen = str_replace('/app/', '', $path);
}

return [
    'route' => $route,
    'htmx' => $htmx,
    'appToOpen' => $appToOpen
];
