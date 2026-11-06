<?php
// api/app.php - serves an app partial as HTML for v1's HTMX loader.
// Hardened: the requested `name` is checked against an allowlist before
// being used to build the include path, and any rendered output is escaped.
require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';

// ?name[]=x arrives as an array, which counts as no name rather than a crash.
$requested = request_string($_GET, 'name') ?? 'explorer';

// Allow only the known set of app names. The list is derived from
// partials/apps/*.php; anything else triggers the not-found branch with
// the escaped name in the message.
$allowed = [
    'admin', 'calculator', 'database', 'docker', 'edge', 'eventviewer', 'excel',
    'explorer', 'filezilla', 'flstudio', 'github', 'notepad', 'outlook', 'paint',
    'pdfreader', 'photos', 'photoshop', 'powerpoint', 'putty', 'references',
    'settings', 'taskmanager', 'terminal', 'video', 'vscode', 'word',
];

$safe = htmlspecialchars($requested, ENT_QUOTES, 'UTF-8');

if (in_array($requested, $allowed, true)) {
    include __DIR__ . '/../partials/apps/' . $requested . '.php';
} else {
    http_response_code(404);
    echo "<div class='p-10 text-center'><h1 class='text-2xl font-bold mb-4'>App Not Found</h1>"
       . "<p>The application '" . $safe . "' is currently under construction or not found.</p></div>";
}
