<?php
// lib/security.php - request parsing and browser security policy. Kept free of
// global state so that it can be unit tested; see tests/php/security_test.php.

/** The path of a request, relative to the site root. */
function request_path(string $uri, string $basePath): string {
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path)) return '/';
    if ($basePath !== '/' && strpos($path, $basePath) === 0) {
        $path = substr($path, strlen($basePath));
    }
    return '/' . ltrim($path, '/');
}

/**
 * The app named by a /app/<id> deep link, or null. The value ends up in the
 * page, so anything other than a known app id is discarded here.
 */
function app_from_path(string $path, array $appIds): ?string {
    if (strpos($path, '/app/') !== 0) return null;
    $id = rtrim(substr($path, strlen('/app/')), '/');
    return in_array($id, $appIds, true) ? $id : null;
}

/** The shared app list. See data/apps.json. */
function load_app_manifest(): array {
    $manifest = json_decode((string)@file_get_contents(__DIR__ . '/../data/apps.json'), true);
    return is_array($manifest) ? $manifest : ['apps' => [], 'pinned' => [], 'startPinned' => []];
}

/** Encodes a value for a script block. It cannot break out of the block. */
function js_value($value): string {
    return json_encode($value, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES);
}

function csp_nonce(): string {
    return base64_encode(random_bytes(16));
}

/**
 * The policy for v1. Inline scripts need the per-request nonce. Alpine evaluates
 * its expressions at runtime, so it needs 'unsafe-eval', and it sets style
 * attributes, so styles need 'unsafe-inline'. v2 needs neither for scripts: its
 * policy is in v2/public/.htaccess.
 */
function v1_content_security_policy(string $nonce): string {
    $nonce = preg_replace('/[^A-Za-z0-9+\/=]/', '', $nonce);
    $directives = [
        'default-src' => ["'self'"],
        'script-src' => [
            "'self'",
            "'nonce-{$nonce}'",
            "'unsafe-eval'",
            'https://accounts.google.com/gsi/client',
            'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/',
            'https://www.googletagmanager.com/gtag/js',
        ],
        'style-src' => ["'self'", "'unsafe-inline'", 'https://accounts.google.com/gsi/style'],
        'img-src' => ["'self'", 'data:', 'blob:', 'https:'],
        'font-src' => ["'self'", 'data:'],
        'media-src' => ["'self'", 'blob:', 'https://cdn.freesound.org'],
        'connect-src' => [
            "'self'",
            'https://accounts.google.com/gsi/',
            'https://cdn.freesound.org',
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://www.googletagmanager.com',
        ],
        'frame-src' => ["'self'", 'https://accounts.google.com/gsi/'],
        'object-src' => ["'none'"],
        'base-uri' => ["'self'"],
        'form-action' => ["'self'"],
        'frame-ancestors' => ["'self'"],
    ];

    $parts = [];
    foreach ($directives as $name => $sources) {
        $parts[] = $name . ' ' . implode(' ', $sources);
    }
    return implode('; ', $parts);
}
