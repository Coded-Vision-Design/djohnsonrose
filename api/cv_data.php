<?php
// api/cv_data.php — read-only SQL-shaped view of data/portfolio.json.
//
// Powers the SSMS-styled Database app. Returns deterministic rows in the
// shape { columns: string[], data: object[], count: number } that the v1 and
// v2 builds can render directly. No user input flows into a query — the
// caller picks one of a fixed table name set, and the server does the
// flattening from the JSON source. There is therefore no SQL injection
// surface to begin with.
//
// Public endpoint by design: every row this returns is already visible in
// the Word, Settings, and Photos apps. Admin-only data (event_logs,
// email_logs) lives behind requireAdmin() in api/database_query.php.

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=60');

$table = strtolower((string)($_GET['table'] ?? ''));
$allowed = ['experience', 'projects', 'certifications', 'education', 'skills', 'achievements', 'interests'];

if (!in_array($table, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown table. Try one of: ' . implode(', ', $allowed)]);
    exit;
}

$portfolioPath = __DIR__ . '/../data/portfolio.json';
if (!is_readable($portfolioPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Portfolio data unavailable.']);
    exit;
}
$portfolio = json_decode((string)file_get_contents($portfolioPath), true);
if (!is_array($portfolio)) {
    http_response_code(500);
    echo json_encode(['error' => 'Portfolio data is malformed.']);
    exit;
}

/** Flatten portfolio sections into SQL-shaped rows. Columns are stable. */
$rows = [];
switch ($table) {
    case 'experience':
        foreach ($portfolio['experience'] ?? [] as $job) {
            $rows[] = [
                'id'         => (int)($job['id'] ?? 0),
                'role'       => (string)($job['role'] ?? ''),
                'company'    => (string)($job['company'] ?? ''),
                'period'     => (string)($job['period'] ?? ''),
                'location'   => (string)($job['location'] ?? ''),
                'highlights' => (string)($job['highlights'] ?? ''),
            ];
        }
        break;

    case 'projects':
        foreach ($portfolio['projects'] ?? [] as $p) {
            $rows[] = [
                'id'          => (int)($p['id'] ?? 0),
                'title'       => (string)($p['title'] ?? ''),
                'description' => (string)($p['description'] ?? ''),
                'tags'        => is_array($p['tags'] ?? null) ? implode(', ', $p['tags']) : (string)($p['tags'] ?? ''),
                'url'         => (string)($p['url'] ?? ''),
                'location'    => (string)($p['location'] ?? ''),
                'country'     => (string)($p['country_code'] ?? ''),
            ];
        }
        break;

    case 'certifications':
        foreach ($portfolio['certifications'] ?? [] as $c) {
            $rows[] = [
                'id'     => (int)($c['id'] ?? 0),
                'name'   => (string)($c['name'] ?? ''),
                'issuer' => (string)($c['issuer'] ?? ''),
                'year'   => (string)($c['year'] ?? ''),
            ];
        }
        break;

    case 'education':
        foreach ($portfolio['education'] ?? [] as $e) {
            $rows[] = [
                'id'     => (int)($e['id'] ?? 0),
                'title'  => (string)($e['title'] ?? ''),
                'issuer' => (string)($e['issuer'] ?? ''),
            ];
        }
        break;

    case 'skills':
        $id = 1;
        foreach ($portfolio['skills'] ?? [] as $category => $list) {
            foreach ((array)$list as $skill) {
                $rows[] = [
                    'id'       => $id++,
                    'category' => (string)$category,
                    'name'     => (string)$skill,
                ];
            }
        }
        break;

    case 'achievements':
        foreach ($portfolio['achievements'] ?? [] as $a) {
            $rows[] = [
                'id'       => (int)($a['id'] ?? 0),
                'title'    => (string)($a['title'] ?? ''),
                'result'   => (string)($a['result'] ?? ''),
                'category' => (string)($a['category'] ?? ''),
                'date'     => (string)($a['date'] ?? ''),
            ];
        }
        break;

    case 'interests':
        $id = 1;
        foreach ($portfolio['interests'] ?? [] as $interest) {
            $rows[] = ['id' => $id++, 'name' => (string)$interest];
        }
        break;
}

$columns = $rows ? array_keys($rows[0]) : [];

echo json_encode([
    'table'   => $table,
    'columns' => $columns,
    'data'    => $rows,
    'count'   => count($rows),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
