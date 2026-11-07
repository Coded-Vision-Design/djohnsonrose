<?php
// tests/php/run.php - runs every tests/php/*_test.php in its own process and
// exits non-zero if any of them fails. Each file still runs on its own too:
// php tests/php/contact_test.php

$failed = [];
foreach (glob(__DIR__ . '/*_test.php') as $file) {
    $name = basename($file);
    $process = proc_open([PHP_BINARY, $file], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__, 2));
    $output = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    $code = proc_close($process);
    echo "{$name}: " . trim($output) . "\n";
    if ($code !== 0) $failed[] = $name;
}

if ($failed !== []) {
    echo 'Failed: ' . implode(', ', $failed) . "\n";
    exit(1);
}
echo "All PHP test files passed.\n";
