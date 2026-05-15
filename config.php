<?php
// config.php — environment loader + structured config.

function getEnvVar($key, $default = null) {
    $val = getenv($key);
    if ($val === false) {
        return $default;
    }
    return $val;
}

// Basic .env loader — supports quoted values, ignores comments / blank lines.
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $trim = trim($line);
        if ($trim === '' || strpos($trim, '#') === 0) continue;
        if (strpos($trim, '=') === false) continue;
        list($name, $value) = explode('=', $trim, 2);
        $value = trim($value);
        // Strip surrounding quotes.
        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = substr($value, -1);
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }
        putenv(sprintf('%s=%s', trim($name), $value));
    }
}

$adminEmailsRaw = getEnvVar('ADMIN_EMAILS', '');
$adminEmails = array_values(array_filter(array_map('trim', explode(',', $adminEmailsRaw))));

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
    'admin_email'    => getEnvVar('ADMIN_EMAIL', 'devante@johnson-rose.co.uk'),
    // Admin console (Google OAuth)
    'oauth_client_id'     => getEnvVar('GOOGLE_OAUTH_CLIENT_ID', ''),
    'oauth_client_secret' => getEnvVar('GOOGLE_OAUTH_CLIENT_SECRET', ''),
    'admin_emails'        => $adminEmails,
    'admin_session_secret' => getEnvVar('ADMIN_SESSION_SECRET', ''),
];
