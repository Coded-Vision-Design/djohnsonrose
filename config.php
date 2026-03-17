<?php
// config.php

function getEnvVar($key, $default = null) {
    // In a real app, use a library like vlucas/phpdotenv
    // For this portable version, we'll check $_ENV and putenv/getenv
    $val = getenv($key);
    if ($val === false) {
        return $default;
    }
    return $val;
}

// Load .env if it exists (very basic parser for portability)
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(sprintf('%s=%s', trim($name), trim($value)));
    }
}

return [
    'email' => getEnvVar('PORTFOLIO_EMAIL', 'devante@johnson-rose.co.uk'),
    'debug' => getEnvVar('APP_DEBUG', 'false') === 'true',
    'env'   => getEnvVar('APP_ENV', 'production'),
    'db'    => [
        'host' => getEnvVar('DB_HOST', 'localhost'),
        'name' => getEnvVar('DB_NAME', 'portfolio_db'),
        'user' => getEnvVar('DB_USER', 'root'),
        'pass' => getEnvVar('DB_PASS', ''),
    ],
    'smtp' => [
        'host' => getEnvVar('SMTP_HOST', 'localhost'),
        'port' => getEnvVar('SMTP_PORT', 25),
        'user' => getEnvVar('MAIL_FROM_ADDRESS', 'no-reply@johnson-rose.co.uk'),
        'pass' => getEnvVar('MAIL_PASSWORD', ''),
        'from' => getEnvVar('MAIL_FROM_ADDRESS', 'no-reply@johnson-rose.co.uk'),
        'name' => getEnvVar('MAIL_FROM_NAME', 'Portfolio OS Notify'),
    ],
    'google_api_key' => getEnvVar('GOOGLE_API_KEY', ''),
    'admin_email' => getEnvVar('ADMIN_EMAIL', 'devante@johnson-rose.co.uk'),
];
