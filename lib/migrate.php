<?php
// lib/migrate.php - creates the database tables and tidies older rows (see
// lib/schema.php). Run it after a deploy that changes the schema, from the
// site's folder on the server:
//
//     php lib/migrate.php
//
// It is safe to run again. It only runs from the command line, and
// lib/.htaccess denies it over HTTP as well.

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$config = require __DIR__ . '/../config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/schema.php';
require_once __DIR__ . '/security.php';

try {
    $pdo = db_connect($config);
    foreach (schema_statements() as $sql) {
        $pdo->exec($sql);
    }
    echo "Tables are in place.\n";

    foreach (schema_tidy($pdo, load_app_manifest()['apps']) as $step => $count) {
        echo ucfirst($step) . ": {$count}\n";
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Migration failed: ' . $e->getMessage() . "\n");
    exit(1);
}
