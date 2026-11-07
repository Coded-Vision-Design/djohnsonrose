<?php
// tests/php/email_logs_test.php - unit tests for keeping contact-form messages
// (email_logs) for 12 months: email_logs_purge in lib/telemetry_db.php. They
// run on an in-memory SQLite database with FROM_UNIXTIME standing in for
// MySQL's, in UTC, so they need no server; tests/php/db_test.php runs the same
// purge, the daily job and schema_tidy against MySQL.
// Run with: php tests/php/email_logs_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/telemetry_db.php';

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

check('retention: messages are kept for 12 months', EMAIL_LOG_RETENTION_DAYS === 365);

if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    echo "Skipped the database checks: this PHP has no pdo_sqlite.\n";
    echo "{$passes} passed, {$failures} failed\n";
    exit($failures === 0 ? 0 : 1);
}

/** A database with email_logs as lib/schema.php makes it, or with no tables at all. */
function messages_db(bool $withTable = true): PDO {
    $fromUnixtime = fn($seconds) => gmdate('Y-m-d H:i:s', (int)$seconds);
    // PHP 8.4 moved SQLite's own methods to Pdo\Sqlite; older versions keep them on PDO.
    if (class_exists('Pdo\Sqlite')) {
        $pdo = Pdo\Sqlite::connect('sqlite::memory:');
        $pdo->createFunction('FROM_UNIXTIME', $fromUnixtime, 1);
    } else {
        $pdo = new PDO('sqlite::memory:');
        $pdo->sqliteCreateFunction('FROM_UNIXTIME', $fromUnixtime, 1);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($withTable) {
        $pdo->exec('CREATE TABLE email_logs (id TEXT PRIMARY KEY, sender TEXT, recipient TEXT, subject TEXT,
            body TEXT, status TEXT, ip_address TEXT, created_at TEXT)');
    }
    return $pdo;
}

/** Stores a message sent $age seconds before $now. */
function message_at(PDO $pdo, string $id, int $now, int $age): void {
    $stmt = $pdo->prepare("INSERT INTO email_logs VALUES (?, 'jo@example.com', 'me@example.com', 'Hi', 'Hello', 'sent', '198.51.100.0', FROM_UNIXTIME(?))");
    $stmt->execute([$id, $now - $age]);
}

$ids = fn(PDO $pdo) => $pdo->query('SELECT id FROM email_logs ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
$now = 1_794_000_000;
$day = 86400;

// Happy path: messages past 12 months go, newer ones stay.
$pdo = messages_db();
message_at($pdo, 'a-today', $now, 0);
message_at($pdo, 'b-six-months', $now, 182 * $day);
message_at($pdo, 'c-two-years', $now, 730 * $day);
message_at($pdo, 'd-thirteen-months', $now, 395 * $day);
check('purge: says how many went', email_logs_purge($pdo, $now) === 2);
check('purge: keeps messages under 12 months old', $ids($pdo) === ['a-today', 'b-six-months']);
check('purge: running again removes nothing more', email_logs_purge($pdo, $now) === 0 && $ids($pdo) === ['a-today', 'b-six-months']);

// Edge: a message exactly 365 days old is not yet older than 365 days.
$pdo = messages_db();
message_at($pdo, 'a-exactly', $now, 365 * $day);
message_at($pdo, 'b-a-second-more', $now, 365 * $day + 1);
check('purge: keeps a message exactly 365 days old', email_logs_purge($pdo, $now) === 1 && $ids($pdo) === ['a-exactly']);
check('purge: a day later it goes', email_logs_purge($pdo, $now + $day) === 1 && $ids($pdo) === []);

// Edge: nothing to delete, a shorter period when asked for one, and never less than a day.
$pdo = messages_db();
check('purge: an empty table is fine', email_logs_purge($pdo, $now) === 0);
message_at($pdo, 'a-two-days', $now, 2 * $day);
message_at($pdo, 'b-two-hours', $now, 7200);
check('purge: takes a shorter period', email_logs_purge($pdo, $now, 1) === 1 && $ids($pdo) === ['b-two-hours']);
check('purge: a period under a day counts as a day', email_logs_purge($pdo, $now, 0) === 0 && $ids($pdo) === ['b-two-hours']);

// Error: with no table, it throws for the caller to deal with, and makes none.
$pdo = messages_db(false);
$threw = false;
try {
    email_logs_purge($pdo, $now);
} catch (PDOException $e) {
    $threw = true;
}
check('purge: a missing table throws', $threw);
check('purge: the table is not created on the way', $pdo->query("SELECT name FROM sqlite_master WHERE name = 'email_logs'")->fetch() === false);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
