<?php
// tests/php/activity_test.php - unit tests for lib/activity.php, the recent
// changes in Widgets, with GitHub stubbed, then a few checks through PHP's
// built-in server that never reach GitHub either.
// Run with: php tests/php/activity_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/state.php';
require_once __DIR__ . '/../../lib/request.php';
require_once __DIR__ . '/../../lib/activity.php';

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

/** A commit as GitHub's list commits API sends it, full of things the widget must never pass on. */
function gh_commit(string $label, string $message, string $date, array $extra = []): array {
    $sha = sha1($label);
    $repo = 'https://api.github.com/repos/Coded-Vision-Design/djohnsonrose';
    return array_replace_recursive([
        'sha' => $sha,
        'node_id' => 'C_kwDOexample' . substr($sha, 0, 8),
        'commit' => [
            'author' => ['name' => 'Coded Vision Design', 'email' => 'contact@codedvisiondesign.co.uk', 'date' => $date],
            'committer' => ['name' => 'GitHub', 'email' => 'noreply@github.com', 'date' => $date],
            'message' => $message,
            'tree' => ['sha' => sha1("tree {$label}"), 'url' => "{$repo}/git/trees/" . sha1("tree {$label}")],
            'url' => "{$repo}/git/commits/{$sha}",
            'comment_count' => 0,
            'verification' => ['verified' => true, 'reason' => 'valid', 'signature' => null, 'payload' => null],
        ],
        'url' => "{$repo}/commits/{$sha}",
        'html_url' => "https://github.com/Coded-Vision-Design/djohnsonrose/commit/{$sha}",
        'comments_url' => "{$repo}/commits/{$sha}/comments",
        'author' => ['login' => 'CodedVisionDesign', 'id' => 101, 'html_url' => 'https://github.com/CodedVisionDesign', 'type' => 'User'],
        'committer' => ['login' => 'web-flow', 'id' => 19864447, 'html_url' => 'https://github.com/web-flow', 'type' => 'User'],
        'parents' => [['sha' => sha1("parent {$label}"), 'url' => "{$repo}/commits/" . sha1("parent {$label}")]],
    ], $extra);
}

function dependabot(array $commit): array {
    return array_replace_recursive($commit, [
        'commit' => ['author' => ['name' => 'dependabot[bot]', 'email' => '49699333+dependabot[bot]@users.noreply.github.com']],
        'author' => ['login' => 'dependabot[bot]', 'id' => 49699333, 'html_url' => 'https://github.com/apps/dependabot', 'type' => 'Bot'],
    ]);
}

function merge(array $commit): array {
    $commit['parents'][] = ['sha' => sha1('other side'), 'url' => 'https://api.github.com/repos/Coded-Vision-Design/djohnsonrose/commits/' . sha1('other side')];
    return $commit;
}

// The answer GitHub gives, newest first, with everything the widget drops mixed in.
$github = [
    merge(gh_commit('m1', "Merge pull request #71 from Coded-Vision-Design/review-fixes\n\nfix the review findings", '2026-11-06T18:00:00Z')),
    gh_commit('c1', "test: the FL Studio mute test waits for the audio\n\nLonger body that is never shown.", '2026-11-06T17:00:00Z'),
    dependabot(gh_commit('d1', "chore(deps-dev): bump the patch-and-minor group in /v2 with 7 updates (#70)\n\nSigned-off-by: dependabot[bot] <support@github.com>", '2026-11-06T16:00:00Z')),
    gh_commit('c2', "fix: the last review items that need no decision from the owner\r\n\r\nWindows line endings.", '2026-11-06T15:00:00Z'),
    gh_commit('c3', 'ci: run the browser tests on Linux (#69) [skip ci]', '2026-11-05T12:00:00Z'),
    gh_commit('c4', 'docs: point the README at https://github.com/Coded-Vision-Design/djohnsonrose', '2026-11-05T11:00:00Z'),
    gh_commit('c5', 'fix: what Site checks found on Linux', '2026-11-04T10:00:00Z'),
    gh_commit('c6', 'feat: share the file system, search and menus across both builds (#67)', '2026-11-03T09:00:00Z'),
    gh_commit('c7', 'fix: share one app list across both builds', '2026-11-02T09:00:00Z'),
];
$owner = ['Coded', 'codedvision', 'djohnsonrose', 'github', 'http', '@', 'dependabot', 'web-flow', 'GitHub', 'login', 'author', 'email', 'html_url'];

// ---- activity_url and activity_headers ----
$url = activity_url();
$query = [];
parse_str((string)parse_url($url, PHP_URL_QUERY), $query);
check('url: asks GitHub over HTTPS for this repository', str_starts_with($url, 'https://api.github.com/repos/' . ACTIVITY_REPOSITORY . '/commits?'));
check('url: asks for main, with room to drop what is not shown', ($query['sha'] ?? null) === 'main' && (int)($query['per_page'] ?? 0) > ACTIVITY_SHOWN * 2);
check('url: carries nothing about the visitor', !preg_match('/ip|addr|forwarded/i', $url));
$odd = activity_url('a/b?x=1', 'main&per_page=1');
$oddQuery = [];
parse_str((string)parse_url($odd, PHP_URL_QUERY), $oddQuery);
check('url: a strange name cannot add a parameter', ($oddQuery['sha'] ?? null) === 'main&per_page=1' && !isset($oddQuery['x']) && (int)($oddQuery['per_page'] ?? 0) === ACTIVITY_PER_PAGE);
$headers = activity_headers();
check('headers: names the site, as GitHub refuses a request without a User-Agent', (bool)preg_grep('/^User-Agent: \S+/', $headers));
check('headers: sends no token', !preg_grep('/^Authorization:/i', $headers));

// ---- activity_line ----
check('line: only the first line', activity_line("fix: one\n\ntwo") === 'fix: one');
check('line: Windows line endings', activity_line("fix: one\r\nbody") === 'fix: one');
check('line: drops [skip ci] and the pull request number', activity_line('fix(deps): restore it (#69) [skip ci]') === 'fix(deps): restore it');
check('line: drops [ci skip] in any case', activity_line('docs: tidy [CI SKIP]') === 'docs: tidy');
check('line: tidies spaces', activity_line("  fix:   too \t many  ") === 'fix: too many');
$long = activity_line('feat: ' . str_repeat('ä', 300));
check('line: a long line is cut short, on a character', mb_strlen($long, 'UTF-8') === ACTIVITY_MESSAGE_LENGTH && str_ends_with($long, '…') && mb_check_encoding($long, 'UTF-8'));
check('line: control characters go', activity_line("fix: bell\x07 and nul\x00") === 'fix: bell and nul');
check('line: nothing left is empty', activity_line(" \n body only") === '');

// ---- activity_from_github: a good answer ----
$commits = activity_from_github($github);
check('good: five commits at most', is_array($commits) && count($commits) === ACTIVITY_SHOWN);
check('good: newest first, in order', array_column($commits ?? [], 'sha') === array_map(fn($l) => substr(sha1($l), 0, 7), ['c1', 'c2', 'c3', 'c5', 'c6']));
check('good: the first line only', ($commits[0]['message'] ?? null) === 'test: the FL Studio mute test waits for the audio');
check('good: only a message, short SHA and date', array_keys($commits[0] ?? []) === ['message', 'sha', 'date']);
check('good: a short SHA of seven', (bool)preg_match('/^[0-9a-f]{7}$/', $commits[0]['sha'] ?? ''));
check('good: the date in UTC', ($commits[0]['date'] ?? null) === '2026-11-06T17:00:00Z');
check('good: the message is tidied', ($commits[2]['message'] ?? null) === 'ci: run the browser tests on Linux');

// ---- activity_from_github: what it drops ----
$messages = array_column($commits ?? [], 'message');
check('filter: drops merge commits', !preg_grep('/^Merge/', $messages));
check('filter: drops a merge it can only tell by its message', activity_from_github([gh_commit('m2', "Merge branch 'main' into feature", '2026-11-01T00:00:00Z', ['parents' => null])]) === null);
check('filter: drops Dependabot', !preg_grep('/bump the patch/', $messages));
check('filter: drops Dependabot named only in the commit', activity_from_github([array_replace_recursive(gh_commit('d2', 'chore: bump x', '2026-11-01T00:00:00Z'), ['author' => null, 'commit' => ['author' => ['name' => 'dependabot[bot]']]])]) === null);
check('filter: drops a line naming the account or linking anywhere', !preg_grep('/github|README/i', $messages));
check('filter: drops a line naming the account without a link', activity_from_github([gh_commit('o1', 'chore: rename CodedVisionDesign things', '2026-11-01T00:00:00Z')]) === null);
check('filter: drops a line naming the repository', activity_from_github([gh_commit('o2', 'docs: the djohnsonrose readme', '2026-11-01T00:00:00Z')]) === null);
check('filter: drops a line with an email address', activity_from_github([gh_commit('o3', 'fix: mail someone@example.com', '2026-11-01T00:00:00Z')]) === null);
check('filter: keeps a package name', activity_from_github([gh_commit('k1', 'fix(deps): bump @babel/core to 7.29.6', '2026-11-01T00:00:00Z')])[0]['message'] === 'fix(deps): bump @babel/core to 7.29.6');
$sorted = activity_from_github([gh_commit('s1', 'fix: older', '2026-10-01T00:00:00Z'), gh_commit('s2', 'fix: newer', '2026-10-02T00:00:00+01:00')]);
check('filter: newest first whatever order GitHub sends, with offsets in UTC', array_column($sorted ?? [], 'message') === ['fix: newer', 'fix: older'] && $sorted[0]['date'] === '2026-10-01T23:00:00Z');

// ---- activity_from_github: malformed data ----
check('malformed: nothing', activity_from_github(null) === null);
check('malformed: GitHub saying no', activity_from_github(['message' => 'API rate limit exceeded', 'documentation_url' => 'https://docs.github.com']) === null);
check('malformed: an empty list', activity_from_github([]) === null);
check('malformed: a list of junk', activity_from_github(['x', 1, null, ['sha' => 5]]) === null);
check('malformed: a bad SHA is skipped', activity_from_github([gh_commit('b1', 'fix: a', '2026-11-01T00:00:00Z', ['sha' => 'not-a-sha'])]) === null);
check('malformed: a bad date is skipped', activity_from_github([gh_commit('b2', 'fix: a', 'tomorrow')]) === null);
check('malformed: a missing message is skipped', activity_from_github([gh_commit('b3', '', '2026-11-01T00:00:00Z', ['commit' => ['message' => ['x']]])]) === null);
$mixed = activity_from_github([['sha' => 5], gh_commit('g1', 'fix: good', '2026-11-01T00:00:00Z'), 'junk']);
check('malformed: the good ones in a mixed list still show', array_column($mixed ?? [], 'message') === ['fix: good']);

// ---- Nothing identifying the owner leaves the server ----
$out = json_encode(activity_from_github($github));
foreach ($owner as $word) {
    check("private: the answer never holds \"{$word}\"", stripos($out, $word) === false);
}

// ---- activity_valid ----
check('valid: a good list', activity_valid($commits));
check('valid: an empty list is not an answer', !activity_valid([]));
check('valid: an extra field is refused', !activity_valid([['message' => 'a', 'sha' => 'abcdef1', 'date' => '2026-11-01T00:00:00Z', 'author' => 'x']]));
check('valid: a bad SHA is refused', !activity_valid([['message' => 'a', 'sha' => 'xyz', 'date' => '2026-11-01T00:00:00Z']]));
check('valid: not a list', !activity_valid('x'));

// ---- activity_cache_state ----
$key = activity_cache_key(ACTIVITY_REPOSITORY, ACTIVITY_BRANCH);
$now = 1_800_000_000;
$cache = ['key' => $key, 'fetched_at' => $now - 60, 'data' => $commits];
$state = activity_cache_state($cache, $key, $now);
check('cache: a recent answer is fresh', $state['fresh'] && $state['data'] === $commits);
$state = activity_cache_state($cache, $key, $now + ACTIVITY_CACHE_SECONDS);
check('cache: an old answer is stale but kept for when GitHub is down', !$state['fresh'] && $state['data'] === $commits);
check('cache: an answer for another repository is never used', activity_cache_state($cache, activity_cache_key('someone/else', 'main'), $now)['data'] === null);
check('cache: an empty cache has nothing', activity_cache_state([], $key, $now) === ['data' => null, 'fresh' => false, 'cooling' => false]);
check('cache: waits after a failure before asking again', activity_cache_state(['key' => $key, 'failed_at' => $now - 10], $key, $now)['cooling']);
check('cache: then asks again', !activity_cache_state(['key' => $key, 'failed_at' => $now - ACTIVITY_RETRY_SECONDS], $key, $now)['cooling']);
check('cache: a broken entry is ignored', activity_cache_state(['key' => $key, 'data' => [['author' => 'x']], 'fetched_at' => $now], $key, $now)['data'] === null);

// ---- activity_answer: the whole endpoint, with GitHub stubbed ----
$dir = sys_get_temp_dir() . '/activity_test_' . bin2hex(random_bytes(4));
mkdir($dir);
$file = "{$dir}/activity.json";
$calls = 0;
$up = function () use (&$calls, $github) { $calls++; return $github; };
$down = function () use (&$calls) { $calls++; return null; };
$junk = function () use (&$calls) { $calls++; return ['message' => 'Not Found']; };

$answer = activity_answer($file, $now, $up);
check('answer: a good answer from GitHub', $answer['status'] === 200 && $answer['body'] === ['commits' => $commits] && $calls === 1);
check('answer: is kept on the server', (state_read($file)['data'] ?? null) === $commits);
check('answer: the cache holds nothing identifying either', !preg_match('/coded|github|dependabot|@/i', (string)file_get_contents($file)));

$answer = activity_answer($file, $now + 60, $up);
check('cache hit: answers without asking GitHub', $answer['status'] === 200 && $answer['body'] === ['commits' => $commits] && $calls === 1);

$answer = activity_answer($file, $now + ACTIVITY_CACHE_SECONDS, $down);
check('down with a cached answer: serves the last good one', $answer['status'] === 200 && $answer['body'] === ['commits' => $commits] && $calls === 2);
$answer = activity_answer($file, $now + ACTIVITY_CACHE_SECONDS + 1, $down);
check('down with a cached answer: does not ask again straight away', $answer['status'] === 200 && $calls === 2);
$answer = activity_answer($file, $now + ACTIVITY_CACHE_SECONDS + ACTIVITY_RETRY_SECONDS, $junk);
check('malformed with a cached answer: still serves the last good one', $answer['status'] === 200 && $answer['body'] === ['commits' => $commits] && $calls === 3);
$answer = activity_answer($file, $now + ACTIVITY_CACHE_SECONDS + 2 * ACTIVITY_RETRY_SECONDS, $up);
check('back up: asks again after the cool-down', $answer['status'] === 200 && $calls === 4);
check('back up: the cache is fresh again', state_read($file)['fetched_at'] === $now + ACTIVITY_CACHE_SECONDS + 2 * ACTIVITY_RETRY_SECONDS);

unlink($file);
$answer = activity_answer($file, $now, $down);
check('down with nothing cached: says so', $answer['status'] === 503 && $answer['body'] === ['error' => 'Recent changes unavailable'] && $calls === 5);
$answer = activity_answer($file, $now + 1, $down);
check('down with nothing cached: does not ask again straight away', $answer['status'] === 503 && $calls === 5);
unlink($file);
$answer = activity_answer($file, $now, $junk);
check('malformed with nothing cached: says so', $answer['status'] === 503 && $calls === 6);

file_put_contents($file, '{not json');
$answer = activity_answer($file, $now, $up);
check('a broken cache file is replaced', $answer['status'] === 200 && (state_read($file)['data'] ?? null) === $commits);
unlink($file);

// ---- Through PHP's built-in server: never reaching GitHub ----

function free_port(): int {
    $socket = stream_socket_server('tcp://127.0.0.1:0');
    $port = (int)substr(strrchr(stream_socket_get_name($socket, false), ':'), 1);
    fclose($socket);
    return $port;
}

/** Starts php -S and waits until it answers. */
function start_server(int $port, string $docroot, string $router, array $env) {
    $log = sys_get_temp_dir() . "/activity_test_{$port}.log";
    $process = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$port}", '-t', $docroot, $router], [1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']], $pipes, $docroot, $env + getenv());
    for ($i = 0; $i < 100; $i++) {
        $probe = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
        if ($probe) {
            fclose($probe);
            return $process;
        }
        usleep(100_000);
    }
    throw new RuntimeException("php -S did not start on port {$port}");
}

function stop_server($process): void {
    $status = proc_get_status($process);
    if (PHP_OS_FAMILY === 'Windows') {
        exec('taskkill /F /T /PID ' . (int)$status['pid'] . ' 2>NUL');
    } else {
        proc_terminate($process);
    }
    proc_close($process);
}

/** Status, headers and body of a GET. */
function fetch(int $port, string $path): array {
    $socket = fsockopen('127.0.0.1', $port, $errno, $errstr, 5);
    fwrite($socket, "GET {$path} HTTP/1.0\r\nHost: localhost:{$port}\r\nConnection: close\r\n\r\n");
    stream_set_timeout($socket, 20);
    $raw = (string)stream_get_contents($socket);
    fclose($socket);
    [$head, $body] = array_pad(explode("\r\n\r\n", $raw, 2), 2, '');
    preg_match('#^HTTP/\S+ (\d{3})#', $head, $m);
    return ['status' => (int)($m[1] ?? 0), 'head' => $head, 'body' => $body];
}

$root = realpath(__DIR__ . '/../..');
$echo = "{$dir}/echo.php";
file_put_contents($echo, '<?php header("Content-Type: application/json"); echo json_encode(getallheaders());');
$port = free_port();
$siteServer = null;
$echoServer = start_server($port, $dir, $echo, []);
try {
    $sent = http_get_json("http://127.0.0.1:{$port}/", 5, activity_headers());
    check('http: sends the extra headers it is given', ($sent['User-Agent'] ?? null) === ACTIVITY_USER_AGENT);
    check('http: still asks for JSON', ($sent['Accept'] ?? null) === 'application/json');
    $plain = http_get_json("http://127.0.0.1:{$port}/", 5);
    check('http: sends none without them', is_array($plain) && !isset($plain['User-Agent']));

    $sitePort = free_port();
    $siteServer = start_server($sitePort, $root, "{$root}/dev-server.php", ['APP_STATE_DIR' => $dir]);
    file_put_contents($file, json_encode(['key' => $key, 'fetched_at' => time(), 'data' => $commits]));
    $r = fetch($sitePort, '/api/activity.php');
    check('endpoint: serves the cached answer', $r['status'] === 200 && json_decode($r['body'], true) === ['commits' => $commits]);
    check('endpoint: answers in JSON', (bool)preg_match('#^Content-Type: application/json#mi', $r['head']));
    check('endpoint: lets browsers keep it a while', (bool)preg_match('#^Cache-Control: public, max-age=\d+#mi', $r['head']));
    file_put_contents($file, json_encode(['key' => $key, 'failed_at' => time()]));
    $started = microtime(true);
    $r = fetch($sitePort, '/api/activity.php');
    check('endpoint: after a failure it answers at once instead of waiting on GitHub', $r['status'] === 503 && microtime(true) - $started < 1.5);
    check('endpoint: a failure is never cached', (bool)preg_match('#^Cache-Control: no-store#mi', $r['head']));
    check('endpoint: says so in JSON', json_decode($r['body'], true) === ['error' => 'Recent changes unavailable']);
} finally {
    stop_server($echoServer);
    if ($siteServer) stop_server($siteServer);
    array_map('unlink', glob("{$dir}/*") ?: []);
    @rmdir($dir);
}

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
