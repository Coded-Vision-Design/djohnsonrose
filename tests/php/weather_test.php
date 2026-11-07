<?php
// tests/php/weather_test.php - unit tests for lib/weather.php.
// Run with: php tests/php/weather_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/weather.php';

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

$place = ['latitude' => 51.87, 'longitude' => 0.56, 'city' => 'Essex'];

// weather_url
$url = weather_url($place);
$query = [];
parse_str((string)parse_url($url, PHP_URL_QUERY), $query);
check('url: goes to Open-Meteo over HTTPS', str_starts_with($url, 'https://api.open-meteo.com/v1/forecast?'));
check('url: asks for the fixed place', $query['latitude'] === '51.87' && $query['longitude'] === '0.56');
check('url: asks for the current weather in London time', $query['current_weather'] === 'true' && $query['timezone'] === 'Europe/London');
check('url: encodes its values', str_contains($url, 'timezone=Europe%2FLondon'));
check('url: carries nothing about the visitor', !preg_match('/ip|addr|forwarded/i', $url));
$odd = weather_url(['latitude' => '1&x=2', 'longitude' => 0, 'city' => 'x']);
check('url: a strange value cannot add a parameter', !str_contains($odd, '&x=2'));

// weather_valid
$good = ['latitude' => 51.87, 'current_weather' => ['temperature' => 9.5, 'weathercode' => 3]];
check('valid: a real answer', weather_valid($good));
check('valid: no current weather', !weather_valid(['latitude' => 1]));
check('valid: not numbers', !weather_valid(['current_weather' => ['temperature' => 'hot', 'weathercode' => 3]]));
check('valid: nothing', !weather_valid(null));

// weather_cache_key
check('key: the same place gives the same key', weather_cache_key($place) === weather_cache_key($place));
check('key: another place gives another key', weather_cache_key($place) !== weather_cache_key(['latitude' => 51.5, 'longitude' => -0.12, 'city' => 'London']));
check('key: a new label gives a new key', weather_cache_key($place) !== weather_cache_key(['city' => 'Braintree'] + $place));

// weather_cache_state
$key = weather_cache_key($place);
$now = 1_800_000_000;
$cache = ['key' => $key, 'fetched_at' => $now - 60, 'data' => $good + ['city' => 'Essex']];
$state = weather_cache_state($cache, $key, $now);
check('cache: a recent answer is fresh', $state['fresh'] && $state['data']['city'] === 'Essex');
$state = weather_cache_state($cache, $key, $now + WEATHER_CACHE_SECONDS);
check('cache: an old answer is stale but kept for emergencies', !$state['fresh'] && $state['data'] !== null);
$state = weather_cache_state($cache, weather_cache_key(['city' => 'London'] + $place), $now);
check('cache: an answer for another place is never used', !$state['fresh'] && $state['data'] === null);
check('cache: an empty cache has nothing', weather_cache_state([], $key, $now) === ['data' => null, 'fresh' => false, 'cooling' => false]);
$state = weather_cache_state(['key' => $key, 'failed_at' => $now - 10], $key, $now);
check('cache: waits a moment after a failure before asking again', $state['cooling']);
check('cache: then asks again', !weather_cache_state(['key' => $key, 'failed_at' => $now - WEATHER_RETRY_SECONDS], $key, $now)['cooling']);
check('cache: a broken entry is ignored', weather_cache_state(['key' => $key, 'data' => 'x', 'fetched_at' => $now], $key, $now)['data'] === null);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
