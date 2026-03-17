<?php
// api/app.php
require_once __DIR__ . '/../bootstrap.php';

$appName = $_GET['name'] ?? 'explorer';
$appFile = __DIR__ . '/../partials/apps/' . $appName . '.php';

if (file_exists($appFile)) {
    include $appFile;
} else {
    echo "<div class='p-10 text-center'><h1 class='text-2xl font-bold mb-4'>App Not Found</h1><p>The application '$appName' is currently under construction or not found.</p></div>";
}
