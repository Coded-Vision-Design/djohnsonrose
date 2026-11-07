<?php
// lib/routes.php - which request paths are real. Apache sends every path that
// is not a file on disk to index.php (see .htaccess), so a path that matches
// nothing here is a 404. Real files (/api/*.php, /assets/*, /data/*,
// /portfolio/*) and v2's own addresses (v2_address_known below) never get
// here: Apache serves them directly. Any other /v2/ address does, and is a 404.
// See tests/php/routes_test.php and tests/php/v2_routes_test.php.

require_once __DIR__ . '/security.php';

/**
 * Standalone server-rendered pages: URL path => template name in pages/.
 * Add new pages here. /cv is reserved for the recruiter CV page; until
 * pages/cv.php exists it shows the desktop, as it always has.
 */
const SITE_PAGES = [
    '/privacy' => 'privacy',
    '/cv' => 'cv',
];

/**
 * Matches a path from request_path(). Returns route (login, desktop, page or
 * not_found), app (the id for an /app/<id> deep link) and page (a SITE_PAGES
 * template name).
 */
function route_match(string $path, array $appIds, array $pages = SITE_PAGES): array {
    $path = rtrim($path, '/');
    if ($path === '') $path = '/';
    $result = ['route' => 'not_found', 'app' => null, 'page' => null];

    if ($path === '/' || $path === '/login' || $path === '/index.php') {
        $result['route'] = 'login';
    } elseif ($path === '/desktop') {
        $result['route'] = 'desktop';
    } elseif (strpos($path, '/app/') === 0) {
        $app = app_from_path($path, $appIds);
        if ($app !== null) $result = ['route' => 'desktop', 'app' => $app, 'page' => null];
    } elseif (isset($pages[$path])) {
        $result = ['route' => 'page', 'app' => null, 'page' => $pages[$path]];
    }
    return $result;
}

/**
 * Whether a path is one of the React build's own addresses: its desktop (at
 * /v2/, /v2/login or /v2/desktop, as v1's) or /v2/app/<id> for a known app.
 * The same rules as assets/js/windowing/address.js and the v2 rules in
 * .htaccess. An address holds only the app; see address.js for why.
 */
function v2_address_known(string $path, array $appIds): bool {
    if ($path !== '/v2' && strpos($path, '/v2/') !== 0) return false;
    $rest = preg_replace('#^/|/$#', '', substr($path, strlen('/v2')));
    if (in_array($rest, ['', 'login', 'desktop'], true)) return true;
    return preg_match('#^app/([^/]+)$#', $rest, $m) === 1 && in_array($m[1], $appIds, true);
}

/** The template file for a page name, or null when there is none. */
function page_template(string $name): ?string {
    if (!preg_match('/^[a-z0-9-]+$/', $name)) return null;
    $file = __DIR__ . '/../pages/' . $name . '.php';
    return is_file($file) ? $file : null;
}
