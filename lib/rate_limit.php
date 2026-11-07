<?php
// lib/rate_limit.php - the one limiter for every endpoint that needs one
// (telemetry, admin sign-in). Visitors are stored as hashes, never as raw IP
// addresses, and only until their window has passed. If storage is
// unavailable the limiter stays open: a missed limit is better than locking
// every visitor out. See tests/php/request_test.php.

require_once __DIR__ . '/state.php';

function rate_limit_file(string $dir, string $prefix, string $bucket): string {
    $bucket = preg_replace('/[^a-z0-9_-]/', '', strtolower($bucket));
    return rtrim($dir, '/\\') . "/{$prefix}-{$bucket}.json";
}

/**
 * Allows at most $limit hits in any $window seconds for $key within $bucket,
 * and records the hit when it is allowed.
 */
function rate_limit_allow(string $dir, string $bucket, string $key, int $limit, int $window, int $now): bool {
    $id = hash('sha256', $key);

    return state_update(rate_limit_file($dir, 'rate', $bucket), function (array &$state) use ($id, $limit, $window, $now): bool {
        // Forget every visitor whose window has passed, so the file stays small.
        foreach ($state as $visitor => $hits) {
            $recent = array_values(array_filter(
                is_array($hits) ? $hits : [],
                fn($t) => is_int($t) && $t > $now - $window
            ));
            if ($recent === []) {
                unset($state[$visitor]);
            } else {
                $state[$visitor] = $recent;
            }
        }

        $hits = $state[$id] ?? [];
        if (count($hits) >= $limit) return false;

        $hits[] = $now;
        $state[$id] = $hits;
        return true;
    }, true);
}

/** A ceiling per calendar day (UTC) across all visitors, as a backstop against a flood from many addresses. */
function rate_limit_daily_allow(string $dir, string $bucket, int $cap, int $now): bool {
    return state_update(rate_limit_file($dir, 'daily', $bucket), function (array &$state) use ($cap, $now): bool {
        $day = intdiv($now, 86400);
        if (($state['day'] ?? null) !== $day) {
            $state = ['day' => $day, 'count' => 0];
        }
        if ($state['count'] >= $cap) return false;

        $state['count']++;
        return true;
    }, true);
}
