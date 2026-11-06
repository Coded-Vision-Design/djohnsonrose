<?php
// tests/php/db_test.php - tests for lib/schema.php and lib/telemetry_db.php
// against a real MySQL or MariaDB database. They need a throwaway database,
// named by TEST_DB_NAME (with TEST_DB_HOST, TEST_DB_PORT, TEST_DB_USER and
// TEST_DB_PASS); every table in it is dropped. Without TEST_DB_NAME they skip.
// Run with: php tests/php/db_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/db.php';
require_once __DIR__ . '/../../lib/schema.php';
require_once __DIR__ . '/../../lib/telemetry_db.php';
require_once __DIR__ . '/../../lib/security.php';

$failures = 0;
$passes = 0;

function check(string $label, bool $ok): void {
    global $failures, $passes;
    if ($ok) {
        $passes++;
        return;
    }
    $failures++;
    echo "FAIL: {$label}\n";
}

if ((string)getenv('TEST_DB_NAME') === '') {
    echo "Skipped: set TEST_DB_NAME to a throwaway database to run these.\n";
    echo "0 passed, 0 failed\n";
    exit(0);
}

$pdo = db_connect(['db' => [
    'host' => getenv('TEST_DB_HOST') ?: '127.0.0.1',
    'port' => getenv('TEST_DB_PORT') ?: '',
    'name' => getenv('TEST_DB_NAME'),
    'user' => getenv('TEST_DB_USER') ?: 'root',
    'pass' => getenv('TEST_DB_PASS') ?: '',
]]);
$pdo->exec('DROP TABLE IF EXISTS event_logs, email_logs');
$apps = load_app_manifest()['apps'];
$event = [
    'action' => 'System: Information', 'source' => 'react', 'session_id' => 'abc', 'os' => 'Windows',
    'browser' => 'Chrome', 'resolution' => '1920x1080', 'app' => 'word', 'details' => ['description' => 'Starting application: Word'],
];

// With no table, storing fails with an exception the endpoint can catch.
$threw = false;
try {
    telemetry_store($pdo, $event, '203.0.113.0');
} catch (PDOException $e) {
    $threw = true;
}
check('store: a missing table throws rather than creating it', $threw);
check('store: the table is not created on the way', $pdo->query("SHOW TABLES LIKE 'event_logs'")->fetch() === false);

// schema_statements
foreach (schema_statements() as $sql) $pdo->exec($sql);
foreach (schema_statements() as $sql) $pdo->exec($sql);
check('schema: creates both tables, and can run twice', count($pdo->query("SHOW TABLES WHERE Tables_in_" . getenv('TEST_DB_NAME') . " IN ('event_logs', 'email_logs')")->fetchAll()) === 2);

// telemetry_store
telemetry_store($pdo, $event, '203.0.113.0');
$row = $pdo->query('SELECT * FROM event_logs ORDER BY id DESC LIMIT 1')->fetch();
check('store: writes the event', $row['action'] === 'System: Information' && $row['app'] === 'word' && $row['source'] === 'react');
check('store: writes the shortened address', $row['ip'] === '203.0.113.0');
check('store: writes no location, provider or user agent', $row['country'] === null && $row['city'] === null && $row['isp'] === null && $row['user_agent'] === null);
check('store: writes the details as JSON', json_decode($row['details'], true) === ['description' => 'Starting application: Word']);

// schema_tidy cleans rows written before these changes
$pdo->exec("DELETE FROM event_logs");
$legacy = $pdo->prepare('INSERT INTO event_logs (action, source, session_id, ip, country, city, isp, os, browser, user_agent, app, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
$legacy->execute(['System: Information', 'php', 's1', '198.51.100.77', 'United Kingdom', 'Braintree', 'Some ISP', 'MacOS', 'Netscape 5.0 (iPhone)', $iphone, null, json_encode(['description' => 'Starting application: FL Studio 24']), date('Y-m-d H:i:s', time() - 3600)]);
$legacy->execute(['System: Information', 'php', 's2', '2001:db8:abcd:1234::9', null, null, null, 'Linux', 'Netscape 5.0', null, null, json_encode(['description' => 'Closing application: Word']), date('Y-m-d H:i:s', time() - 7200)]);
$legacy->execute(['Terminal Command', 'react', 's3', '198.51.100.1, 203.0.113.9', null, null, null, null, null, null, null, json_encode(['command' => 'ls']), date('Y-m-d H:i:s', time() - 100 * 86400)]);
$pdo->exec("INSERT INTO email_logs (id, sender, recipient, subject, body, status, ip_address) VALUES ('m1', 'jo@example.com', 'me@example.com', 'Hi', 'Hello', 'sent', '198.51.100.77')");

$done = schema_tidy($pdo, $apps);
$rows = $pdo->query('SELECT * FROM event_logs ORDER BY session_id')->fetchAll();
check('tidy: deletes rows past the retention period', count($rows) === 2 && $done['purged'] === 1);
check('tidy: shortens IPv4 addresses', $rows[0]['ip'] === '198.51.100.0');
check('tidy: shortens IPv6 addresses', $rows[1]['ip'] === '2001:db8:abcd::');
check('tidy: removes location and provider', $rows[0]['country'] === null && $rows[0]['city'] === null && $rows[0]['isp'] === null);
check('tidy: re-reads the OS and browser from the user agent', $rows[0]['os'] === 'iOS' && $rows[0]['browser'] === 'Safari');
check('tidy: then removes the user agent', $rows[0]['user_agent'] === null);
check('tidy: renames browsers it cannot re-read', $rows[1]['browser'] === 'Other');
check('tidy: fills in the app for older events', $rows[0]['app'] === 'flstudio' && $rows[1]['app'] === 'word');
check('tidy: shortens addresses on enquiries', $pdo->query("SELECT ip_address FROM email_logs WHERE id = 'm1'")->fetchColumn() === '198.51.100.0');
check('tidy: can run again', is_array(schema_tidy($pdo, $apps)));

// telemetry_summary and telemetry_daily_jobs
$pdo->exec('DELETE FROM event_logs');
$at = $pdo->prepare('INSERT INTO event_logs (action, source, session_id, ip, app, created_at) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?))');
$midnight = (new DateTimeImmutable('today', new DateTimeZone('Europe/London')))->getTimestamp();
$yesterday = $midnight - 86400;
$at->execute(['System: Information', 'php', 'a', '203.0.113.0', 'word', $yesterday + 3600]);
$at->execute(['System: Information', 'php', 'a', '203.0.113.0', 'excel', $yesterday + 7200]);
$at->execute(['Terminal Command', 'react', 'b', '203.0.113.0', 'terminal', $yesterday + 9000]);
$at->execute(['System: Information', 'react', 'c', '203.0.113.0', 'word', $midnight + 60]);
$at->execute(['System: Information', 'react', 'd', '203.0.113.0', 'word', time() - 91 * 86400]);

$summary = telemetry_summary($pdo, $yesterday, $midnight);
check('summary: counts only the period', $summary['total'] === 3);
check('summary: counts visits', $summary['sessions'] === 2);
check('summary: splits the builds', $summary['by_source'] === ['php' => 2, 'react' => 1]);
check('summary: counts apps', ($summary['by_app']['word'] ?? 0) === 1 && ($summary['by_app']['terminal'] ?? 0) === 1);
check('summary: counts events', ($summary['by_action']['System: Information'] ?? 0) === 2);

$stateDir = sys_get_temp_dir() . '/db_test_' . bin2hex(random_bytes(6));
mkdir($stateDir);
$sent = [];
$send = function (string $subject, string $body) use (&$sent): void { $sent[] = [$subject, $body]; };
telemetry_daily_jobs($pdo, $stateDir, time(), $send);
check('daily: sends one digest', count($sent) === 1);
check('daily: the digest covers yesterday', str_contains($sent[0][1], 'Events: 3'));
check('daily: the digest holds no addresses', !str_contains($sent[0][1], '203.0.113'));
check('daily: purges old rows', (int)$pdo->query('SELECT COUNT(*) FROM event_logs')->fetchColumn() === 4);
telemetry_daily_jobs($pdo, $stateDir, time() + 60, $send);
check('daily: does nothing more the same day', count($sent) === 1);

$pdo->exec('DROP TABLE IF EXISTS event_logs, email_logs');

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
