<?php
// lib/state.php - small JSON files the server keeps between requests: rate
// limits, once-a-day jobs, admin sign-outs and the weather cache. They live
// outside the web root (the system temp folder unless APP_STATE_DIR names
// another), so no visitor can fetch them and a deploy never wipes them.

/** The folder for state files, created on first use. */
function state_dir(array $config): string {
    $dir = $config['state_dir'] ?? '';
    if (!is_string($dir) || $dir === '') {
        // One folder per install, so two copies of the site never share limits.
        $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'portfolio-os-' . substr(hash('sha256', dirname(__DIR__)), 0, 12);
    }
    $dir = rtrim($dir, '/\\');
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

/**
 * Runs $change on the decoded contents of a JSON file under an exclusive lock,
 * then writes the state back, so two requests can never lose each other's
 * update. $change takes the state by reference and its return value is
 * returned. If the file cannot be opened or locked, $change does not run and
 * $fallback is returned instead.
 */
function state_update(string $path, callable $change, $fallback) {
    $handle = @fopen($path, 'c+');
    if ($handle === false) return $fallback;

    try {
        if (!flock($handle, LOCK_EX)) return $fallback;

        $state = json_decode((string)stream_get_contents($handle), true);
        if (!is_array($state)) $state = [];

        $result = $change($state);

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($state, JSON_UNESCAPED_SLASHES));
        fflush($handle);
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

/**
 * Claims a once-a-day job, so work can run lazily on the first request of a
 * day instead of from cron. Returns the period the job should cover, from the
 * end of its last run (or a day earlier on its first run) to midnight today in
 * $timezone, the first time it is called each day, and null after that. It
 * also returns null when it cannot record the run, so a job is never repeated
 * on every request.
 */
function daily_job_claim(string $dir, string $job, int $now, string $timezone = 'Europe/London'): ?array {
    $midnight = (new DateTimeImmutable('@' . $now))->setTimezone(new DateTimeZone($timezone))->setTime(0, 0);
    $today = $midnight->getTimestamp();
    $yesterday = $midnight->modify('-1 day')->getTimestamp();
    $job = preg_replace('/[^a-z0-9_-]/', '', strtolower($job));

    return state_update(rtrim($dir, '/\\') . "/job-{$job}.json", function (array &$state) use ($today, $yesterday): ?array {
        $last = is_int($state['to'] ?? null) ? $state['to'] : null;
        if ($last !== null && $last >= $today) return null;

        $state['to'] = $today;
        return ['from' => $last ?? $yesterday, 'to' => $today];
    }, null);
}

/** Reads a state file without changing it. A missing or broken file reads as empty. */
function state_read(string $path): array {
    $handle = @fopen($path, 'r');
    if ($handle === false) return [];

    try {
        flock($handle, LOCK_SH);
        $state = json_decode((string)stream_get_contents($handle), true);
        return is_array($state) ? $state : [];
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
