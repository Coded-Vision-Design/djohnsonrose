<?php
// tests/php/telemetry_test.php - unit tests for lib/telemetry.php and the
// once-a-day jobs in lib/state.php.
// Run with: php tests/php/telemetry_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/telemetry.php';
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

function tempDir(): string {
    $dir = sys_get_temp_dir() . '/telemetry_test_' . bin2hex(random_bytes(6));
    mkdir($dir);
    return $dir;
}

// telemetry_user_agent: phones before desktops, real browser names.
$agents = [
    'iPhone Safari' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'iOS', 'Safari'],
    'iPhone Chrome' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1', 'iOS', 'Chrome'],
    'iPhone Firefox' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15', 'iOS', 'Firefox'],
    'iPhone Edge' => ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/126.2592.56 Mobile/15E148 Safari/605.1.15', 'iOS', 'Edge'],
    'iPad Safari' => ['Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', 'iPadOS', 'Safari'],
    'Android Chrome' => ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36', 'Android', 'Chrome'],
    'Android Samsung' => ['Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36', 'Android', 'Samsung Internet'],
    'Android Firefox' => ['Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0', 'Android', 'Firefox'],
    'Windows Edge' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0', 'Windows', 'Edge'],
    'Windows Chrome' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Windows', 'Chrome'],
    'Windows Firefox' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0', 'Windows', 'Firefox'],
    'Windows Opera' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0', 'Windows', 'Opera'],
    'Mac Safari' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'macOS', 'Safari'],
    'Mac Chrome' => ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'macOS', 'Chrome'],
    'Linux Firefox' => ['Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0', 'Linux', 'Firefox'],
    'ChromeOS' => ['Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', 'Chrome OS', 'Chrome'],
    'Headless test browser' => ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36', 'Windows', 'Bot'],
    'Search crawler' => ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'Other', 'Bot'],
];
foreach ($agents as $label => [$ua, $os, $browser]) {
    $parsed = telemetry_user_agent($ua);
    check("agent: {$label} is {$os}", $parsed['os'] === $os);
    check("agent: {$label} is {$browser}", $parsed['browser'] === $browser);
}
check('agent: empty is Other', telemetry_user_agent('') === ['os' => 'Other', 'browser' => 'Other']);
check('agent: never Netscape', telemetry_user_agent('Netscape 5.0 (Windows NT 10.0; Win64; x64)')['browser'] === 'Other');

// telemetry_app
$apps = load_app_manifest()['apps'];
check('app: takes a known id from details.app', telemetry_app(['app' => 'word'], $apps) === 'word');
check('app: ignores an unknown id', telemetry_app(['app' => 'nope'], $apps) === null);
check('app: ignores an array', telemetry_app(['app' => ['word']], $apps) === null);
check('app: reads an older client\'s start event by title', telemetry_app(['description' => 'Starting application: FL Studio 24'], $apps) === 'flstudio');
check('app: reads a close event too', telemetry_app(['description' => 'Closing application: Word'], $apps) === 'word');
check('app: reads an id in the description', telemetry_app(['description' => 'Starting application: calculator'], $apps) === 'calculator');
check('app: a document title is not an app', telemetry_app(['description' => 'Closing application: Untitled - Notepad'], $apps) === null);
check('app: details.app wins over the description', telemetry_app(['app' => 'excel', 'description' => 'Starting application: Word'], $apps) === 'excel');

// telemetry_event
$chrome = $agents['Windows Chrome'][0];
$input = [
    'action' => 'System: Information',
    'details' => [
        'description' => 'Starting application: Word',
        'app' => 'word',
        'sessionID' => '6f1c2a4e-1d2b-4c3d-9e8f-0123456789ab',
        'source' => 'react',
        'secret' => 'dropped',
    ],
    'deviceInfo' => ['os' => 'MacOS', 'browser' => 'Netscape 5.0', 'resolution' => '1920x1080', 'userAgent' => 'ignored'],
];
$event = telemetry_event($input, $chrome, $apps);
check('event: accepts a normal event', is_array($event));
check('event: keeps the action', $event['action'] === 'System: Information');
check('event: keeps the build', $event['source'] === 'react');
check('event: keeps a valid session id', $event['session_id'] === '6f1c2a4e-1d2b-4c3d-9e8f-0123456789ab');
check('event: reads the OS from the real user agent', $event['os'] === 'Windows');
check('event: reads the browser from the real user agent', $event['browser'] === 'Chrome');
check('event: keeps the screen size', $event['resolution'] === '1920x1080');
check('event: records the app', $event['app'] === 'word');
check('event: drops unknown detail fields', !array_key_exists('secret', $event['details']));
check('event: moves the session and build out of details', !array_key_exists('sessionID', $event['details']) && !array_key_exists('source', $event['details']));
check('event: keeps known detail fields', $event['details']['description'] === 'Starting application: Word');

$event = telemetry_event(['action' => 'x', 'deviceInfo' => ['userAgent' => $agents['iPhone Safari'][0]]], '', $apps);
check('event: falls back to the client\'s user agent', $event['os'] === 'iOS' && $event['browser'] === 'Safari');

check('event: refuses a missing action', telemetry_event(['details' => []], $chrome, $apps) === null);
check('event: refuses an empty action', telemetry_event(['action' => '   '], $chrome, $apps) === null);
check('event: refuses an array action', telemetry_event(['action' => ['x']], $chrome, $apps) === null);
check('event: caps the action', mb_strlen(telemetry_event(['action' => str_repeat('a', 500)], $chrome, $apps)['action']) === 120);
check('event: keeps the action on one line', strpbrk(telemetry_event(['action' => "a\r\nb"], $chrome, $apps)['action'], "\r\n") === false);

$event = telemetry_event(['action' => 'x', 'details' => ['source' => 'PHP', 'sessionID' => '<script>']], $chrome, $apps);
check('event: build is case-insensitive', $event['source'] === 'php');
check('event: a strange session id becomes guest', $event['session_id'] === 'guest');
$event = telemetry_event(['action' => 'x', 'details' => ['source' => 'other', 'sessionID' => str_repeat('a', 65)]], $chrome, $apps);
check('event: an unknown build is unknown', $event['source'] === 'unknown');
check('event: an overlong session id becomes guest', $event['session_id'] === 'guest');
check('event: no details is fine', telemetry_event(['action' => 'x', 'details' => 'nope'], $chrome, $apps)['details'] === []);
check('event: a bad screen size is dropped', telemetry_event(['action' => 'x', 'deviceInfo' => ['resolution' => '<b>']], $chrome, $apps)['resolution'] === null);

$event = telemetry_event(['action' => 'Terminal Command', 'details' => ['command' => 'echo my email is jo@example.com', 'path' => 'C:\\Users']], $chrome, $apps);
check('event: keeps only the command name, not what was typed after it', $event['details']['command'] === 'echo');
check('event: keeps the terminal folder', $event['details']['path'] === 'C:\\Users');
$event = telemetry_event(['action' => 'x', 'details' => ['description' => str_repeat('b', 900), 'name' => ['nested']]], $chrome, $apps);
check('event: caps detail text', mb_strlen($event['details']['description']) === 200);
check('event: drops nested detail values', !array_key_exists('name', $event['details']));

// daily_job_claim. 1 July 2026 12:00 in London (BST), so midnight was 23:00 UTC the day before.
$dir = tempDir();
$noon = gmmktime(11, 0, 0, 7, 1, 2026);
$midnight = gmmktime(23, 0, 0, 6, 30, 2026);
$claim = daily_job_claim($dir, 'digest', $noon);
check('daily job: runs the first time', $claim === ['from' => $midnight - 86400, 'to' => $midnight]);
check('daily job: runs once a day', daily_job_claim($dir, 'digest', $noon + 3600) === null);
check('daily job: jobs are separate', daily_job_claim($dir, 'purge', $noon) !== null);
check('daily job: runs again the next day', daily_job_claim($dir, 'digest', $noon + 86400) === ['from' => $midnight, 'to' => $midnight + 86400]);
check('daily job: covers a gap of quiet days', daily_job_claim($dir, 'digest', $noon + 4 * 86400) === ['from' => $midnight + 86400, 'to' => $midnight + 4 * 86400]);
check('daily job: never runs without somewhere to record it', daily_job_claim($dir . '/missing/dir', 'digest', $noon) === null);

// telemetry_digest
check('digest: nothing to send on a quiet day', telemetry_digest(['total' => 0], $midnight - 86400, $midnight) === null);
$summary = [
    'total' => 42,
    'sessions' => 7,
    'by_source' => ['php' => 30, 'react' => 12],
    'by_app' => ['word' => 9, 'calculator' => 3],
    'by_action' => ['System: Information' => 20, 'Terminal Command' => 5],
];
$digest = telemetry_digest($summary, $midnight - 86400, $midnight);
check('digest: names the day', str_contains($digest['subject'], '30 June 2026'));
check('digest: counts events and visits', str_contains($digest['body'], '42') && str_contains($digest['body'], '7'));
check('digest: splits the builds', str_contains($digest['body'], 'v1 (PHP): 30') && str_contains($digest['body'], 'v2 (React): 12'));
check('digest: lists apps', str_contains($digest['body'], 'word: 9'));
check('digest: lists events', str_contains($digest['body'], 'Terminal Command: 5'));
check('digest: contains no IP address', !preg_match('/\d+\.\d+\.\d+\.\d+/', $digest['body'] . $digest['subject']));
check('digest: has a single-line subject', strpbrk($digest['subject'], "\r\n") === false);
$digest = telemetry_digest($summary, $midnight - 3 * 86400, $midnight);
check('digest: names a longer period', str_contains($digest['subject'], '28 June') && str_contains($digest['subject'], '30 June 2026'));

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
