<?php
// tests/php/routes_test.php - unit tests for lib/routes.php, the map from a
// request path to what index.php renders. tests/php/http_test.php checks the
// same routes through a running server.
// Run with: php tests/php/routes_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/routes.php';
require_once __DIR__ . '/../../lib/security.php';

$failures = 0;
$passes = 0;

function check(string $label, bool $ok): void {
    global $failures, $passes;
    if ($ok) {
        $passes++;
        return;
    }
    $failures++;
    echo "FAIL: {$label}\n";
}

$apps = array_column(load_app_manifest()['apps'], 'id');
$route = fn(string $path) => route_match($path, $apps);

// The real routes keep working
check('route: / is the sign-in screen', $route('/')['route'] === 'login');
check('route: /login is the sign-in screen', $route('/login')['route'] === 'login');
check('route: /index.php is the home page too', $route('/index.php')['route'] === 'login');
check('route: /desktop is the desktop', $route('/desktop')['route'] === 'desktop');
check('route: /app/word opens Word', $route('/app/word') === ['route' => 'desktop', 'app' => 'word', 'page' => null]);
check('route: a trailing slash is fine', $route('/app/word/')['app'] === 'word' && $route('/desktop/')['route'] === 'desktop');
check('route: every app in the manifest has a deep link', array_filter($apps, fn($id) => $route("/app/{$id}")['app'] !== $id) === []);
check('route: /privacy is a page', $route('/privacy') === ['route' => 'page', 'app' => null, 'page' => 'privacy']);
check('route: /privacy/ is the same page', $route('/privacy/')['page'] === 'privacy');
check('route: /cv is kept for the CV page', $route('/cv')['route'] === 'page' && $route('/cv')['page'] === 'cv');

// Everything else is a 404
foreach (['/nonexistent-page', '/app/nope', '/app/', '/app/word/extra', '/PRIVACY', '/api/nope.php',
          '/assets/nope.js', '/data/nope.json', '/portfolio/nope.webp', '/sitemaps.php',
          '/tests/php/contact_test.php', "/app/'+alert(1)+'", '/desktop/x', '/privacy.php'] as $path) {
    check("route: {$path} is not found", $route($path)['route'] === 'not_found');
}

// Pages
check('pages: privacy and cv are listed', isset(SITE_PAGES['/privacy']) && isset(SITE_PAGES['/cv']));
check('pages: the privacy template exists', is_file((string)page_template('privacy')));
check('pages: the 404 template exists', is_file((string)page_template('not-found')));
check('pages: a missing template gives null', page_template('no-such-page') === null);
check('pages: a name cannot leave the folder', page_template('../index') === null && page_template('..\\index') === null);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
