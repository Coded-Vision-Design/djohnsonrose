<?php
// lib/weather.php - the taskbar weather. It is always for one fixed place from
// config (WEATHER_LATITUDE, WEATHER_LONGITUDE, WEATHER_CITY), so nothing
// about a visitor is ever sent to the weather service, and one cached answer
// serves everyone. See tests/php/weather_test.php.

const WEATHER_CACHE_SECONDS = 1800;
const WEATHER_RETRY_SECONDS = 60;
const WEATHER_TIMEOUT = 2;

function weather_url(array $place): string {
    return 'https://api.open-meteo.com/v1/forecast?' . http_build_query([
        'latitude' => (string)$place['latitude'],
        'longitude' => (string)$place['longitude'],
        'current_weather' => 'true',
        'timezone' => 'Europe/London',
    ], '', '&', PHP_QUERY_RFC3986);
}

/** Whether an answer from Open-Meteo has the fields both builds read. */
function weather_valid($data): bool {
    $current = is_array($data) ? ($data['current_weather'] ?? null) : null;
    return is_array($current)
        && is_numeric($current['temperature'] ?? null)
        && is_numeric($current['weathercode'] ?? null);
}

/** Identifies the place, so a cached answer is only ever used for the place it was fetched for. */
function weather_cache_key(array $place): string {
    return hash('sha256', json_encode([(string)$place['latitude'], (string)$place['longitude'], (string)$place['city']]));
}

/**
 * Reads the decoded cache file for the current place. data is the last good
 * answer (null if there is none for this place), fresh says whether it is
 * recent enough to serve, and cooling says the last fetch failed moments ago,
 * so the server should not ask again yet.
 */
function weather_cache_state(array $cache, string $key, int $now): array {
    $ours = ($cache['key'] ?? null) === $key;
    $data = $ours && is_array($cache['data'] ?? null) ? $cache['data'] : null;
    $fetched = $cache['fetched_at'] ?? null;
    $failed = $cache['failed_at'] ?? null;

    return [
        'data' => $data,
        'fresh' => $data !== null && is_int($fetched) && $now - $fetched < WEATHER_CACHE_SECONDS,
        'cooling' => $ours && is_int($failed) && $now - $failed < WEATHER_RETRY_SECONDS,
    ];
}
