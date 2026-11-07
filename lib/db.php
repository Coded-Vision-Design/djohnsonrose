<?php
// lib/db.php - opens the site's MySQL database. Tables are created by
// lib/migrate.php, never by a request.

function db_connect(array $config): PDO {
    $db = $config['db'];
    $dsn = "mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4";
    if (($db['port'] ?? '') !== '') {
        $dsn .= ';port=' . (int)$db['port'];
    }
    return new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 3,
    ]);
}
