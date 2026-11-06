<?php
// router.php - decides what index.php renders. The list of real paths lives
// in lib/routes.php (pages such as /privacy and /cv go in SITE_PAGES there);
// any other path is a 404.
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/routes.php';

$match = route_match(getRequestPath(), array_column(load_app_manifest()['apps'], 'id'));

// A page whose template is not there yet (such as /cv before its page lands)
// shows the desktop, as every unknown path used to.
$template = $match['route'] === 'page' ? page_template($match['page']) : null;
if ($match['route'] === 'page' && $template === null) {
    $match['route'] = 'desktop';
}

return [
    'route' => $match['route'],
    'htmx' => isHtmx(),
    'appToOpen' => $match['app'],
    'template' => $match['route'] === 'not_found' ? page_template('not-found') : $template,
];
