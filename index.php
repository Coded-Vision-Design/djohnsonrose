<?php
// index.php
$router = require_once __DIR__ . '/router.php';
$route = $router['route'];
$isHtmx = $router['htmx'];
$appToOpen = $router['appToOpen'];

if ($isHtmx) {
    // Partial renders for HTMX
    if ($route === 'login') {
        include __DIR__ . '/partials/login.php';
    } else {
        // If it's an app request via HTMX
        if ($appToOpen) {
            include __DIR__ . '/api/app.php';
        } else {
            include __DIR__ . '/partials/desktop.php';
        }
    }
} else {
    // Full shell render
    include __DIR__ . '/partials/shell.php';
}
