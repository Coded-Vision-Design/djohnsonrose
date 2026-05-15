<?php
// api/admin_logout.php — clears the admin session cookie.
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

clearAdminSession();

echo json_encode(['ok' => true]);
