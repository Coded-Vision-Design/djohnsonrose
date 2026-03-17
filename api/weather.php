<?php
// api/weather.php
require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

$cacheFile = __DIR__ . '/../data/weather_cache.json';
$cacheTime = 1800; // 30 minutes cache

// Basic rate limiting/caching
if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheTime)) {
    echo file_get_contents($cacheFile);
    exit;
}

// Get IP for rough coordinates if needed, or default to London
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'];
$lat = 51.5074;
$lon = -0.1278;

try {
    $geo = file_get_contents("http://ip-api.com/json/{$ip}?fields=status,lat,lon");
    $geoData = json_decode($geo, true);
    if ($geoData && $geoData['status'] === 'success') {
        $lat = $geoData['lat'];
        $lon = $geoData['lon'];
        $city = $geoData['city'];
    }
} catch (Exception $e) {}

// Fetch weather from Open-Meteo
$apiUrl = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lon}&current_weather=true&timezone=Europe/London";

try {
    $weather = file_get_contents($apiUrl);
    if ($weather) {
        $data = json_decode($weather, true);
        $data['city'] = $city ?? 'London';
        $weather = json_encode($data);
        file_put_contents($cacheFile, $weather);
        echo $weather;
    } else {
        throw new Exception("Empty response");
    }
} catch (Exception $e) {
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Weather service unavailable']);
    }
}
