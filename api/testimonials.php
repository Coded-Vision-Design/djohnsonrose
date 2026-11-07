<?php
// api/testimonials.php - the Testimonials widget in both builds, from
// data/testimonials.json. An empty list hides the widget. See lib/testimonials.php
// for the file's shape.

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../lib/testimonials.php';

header('Content-Type: application/json');
header('Cache-Control: public, max-age=300');
echo json_encode(['testimonials' => testimonials_load()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
