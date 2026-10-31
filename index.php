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
    // Full shell render. Headers must go first, as the shell starts output.
    $cspNonce = csp_nonce();
    header('Content-Security-Policy: ' . v1_content_security_policy($cspNonce));
    include __DIR__ . '/partials/shell.php';
}
