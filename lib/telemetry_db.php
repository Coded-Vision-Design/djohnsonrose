<?php
// lib/telemetry_db.php - event_logs reads and writes for api/log.php, and its
// once-a-day jobs: deleting old rows and sending the digest email. The table
// is created by lib/migrate.php; if it is missing, these throw and the
// endpoint carries on without storing. See tests/php/db_test.php.

require_once __DIR__ . '/telemetry.php';

/** Stores an event from telemetry_event(). $shortIp is already shortened by ip_truncate(). */
function telemetry_store(PDO $pdo, array $event, string $shortIp): void {
    $stmt = $pdo->prepare('INSERT INTO event_logs
        (action, source, session_id, ip, os, browser, resolution, app, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $event['action'],
        $event['source'],
        $event['session_id'],
        $shortIp,
        $event['os'],
        $event['browser'],
        $event['resolution'],
        $event['app'],
        json_encode($event['details'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
}

/** Deletes events older than $days days. Returns how many went. */
function telemetry_purge(PDO $pdo, int $days): int {
    return (int)$pdo->exec('DELETE FROM event_logs WHERE created_at < NOW() - INTERVAL ' . max(1, $days) . ' DAY');
}

/** Counts for the digest, for events from $from up to (not including) $to. */
function telemetry_summary(PDO $pdo, int $from, int $to): array {
    // FROM_UNIXTIME works in the connection's time zone, as created_at does.
    $where = 'created_at >= FROM_UNIXTIME(?) AND created_at < FROM_UNIXTIME(?)';

    $stmt = $pdo->prepare("SELECT COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions FROM event_logs WHERE {$where}");
    $stmt->execute([$from, $to]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $counts = function (string $column, int $limit) use ($pdo, $where, $from, $to): array {
        $stmt = $pdo->prepare("SELECT {$column} AS label, COUNT(*) AS total FROM event_logs
            WHERE {$where} AND {$column} IS NOT NULL
            GROUP BY {$column} ORDER BY total DESC, label ASC LIMIT {$limit}");
        $stmt->execute([$from, $to]);
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $out[(string)$row['label']] = (int)$row['total'];
        }
        return $out;
    };

    return [
        'total' => (int)($totals['total'] ?? 0),
        'sessions' => (int)($totals['sessions'] ?? 0),
        'by_source' => $counts('source', 5),
        'by_app' => $counts('app', 15),
        'by_action' => $counts('action', 15),
    ];
}

/**
 * The once-a-day jobs, run lazily by the first event of each day: delete
 * events past the retention period, and send one digest of the days since the
 * last one through $send(subject, body). Each job is claimed before it runs,
 * so two requests can never both run it.
 */
function telemetry_daily_jobs(PDO $pdo, string $stateDir, int $now, callable $send): void {
    if (daily_job_claim($stateDir, 'telemetry-purge', $now, TELEMETRY_TIMEZONE) !== null) {
        telemetry_purge($pdo, TELEMETRY_RETENTION_DAYS);
    }

    $period = daily_job_claim($stateDir, 'telemetry-digest', $now, TELEMETRY_TIMEZONE);
    if ($period === null) return;

    $digest = telemetry_digest(telemetry_summary($pdo, $period['from'], $period['to']), $period['from'], $period['to']);
    if ($digest !== null) {
        $send($digest['subject'], $digest['body']);
    }
}
