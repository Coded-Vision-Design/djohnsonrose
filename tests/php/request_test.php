<?php
// tests/php/request_test.php - unit tests for lib/request.php, lib/state.php
// and lib/rate_limit.php.
// Run with: php tests/php/request_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/request.php';
require_once __DIR__ . '/../../lib/rate_limit.php';

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
    $dir = sys_get_temp_dir() . '/request_test_' . bin2hex(random_bytes(6));
    mkdir($dir);
    return $dir;
}

// client_ip
check('ip: uses REMOTE_ADDR', client_ip(['REMOTE_ADDR' => '203.0.113.7']) === '203.0.113.7');
check('ip: accepts IPv6', client_ip(['REMOTE_ADDR' => '2001:db8::1']) === '2001:db8::1');
check('ip: ignores a forged X-Forwarded-For', client_ip(['REMOTE_ADDR' => '203.0.113.7', 'HTTP_X_FORWARDED_FOR' => '198.51.100.1']) === '203.0.113.7');
check('ip: ignores a forged CF-Connecting-IP', client_ip(['REMOTE_ADDR' => '203.0.113.7', 'HTTP_CF_CONNECTING_IP' => '198.51.100.1']) === '203.0.113.7');
check('ip: gives nothing for a missing address', client_ip([]) === '');
check('ip: gives nothing for garbage', client_ip(['REMOTE_ADDR' => '1.2.3.4/../../x']) === '');
check('ip: gives nothing for an array', client_ip(['REMOTE_ADDR' => ['1.2.3.4']]) === '');
$proxied = ['REMOTE_ADDR' => '10.0.0.5', 'HTTP_X_FORWARDED_FOR' => '198.51.100.1, 203.0.113.9'];
check('ip: believes a trusted proxy', client_ip($proxied, ['10.0.0.0/8']) === '203.0.113.9');
check('ip: skips every trusted hop', client_ip(['REMOTE_ADDR' => '10.0.0.5', 'HTTP_X_FORWARDED_FOR' => '203.0.113.9, 10.0.0.9'], ['10.0.0.0/8']) === '203.0.113.9');
check('ip: an untrusted peer cannot use the header', client_ip($proxied, ['192.168.0.0/16']) === '10.0.0.5');
check('ip: falls back when the header is garbage', client_ip(['REMOTE_ADDR' => '10.0.0.5', 'HTTP_X_FORWARDED_FOR' => 'nonsense'], ['10.0.0.0/8']) === '10.0.0.5');

// ip_in_ranges
check('range: exact match', ip_in_ranges('203.0.113.7', ['203.0.113.7']));
check('range: IPv4 CIDR', ip_in_ranges('203.0.113.7', ['203.0.113.0/24']) && !ip_in_ranges('203.0.114.7', ['203.0.113.0/24']));
check('range: odd prefix length', ip_in_ranges('203.0.113.130', ['203.0.113.128/25']) && !ip_in_ranges('203.0.113.7', ['203.0.113.128/25']));
check('range: IPv6 CIDR', ip_in_ranges('2001:db8:1::5', ['2001:db8::/32']) && !ip_in_ranges('2001:db9::5', ['2001:db8::/32']));
check('range: a bad prefix matches nothing', !ip_in_ranges('203.0.113.7', ['0.0.0.0/abc']));
check('range: families never mix', !ip_in_ranges('::1', ['0.0.0.0/0']));

// ip_truncate
check('truncate: IPv4 keeps the /24', ip_truncate('203.0.113.77') === '203.0.113.0');
check('truncate: IPv6 keeps the /48', ip_truncate('2001:db8:abcd:1234:5678::1') === '2001:db8:abcd::');
check('truncate: IPv4-mapped IPv6 is treated as IPv4', ip_truncate('::ffff:203.0.113.77') === '203.0.113.0');
check('truncate: is stable', ip_truncate(ip_truncate('198.51.100.200')) === '198.51.100.0');
check('truncate: garbage gives nothing', ip_truncate('198.51.100.1, 203.0.113.9') === '' && ip_truncate('') === '');

// request_same_origin
$site = ['HTTP_HOST' => 'devante.johnson-rose.co.uk'];
check('origin: same host', request_same_origin($site + ['HTTP_ORIGIN' => 'https://devante.johnson-rose.co.uk']));
check('origin: ignores ports, for the dev proxy', request_same_origin(['HTTP_HOST' => 'localhost:8781', 'HTTP_ORIGIN' => 'http://localhost:5181']));
check('origin: refuses another site', !request_same_origin($site + ['HTTP_ORIGIN' => 'https://evil.example']));
check('origin: refuses a lookalike', !request_same_origin($site + ['HTTP_ORIGIN' => 'https://devante.johnson-rose.co.uk.evil.example']));
check('origin: refuses an opaque origin', !request_same_origin($site + ['HTTP_ORIGIN' => 'null']));
check('origin: falls back to Sec-Fetch-Site', request_same_origin($site + ['HTTP_SEC_FETCH_SITE' => 'same-origin']));
check('origin: refuses a cross-site fetch', !request_same_origin($site + ['HTTP_SEC_FETCH_SITE' => 'cross-site']));
check('origin: refuses a sibling subdomain', !request_same_origin($site + ['HTTP_SEC_FETCH_SITE' => 'same-site']));
check('origin: allows a client that is not a browser', request_same_origin($site));

// request_is_local
check('local: localhost', request_is_local(['HTTP_HOST' => 'localhost']));
check('local: localhost with a port', request_is_local(['HTTP_HOST' => 'localhost:8781']));
check('local: 127.0.0.1 with a port', request_is_local(['HTTP_HOST' => '127.0.0.1:8799']));
check('local: the live site is not', !request_is_local(['HTTP_HOST' => 'devante.johnson-rose.co.uk']));
check('local: a lookalike is not', !request_is_local(['HTTP_HOST' => 'localhost.evil.example']));
check('local: no host is not', !request_is_local([]));

// request_string
check('string: reads a string', request_string(['name' => 'word'], 'name') === 'word');
check('string: missing is null', request_string([], 'name') === null);
check('string: an array is null, not a crash', request_string(['name' => ['x']], 'name') === null);

// read_request_body
$file = tempnam(sys_get_temp_dir(), 'body');
file_put_contents($file, str_repeat('a', 100));
check('body: reads a small body', read_request_body(100, $file) === str_repeat('a', 100));
check('body: refuses one byte too many', read_request_body(99, $file) === null);
check('body: a missing source reads as empty', read_request_body(10, $file . '.missing') === '');
unlink($file);

// state_update and state_read
$dir = tempDir();
$path = $dir . '/state.json';
check('state: missing file reads as empty', state_read($path) === []);
$result = state_update($path, function (array &$s) { $s['n'] = ($s['n'] ?? 0) + 1; return $s['n']; }, 'fallback');
check('state: update returns the result', $result === 1);
state_update($path, function (array &$s) { $s['n']++; return null; }, null);
check('state: update persists', state_read($path) === ['n' => 2]);
check('state: falls back when storage is unavailable', state_update($dir . '/no/such/dir/x.json', fn(array &$s) => 'ran', 'fallback') === 'fallback');
file_put_contents($path, 'not json');
check('state: a broken file reads as empty', state_read($path) === []);
check('state: the folder is outside the site', !str_starts_with(state_dir([]), realpath(__DIR__ . '/../..')));
check('state: the folder can be configured', state_dir(['state_dir' => $dir . '/custom']) === $dir . '/custom' && is_dir($dir . '/custom'));

// rate_limit_allow
$dir = tempDir();
$now = 1_800_000_000;
$allowed = 0;
for ($i = 0; $i < 6; $i++) {
    if (rate_limit_allow($dir, 'admin-auth', '203.0.113.1', 5, 900, $now + $i)) $allowed++;
}
check('limit: allows five then refuses the sixth', $allowed === 5);
check('limit: other visitors are unaffected', rate_limit_allow($dir, 'admin-auth', '203.0.113.2', 5, 900, $now + 10));
check('limit: buckets are separate', rate_limit_allow($dir, 'telemetry', '203.0.113.1', 5, 900, $now + 10));
check('limit: still refused inside the window', !rate_limit_allow($dir, 'admin-auth', '203.0.113.1', 5, 900, $now + 899));
check('limit: resets after the window', rate_limit_allow($dir, 'admin-auth', '203.0.113.1', 5, 900, $now + 901));
$stored = (string)file_get_contents($dir . '/rate-admin-auth.json');
check('limit: stores no raw IP addresses', !str_contains($stored, '203.0.113.1'));
rate_limit_allow($dir, 'admin-auth', '203.0.113.50', 5, 900, $now + 5000);
check('limit: forgets visitors whose window has passed', count(state_read($dir . '/rate-admin-auth.json')) === 1);
check('limit: a strange bucket name cannot leave the folder', rate_limit_allow($dir, '../../x', 'k', 1, 60, $now) && is_file($dir . '/rate-x.json'));
check('limit: stays open if storage is unavailable', rate_limit_allow($dir . '/does/not/exist', 'x', 'k', 1, 60, $now));
check('limit: a limit of zero refuses everything', !rate_limit_allow($dir, 'zero', 'k', 0, 60, $now));

// rate_limit_daily_allow
$dir = tempDir();
$ok = 0;
for ($i = 0; $i < 12; $i++) {
    if (rate_limit_daily_allow($dir, 'telemetry', 10, $now + $i)) $ok++;
}
check('daily: stops at the cap', $ok === 10);
check('daily: clears the next day', rate_limit_daily_allow($dir, 'telemetry', 10, $now + 86400));
check('daily: stays open if storage is unavailable', rate_limit_daily_allow($dir . '/nope/nope', 'telemetry', 1, $now));

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
