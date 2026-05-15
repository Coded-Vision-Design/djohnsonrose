<?php
// api/stats.php — aggregates for the v2 Admin Console.
//
// Returns a JSON payload the dashboard renders directly into Chart.js. The
// shape is intentionally chart-ready (label/value arrays) so the React side
// doesn't need to munge anything before passing to react-chartjs-2.

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

requireAdmin($config);

try {
    $dbConfig = $config['db'];
    $dsn = "mysql:host={$dbConfig['host']};dbname={$dbConfig['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbConfig['user'], $dbConfig['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    $pdo->exec("SET SESSION sql_mode = ''");

    // --- v1 vs v2 split (lifetime + last 30 days) --------------------------
    $sourceLifetime = $pdo->query("
        SELECT source, COUNT(*) AS total
        FROM event_logs
        GROUP BY source
    ")->fetchAll();

    $source30d = $pdo->query("
        SELECT source, COUNT(*) AS total
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 30 DAY
        GROUP BY source
    ")->fetchAll();

    // --- Per-app usage (top 12) --------------------------------------------
    $perApp = $pdo->query("
        SELECT COALESCE(NULLIF(app, ''), 'shell') AS app, COUNT(*) AS total
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 60 DAY
        GROUP BY app
        ORDER BY total DESC
        LIMIT 12
    ")->fetchAll();

    // --- Device / OS / browser ---------------------------------------------
    $osBreakdown = $pdo->query("
        SELECT COALESCE(NULLIF(os, ''), 'Unknown') AS os, COUNT(*) AS total
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 60 DAY
        GROUP BY os
        ORDER BY total DESC
        LIMIT 8
    ")->fetchAll();

    $browserBreakdown = $pdo->query("
        SELECT COALESCE(NULLIF(browser, ''), 'Unknown') AS browser, COUNT(*) AS total
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 60 DAY
        GROUP BY browser
        ORDER BY total DESC
        LIMIT 8
    ")->fetchAll();

    // --- Country / city ----------------------------------------------------
    $countryBreakdown = $pdo->query("
        SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, COUNT(*) AS total
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 60 DAY
        GROUP BY country
        ORDER BY total DESC
        LIMIT 10
    ")->fetchAll();

    // --- Sessions per day (last 14d) ---------------------------------------
    $perDay = $pdo->query("
        SELECT DATE(created_at) AS day, source, COUNT(DISTINCT session_id) AS sessions
        FROM event_logs
        WHERE created_at >= CURDATE() - INTERVAL 13 DAY
        GROUP BY day, source
        ORDER BY day ASC
    ")->fetchAll();

    // --- Screen time proxy: events per session (avg) -----------------------
    $screenTime = $pdo->query("
        SELECT source,
               COUNT(*) AS events,
               COUNT(DISTINCT session_id) AS sessions,
               ROUND(COUNT(*) / GREATEST(COUNT(DISTINCT session_id), 1), 1) AS events_per_session
        FROM event_logs
        WHERE created_at >= NOW() - INTERVAL 30 DAY
        GROUP BY source
    ")->fetchAll();

    // --- Outlook enquiries (most recent 50) --------------------------------
    $enquiries = [];
    try {
        $enquiries = $pdo->query("
            SELECT id, sender, recipient, subject, body, status, ip_address, created_at
            FROM email_logs
            ORDER BY created_at DESC
            LIMIT 50
        ")->fetchAll();
    } catch (Throwable $e) {
        // email_logs may not exist yet — surface as empty list.
        if (!empty($config['debug'])) {
            error_log('stats: email_logs read failed: ' . $e->getMessage());
        }
    }

    $enquiriesCount = 0;
    try {
        $row = $pdo->query("SELECT COUNT(*) AS c FROM email_logs")->fetch();
        $enquiriesCount = (int)($row['c'] ?? 0);
    } catch (Throwable $e) {
        // ignore
    }

    $totalEvents = 0;
    foreach ($sourceLifetime as $row) {
        $totalEvents += (int)$row['total'];
    }

    echo json_encode([
        'generated_at'    => date('c'),
        'total_events'    => $totalEvents,
        'enquiries_count' => $enquiriesCount,
        'source' => [
            'lifetime' => $sourceLifetime,
            'last_30d' => $source30d,
        ],
        'per_app'           => $perApp,
        'os'                => $osBreakdown,
        'browser'           => $browserBreakdown,
        'country'           => $countryBreakdown,
        'per_day'           => $perDay,
        'screen_time'       => $screenTime,
        'enquiries'         => $enquiries,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    if (!empty($config['debug'])) {
        error_log('stats failed: ' . $e->getMessage());
    }
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load stats.']);
}
