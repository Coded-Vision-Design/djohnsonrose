<?php
// api/database_query.php — read-only SQL viewer for the SSMS app.
//
// Hardened: admin-cookie gated, table allowlisted, no user-supplied SQL is
// executed verbatim. We extract the table name from the inbound query, verify
// it's on the allowlist, then run a parameterised `SELECT * FROM <table>` with
// a hard row cap. Any failure surfaces a generic error to the client; details
// only land in error_log when APP_DEBUG=true.

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method']);
    exit;
}

requireAdmin($config);

$input = json_decode(file_get_contents('php://input'), true);
$query = is_array($input) ? (string)($input['query'] ?? '') : '';

if ($query === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Query is empty']);
    exit;
}

// Allowlist of tables the SSMS viewer is allowed to read.
$allowedTables = ['projects', 'experience', 'certifications', 'email_logs', 'event_logs'];

// Extract the target table — accepts both `[Portfolio_DB].[dbo].[table]` and
// plain `FROM table` patterns.
$table = null;
if (preg_match('/\[([a-zA-Z0-9_]+)\](?:\s*$|\s*;?\s*$)/', $query, $m)) {
    $table = strtolower($m[1]);
} elseif (preg_match('/from\s+`?([a-zA-Z0-9_]+)`?/i', $query, $m)) {
    $table = strtolower($m[1]);
}

if (!$table || !in_array($table, $allowedTables, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only SELECT queries against an allowlisted table are permitted.']);
    exit;
}

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    // Table name is already allowlisted, so backtick-quoting is safe here.
    $stmt = $pdo->query("SELECT * FROM `{$table}` ORDER BY 1 DESC LIMIT 500");
    $results = $stmt->fetchAll();

    $columns = [];
    if (!empty($results)) {
        $columns = array_keys($results[0]);
    } else {
        for ($i = 0; $i < $stmt->columnCount(); $i++) {
            $col = $stmt->getColumnMeta($i);
            $columns[] = $col['name'];
        }
    }

    echo json_encode([
        'columns' => $columns,
        'data'    => $results,
        'count'   => count($results),
        'table'   => $table,
    ]);
} catch (Throwable $e) {
    if (!empty($config['debug'])) {
        error_log('database_query failed: ' . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed.']);
}
