<?php
// lib/schema.php - the database tables, and a tidy-up for rows written before
// the privacy changes (full IP addresses, location, user agents). Both run
// from lib/migrate.php, never from a request. See tests/php/db_test.php.

require_once __DIR__ . '/request.php';
require_once __DIR__ . '/telemetry_db.php';

function schema_statements(): array {
    return [
        // country, city, isp and user_agent are no longer written. They stay
        // so that this matches tables created before, and are emptied below.
        "CREATE TABLE IF NOT EXISTS event_logs (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            action VARCHAR(120) NOT NULL,
            source ENUM('php','react','unknown') NOT NULL DEFAULT 'unknown',
            session_id VARCHAR(64) NOT NULL DEFAULT 'guest',
            ip VARCHAR(64) NOT NULL DEFAULT '',
            country VARCHAR(80) NULL,
            city VARCHAR(120) NULL,
            isp VARCHAR(200) NULL,
            os VARCHAR(60) NULL,
            browser VARCHAR(200) NULL,
            resolution VARCHAR(32) NULL,
            user_agent VARCHAR(500) NULL,
            app VARCHAR(60) NULL,
            details JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_event_logs_source_created (source, created_at),
            INDEX idx_event_logs_action (action),
            INDEX idx_event_logs_app (app),
            INDEX idx_event_logs_session (session_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

        "CREATE TABLE IF NOT EXISTS email_logs (
            id VARCHAR(36) PRIMARY KEY,
            sender VARCHAR(255) NOT NULL,
            recipient VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            body TEXT NOT NULL,
            status VARCHAR(32) NOT NULL,
            ip_address VARCHAR(45) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) DEFAULT CHARSET=utf8mb4",
    ];
}

/** Shortens every address in one column. Returns how many rows changed. */
function schema_shorten_ips(PDO $pdo, string $table, string $column): int {
    $changed = 0;
    $update = $pdo->prepare("UPDATE {$table} SET {$column} = ? WHERE {$column} = ?");
    foreach ($pdo->query("SELECT DISTINCT {$column} FROM {$table} WHERE {$column} <> ''")->fetchAll(PDO::FETCH_COLUMN) as $ip) {
        $short = ip_truncate((string)$ip);
        if ($short === $ip) continue;
        $update->execute([$short, $ip]);
        $changed += $update->rowCount();
    }
    return $changed;
}

/**
 * Brings older rows in line with what the privacy notice says is kept, and
 * deletes rows past the retention period. Safe to run more than once.
 * Returns a count for each step.
 */
function schema_tidy(PDO $pdo, array $apps): array {
    $done = [];
    $done['addresses shortened'] = schema_shorten_ips($pdo, 'event_logs', 'ip');
    $done['enquiry addresses shortened'] = schema_shorten_ips($pdo, 'email_logs', 'ip_address');
    $done['locations removed'] = (int)$pdo->exec('UPDATE event_logs SET country = NULL, city = NULL, isp = NULL
        WHERE country IS NOT NULL OR city IS NOT NULL OR isp IS NOT NULL');

    // Read the OS and browser again from the user agent, then drop it.
    $agents = 0;
    $update = $pdo->prepare('UPDATE event_logs SET os = ?, browser = ?, user_agent = NULL WHERE id = ?');
    foreach ($pdo->query('SELECT id, user_agent FROM event_logs WHERE user_agent IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $agent = telemetry_user_agent((string)$row['user_agent']);
        $update->execute([$agent['os'], $agent['browser'], $row['id']]);
        $agents++;
    }
    $done['user agents re-read'] = $agents;
    // Rows with no user agent kept the old guesses ("Netscape 5.0", "MacOS").
    $done['old names fixed'] = (int)$pdo->exec("UPDATE event_logs SET browser = 'Other' WHERE browser LIKE 'Netscape%'")
        + (int)$pdo->exec("UPDATE event_logs SET os = 'macOS' WHERE os = 'MacOS'")
        + (int)$pdo->exec("UPDATE event_logs SET os = 'Other' WHERE os IN ('Unknown', 'Unknown OS')");

    // Older clients never sent the app, but named it in the description.
    $filled = 0;
    $update = $pdo->prepare('UPDATE event_logs SET app = ? WHERE id = ?');
    foreach ($pdo->query('SELECT id, details FROM event_logs WHERE app IS NULL AND details IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $details = json_decode((string)$row['details'], true);
        $app = is_array($details) ? telemetry_app($details, $apps) : null;
        if ($app === null) continue;
        $update->execute([$app, $row['id']]);
        $filled++;
    }
    $done['apps filled in'] = $filled;

    $done['purged'] = telemetry_purge($pdo, TELEMETRY_RETENTION_DAYS);
    $done['messages purged'] = email_logs_purge($pdo, time());
    return $done;
}
