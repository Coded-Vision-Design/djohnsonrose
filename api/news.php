<?php
// api/news.php
header('Content-Type: application/json');

$winsFile = __DIR__ . '/../data/client_wins.json';

if (file_exists($winsFile)) {
    echo file_get_contents($winsFile);
} else {
    echo json_encode([
        'news' => [
            [
                'title' => 'Client Wins: Coming Soon',
                'link' => '#',
                'description' => 'Stay tuned for more success stories from our clients.',
                'pubDate' => date('r')
            ]
        ]
    ]);
}
