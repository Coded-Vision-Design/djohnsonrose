<?php
// api/activity.php - "Recent changes to this site" in Widgets, in both builds:
// the latest commits on main, each as only its first line, short SHA and date.
// One cached answer serves every visitor, and nothing about a visitor is sent
// to GitHub. Upstream calls give up after ACTIVITY_TIMEOUT seconds. See
// lib/activity.php.

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/request.php';
require_once __DIR__ . '/../lib/activity.php';

header('Content-Type: application/json');

$answer = activity_answer(
    state_dir($config) . '/activity.json',
    time(),
    fn() => http_get_json(activity_url(), ACTIVITY_TIMEOUT, activity_headers())
);

http_response_code($answer['status']);
header($answer['status'] === 200 ? 'Cache-Control: public, max-age=300' : 'Cache-Control: no-store');
echo json_encode($answer['body'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
