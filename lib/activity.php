<?php
// lib/activity.php - "Recent changes to this site" in Widgets, in both builds:
// the latest commits on main, read from GitHub's public API without a token.
// Only each commit's first line, short SHA and date ever leave the server. The
// account, the repository, authors and links are the owner's to keep off the
// site, so they are never passed on, and a line that names them is dropped.
// One cached answer serves every visitor. See tests/php/activity_test.php.

const ACTIVITY_REPOSITORY = 'Coded-Vision-Design/djohnsonrose';
const ACTIVITY_BRANCH = 'main';
const ACTIVITY_SHOWN = 5;
// Enough to fill the list after Dependabot and merges are dropped.
const ACTIVITY_PER_PAGE = 30;
const ACTIVITY_MESSAGE_LENGTH = 120;
const ACTIVITY_CACHE_SECONDS = 1800;
// GitHub allows 60 requests an hour without a token, so a failure waits longer than the weather does.
const ACTIVITY_RETRY_SECONDS = 300;
const ACTIVITY_TIMEOUT = 3;
const ACTIVITY_USER_AGENT = 'portfolio-os-widgets';
// Raised when the shape of a cached answer changes, so an old one is never served.
const ACTIVITY_FORMAT = 1;

function activity_url(string $repository = ACTIVITY_REPOSITORY, string $branch = ACTIVITY_BRANCH): string {
    $path = implode('/', array_map('rawurlencode', explode('/', $repository, 2)));
    return "https://api.github.com/repos/{$path}/commits?" . http_build_query([
        'sha' => $branch,
        'per_page' => ACTIVITY_PER_PAGE,
    ], '', '&', PHP_QUERY_RFC3986);
}

/** GitHub refuses a request without a User-Agent. No token is sent: the repository is public. */
function activity_headers(): array {
    return ['User-Agent: ' . ACTIVITY_USER_AGENT, 'X-GitHub-Api-Version: 2022-11-28'];
}

/**
 * A commit message's first line, ready to show: control characters, CI tags
 * such as [skip ci] and pull request numbers go, spaces are tidied, and a long
 * line is cut short. '' when nothing is left.
 */
function activity_line(string $message): string {
    $line = preg_split('/\R/u', mb_scrub($message, 'UTF-8'), 2)[0] ?? '';
    $line = preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/u', '', str_replace("\t", ' ', $line));
    $line = preg_replace('/\[(skip ci|ci skip|no ci|skip actions|actions skip)\]/i', '', $line);
    $line = preg_replace('/\s*\(#\d+\)/', '', $line);
    $line = trim(preg_replace('/\s+/u', ' ', $line));
    if (mb_strlen($line, 'UTF-8') > ACTIVITY_MESSAGE_LENGTH) {
        $line = rtrim(mb_substr($line, 0, ACTIVITY_MESSAGE_LENGTH - 1, 'UTF-8')) . '…';
    }
    return $line;
}

/** A date from GitHub as UTC ISO 8601, or null when it is not one. */
function activity_date($value): ?string {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/', $value)) return null;
    try {
        return (new DateTimeImmutable($value))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    } catch (Exception $e) {
        return null;
    }
}

/** A merge commit has two parents. Without them, git's own merge messages tell. */
function activity_is_merge(array $commit, string $line): bool {
    $parents = $commit['parents'] ?? null;
    if (is_array($parents) && count($parents) > 1) return true;
    return (bool)preg_match('/^Merge (pull request|branch|remote-tracking branch|tag|commit)\b/', $line);
}

function activity_is_dependabot(array $commit): bool {
    foreach ([$commit['author']['login'] ?? null, $commit['commit']['author']['name'] ?? null, $commit['commit']['author']['email'] ?? null] as $name) {
        if (is_string($name) && stripos($name, 'dependabot') !== false) return true;
    }
    return false;
}

/**
 * Whether a line could point at the owner: it names the account or the
 * repository (however it is spaced or cased), or holds a link, a web address
 * or an email address.
 */
function activity_mentions_owner(string $line, string $repository = ACTIVITY_REPOSITORY): bool {
    if (preg_match('~[a-z][a-z0-9+.-]*://|\bwww\.|[^\s@]+@[^\s@]+\.[^\s@]+|\b[\w-]+\.(com|net|org|io|dev|app|uk)\b~i', $line)) return true;
    $squash = fn(string $text) => preg_replace('/[^a-z0-9]/', '', strtolower($text));
    $flat = $squash($line);
    foreach (explode('/', $repository) as $part) {
        if ($squash($part) !== '' && str_contains($flat, $squash($part))) return true;
    }
    return false;
}

/**
 * The commits to show from GitHub's list commits answer: newest first, at
 * most ACTIVITY_SHOWN, each only ['message', 'sha', 'date']. Merges,
 * Dependabot, broken entries and lines that point at the owner are dropped.
 * Null when the answer is not a list or nothing in it can be shown.
 */
function activity_from_github($data, string $repository = ACTIVITY_REPOSITORY): ?array {
    if (!is_array($data) || !array_is_list($data)) return null;

    $commits = [];
    foreach ($data as $commit) {
        if (!is_array($commit)) continue;
        $sha = $commit['sha'] ?? null;
        $message = $commit['commit']['message'] ?? null;
        $date = activity_date($commit['commit']['committer']['date'] ?? $commit['commit']['author']['date'] ?? null);
        if (!is_string($sha) || !preg_match('/^[0-9a-f]{40}$/', $sha) || !is_string($message) || $date === null) continue;

        $line = activity_line($message);
        if ($line === '' || activity_is_merge($commit, $line) || activity_is_dependabot($commit)) continue;
        if (activity_mentions_owner($line, $repository)) continue;
        $commits[] = ['message' => $line, 'sha' => substr($sha, 0, 7), 'date' => $date];
    }

    // ISO dates in UTC sort as text. usort is stable, so ties keep GitHub's order.
    usort($commits, fn(array $a, array $b) => strcmp($b['date'], $a['date']));
    return $commits === [] ? null : array_slice($commits, 0, ACTIVITY_SHOWN);
}

/** Whether a list is exactly what activity_from_github gives, so a broken cache is never served. */
function activity_valid($list): bool {
    if (!is_array($list) || $list === [] || !array_is_list($list) || count($list) > ACTIVITY_SHOWN) return false;
    foreach ($list as $item) {
        if (!is_array($item) || array_keys($item) !== ['message', 'sha', 'date']) return false;
        if (!is_string($item['message']) || $item['message'] === '') return false;
        if (!is_string($item['sha']) || !preg_match('/^[0-9a-f]{7}$/', $item['sha'])) return false;
        if (!is_string($item['date']) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $item['date'])) return false;
    }
    return true;
}

/** Identifies the repository, branch and answer format, so a cached answer is only used for what it was fetched for. */
function activity_cache_key(string $repository, string $branch): string {
    return hash('sha256', json_encode([$repository, $branch, ACTIVITY_FORMAT]));
}

/**
 * Reads the decoded cache file, as weather_cache_state does: data is the last
 * good answer (null if there is none), fresh says it is recent enough to
 * serve, and cooling says the last fetch failed moments ago.
 */
function activity_cache_state(array $cache, string $key, int $now): array {
    $ours = ($cache['key'] ?? null) === $key;
    $data = $ours && activity_valid($cache['data'] ?? null) ? $cache['data'] : null;
    $fetched = $cache['fetched_at'] ?? null;
    $failed = $cache['failed_at'] ?? null;

    return [
        'data' => $data,
        'fresh' => $data !== null && is_int($fetched) && $now - $fetched < ACTIVITY_CACHE_SECONDS,
        'cooling' => $ours && is_int($failed) && $now - $failed < ACTIVITY_RETRY_SECONDS,
    ];
}

/**
 * What api/activity.php answers, as ['status' => int, 'body' => array]. The
 * cache in $file is used while it is fresh. Otherwise $fetch (which returns
 * GitHub's decoded answer, or null) is asked, unless it failed moments ago,
 * and when GitHub is down or answers nonsense the last good answer is served.
 */
function activity_answer(string $file, int $now, callable $fetch): array {
    $key = activity_cache_key(ACTIVITY_REPOSITORY, ACTIVITY_BRANCH);
    $cached = activity_cache_state(state_read($file), $key, $now);
    if ($cached['fresh']) {
        return ['status' => 200, 'body' => ['commits' => $cached['data']]];
    }

    if (!$cached['cooling']) {
        $commits = activity_from_github($fetch());
        if ($commits !== null) {
            state_update($file, function (array &$state) use ($key, $now, $commits): void {
                $state = ['key' => $key, 'fetched_at' => $now, 'data' => $commits];
            }, null);
            return ['status' => 200, 'body' => ['commits' => $commits]];
        }

        // Note the failure, so the next few minutes of visitors do not wait on it too.
        state_update($file, function (array &$state) use ($key, $now): void {
            if (($state['key'] ?? null) !== $key) $state = ['key' => $key];
            $state['failed_at'] = $now;
        }, null);
    }

    // An older answer beats none at all.
    if ($cached['data'] !== null) {
        return ['status' => 200, 'body' => ['commits' => $cached['data']]];
    }
    return ['status' => 503, 'body' => ['error' => 'Recent changes unavailable']];
}
