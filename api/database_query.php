<?php
// api/database_query.php
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$query = $input['query'] ?? '';

if (empty($query)) {
    echo json_encode(['error' => 'Query is empty']);
    exit;
}

// Security: Only allow SELECT queries
$query_trimmed = trim($query);
if (stripos($query_trimmed, 'SELECT') !== 0) {
    echo json_encode(['error' => 'Only SELECT queries are allowed for security reasons.']);
    exit;
}

// Forbidden keywords to prevent subqueries or stacked queries doing damage
$forbidden = ['UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'GRANT', 'REVOKE', 'RENAME'];
foreach ($forbidden as $word) {
    if (stripos($query, $word) !== false) {
        echo json_encode(['error' => "The keyword '$word' is not allowed."]);
        exit;
    }
}

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], $options);
    
    $stmt = $pdo->query($query);
    $results = $stmt->fetchAll();
    
    $columns = [];
    if (!empty($results)) {
        $columns = array_keys($results[0]);
    } else {
        // If no results, try to get column names from the statement
        for ($i = 0; $i < $stmt->columnCount(); $i++) {
            $col = $stmt->getColumnMeta($i);
            $columns[] = $col['name'];
        }
    }
    
    echo json_encode([
        'columns' => $columns,
        'data' => $results,
        'count' => count($results)
    ]);

} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
