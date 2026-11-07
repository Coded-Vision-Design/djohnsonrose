<?php
// lib/telemetry.php - turns a telemetry post from either build into a row for
// event_logs, and writes the once-a-day digest email. Free of database and
// mail calls so it can be unit tested; see tests/php/telemetry_test.php.
// api/log.php wires it together and lib/telemetry_db.php stores the rows.

require_once __DIR__ . '/state.php';

const TELEMETRY_MAX_BYTES = 8192;
const TELEMETRY_RATE_LIMIT = 120;     // events per visitor...
const TELEMETRY_RATE_WINDOW = 600;    // ...in any ten minutes
const TELEMETRY_DAILY_CAP = 5000;     // events a day from everyone together
const TELEMETRY_RETENTION_DAYS = 90;
const TELEMETRY_TIMEZONE = 'Europe/London';

// The only detail fields kept. Anything else a client sends is dropped.
const TELEMETRY_DETAIL_KEYS = ['description', 'name', 'url', 'command', 'path'];
const TELEMETRY_DETAIL_MAX = 200;

function telemetry_line(string $value, int $max): string {
    $value = trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $value));
    return mb_substr($value, 0, $max, 'UTF-8');
}

/**
 * The operating system and browser named by a user agent. Phones and tablets
 * are checked first, as their user agents also mention macOS or Linux, and
 * browsers built on Chrome before Chrome itself, as they all mention it.
 */
function telemetry_user_agent(string $ua): array {
    $os = 'Other';
    if (preg_match('/iPad/', $ua)) $os = 'iPadOS';
    elseif (preg_match('/iPhone|iPod/', $ua)) $os = 'iOS';
    elseif (preg_match('/Android/', $ua)) $os = 'Android';
    elseif (preg_match('/Windows/', $ua)) $os = 'Windows';
    elseif (preg_match('/CrOS/', $ua)) $os = 'Chrome OS';
    elseif (preg_match('/Macintosh|Mac OS X/', $ua)) $os = 'macOS';
    elseif (preg_match('/Linux|X11/', $ua)) $os = 'Linux';

    $browser = 'Other';
    if (preg_match('/bot\b|crawl|spider|slurp|HeadlessChrome|Lighthouse/i', $ua)) $browser = 'Bot';
    elseif (preg_match('/\bEdg(e|A|iOS)?\//', $ua)) $browser = 'Edge';
    elseif (preg_match('/\bOPR\/|\bOPiOS\/|\bOpera\b/', $ua)) $browser = 'Opera';
    elseif (preg_match('/SamsungBrowser\//', $ua)) $browser = 'Samsung Internet';
    elseif (preg_match('/\bFirefox\/|\bFxiOS\//', $ua)) $browser = 'Firefox';
    elseif (preg_match('/\bCriOS\/|\bChrome\/|\bChromium\//', $ua)) $browser = 'Chrome';
    elseif (preg_match('/\bSafari\//', $ua) && preg_match('/\bVersion\/|iPhone|iPad|iPod/', $ua)) $browser = 'Safari';

    return ['os' => $os, 'browser' => $browser];
}

/**
 * The app an event belongs to, as an id from data/apps.json. Clients send it
 * as details.app; events from older clients name the app in their
 * description ("Starting application: Word"), so that is read as well.
 */
function telemetry_app(array $details, array $apps): ?string {
    $ids = array_column($apps, 'id');
    $app = $details['app'] ?? null;
    if (is_string($app)) {
        return in_array($app, $ids, true) ? $app : null;
    }

    $description = $details['description'] ?? null;
    if (!is_string($description) || !preg_match('/^(?:Starting|Closing) application: (.+)$/', $description, $m)) {
        return null;
    }
    $name = strtolower(trim($m[1]));
    foreach ($apps as $entry) {
        if (strtolower((string)($entry['id'] ?? '')) === $name || strtolower((string)($entry['title'] ?? '')) === $name) {
            return (string)$entry['id'];
        }
    }
    return null;
}

/**
 * Validates a decoded telemetry post and keeps only what is stored. Returns
 * null when there is no usable action. The OS and browser come from the
 * request's own User-Agent header, falling back to the one the page sent.
 */
function telemetry_event(array $input, string $userAgent, array $apps): ?array {
    $action = $input['action'] ?? null;
    if (!is_string($action)) return null;
    $action = telemetry_line($action, 120);
    if ($action === '') return null;

    $details = is_array($input['details'] ?? null) ? $input['details'] : [];
    $device = is_array($input['deviceInfo'] ?? null) ? $input['deviceInfo'] : [];

    $source = is_string($details['source'] ?? null) ? strtolower($details['source']) : '';
    if (!in_array($source, ['php', 'react'], true)) $source = 'unknown';

    $session = $details['sessionID'] ?? null;
    if (!is_string($session) || !preg_match('/^[A-Za-z0-9-]{1,64}$/', $session)) $session = 'guest';

    if ($userAgent === '' && is_string($device['userAgent'] ?? null)) {
        $userAgent = $device['userAgent'];
    }
    $agent = telemetry_user_agent(substr($userAgent, 0, 512));

    $resolution = $device['resolution'] ?? null;
    if (!is_string($resolution) || !preg_match('/^\d{1,5}x\d{1,5}$/', $resolution)) $resolution = null;

    $kept = [];
    foreach (TELEMETRY_DETAIL_KEYS as $key) {
        $value = $details[$key] ?? null;
        if (!is_string($value) && !is_int($value)) continue;
        $value = telemetry_line((string)$value, TELEMETRY_DETAIL_MAX);
        // What follows a terminal command can be anything a visitor typed, so
        // only the command's name is kept.
        if ($key === 'command') $value = mb_substr(strtok($value, ' ') ?: '', 0, 40, 'UTF-8');
        if ($value !== '') $kept[$key] = $value;
    }

    return [
        'action' => $action,
        'source' => $source,
        'session_id' => $session,
        'os' => $agent['os'],
        'browser' => $agent['browser'],
        'resolution' => $resolution,
        'app' => telemetry_app($details, $apps),
        'details' => $kept,
    ];
}

function telemetry_date(int $timestamp, string $timezone, string $format): string {
    return (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone($timezone))->format($format);
}

/**
 * The digest email for a period, or null when there was nothing. $summary
 * holds total, sessions, and by_source, by_app and by_action count maps. The
 * email carries counts only: no addresses, no sessions, nothing per visitor.
 */
function telemetry_digest(array $summary, int $from, int $to, string $timezone = TELEMETRY_TIMEZONE): ?array {
    $total = (int)($summary['total'] ?? 0);
    if ($total === 0) return null;

    $first = telemetry_date($from, $timezone, 'j F Y');
    $last = telemetry_date($to - 1, $timezone, 'j F Y');
    $period = $first === $last ? $last : telemetry_date($from, $timezone, 'j F') . ' to ' . $last;

    $builds = ['php' => 'v1 (PHP)', 'react' => 'v2 (React)', 'unknown' => 'Unknown'];
    $list = function (array $counts, ?array $labels = null): string {
        if ($counts === []) return "  None\n";
        $lines = '';
        foreach ($counts as $name => $count) {
            $label = $labels[$name] ?? $name;
            $lines .= '  ' . telemetry_line((string)$label, 120) . ': ' . (int)$count . "\n";
        }
        return $lines;
    };

    $body = "Portfolio OS activity for {$period}\n\n"
        . "Events: {$total}\n"
        . 'Visits: ' . (int)($summary['sessions'] ?? 0) . "\n\n"
        . "By build:\n" . $list($summary['by_source'] ?? [], $builds) . "\n"
        . "By app:\n" . $list($summary['by_app'] ?? []) . "\n"
        . "By event:\n" . $list($summary['by_action'] ?? []) . "\n"
        . "The Admin Console has the full breakdown. This email holds counts only.\n";

    return [
        'subject' => "Portfolio OS daily digest: {$period}",
        'body' => $body,
    ];
}
