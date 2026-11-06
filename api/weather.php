<?php
// api/weather.php - current weather for the taskbar in both builds. Always for
// the one place set in config, never the visitor's: no IP address or location
// is looked up or sent anywhere. One cached answer serves every visitor, and
// the cache is keyed by place so it can never serve an answer for another.
// Upstream calls give up after WEATHER_TIMEOUT seconds. See lib/weather.php.

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/state.php';
require_once __DIR__ . '/../lib/weather.php';

header('Content-Type: application/json');

function weather_reply(array $data): void {
    header('Cache-Control: public, max-age=300');
    echo json_encode($data);
    exit;
}

$place = $config['weather'];
$key = weather_cache_key($place);
$file = state_dir($config) . '/weather.json';
$now = time();

$cached = weather_cache_state(state_read($file), $key, $now);
if ($cached['fresh']) {
    weather_reply($cached['data']);
}

if (!$cached['cooling']) {
    $data = http_get_json(weather_url($place), WEATHER_TIMEOUT);
    if (weather_valid($data)) {
        $data['city'] = (string)$place['city'];
        state_update($file, function (array &$state) use ($key, $now, $data): void {
            $state = ['key' => $key, 'fetched_at' => $now, 'data' => $data];
        }, null);
        weather_reply($data);
    }

    // Note the failure, so the next minute of visitors does not wait on it too.
    state_update($file, function (array &$state) use ($key, $now): void {
        if (($state['key'] ?? null) !== $key) $state = ['key' => $key];
        $state['failed_at'] = $now;
    }, null);
}

// An older answer beats none at all.
if ($cached['data'] !== null) {
    weather_reply($cached['data']);
}

http_response_code(503);
header('Cache-Control: no-store');
echo json_encode(['error' => 'Weather service unavailable']);
