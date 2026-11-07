<?php
// config.php - environment loader + structured config.

function getEnvVar($key, $default = null) {
    $val = getenv($key);
    if ($val === false) {
        return $default;
    }
    return $val;
}

// Basic .env loader - supports quoted values, ignores comments / blank lines.
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

// Email addresses are compared without case, so the list is lowercased once here.
$adminEmailsRaw = getEnvVar('ADMIN_EMAILS', '');
$adminEmails = array_values(array_filter(array_map(
    fn($email) => strtolower(trim($email)),
    explode(',', $adminEmailsRaw)
)));

// Comma-separated addresses or CIDR blocks of proxies in front of the site.
// Only requests from these may name the visitor in X-Forwarded-For.
$trustedProxies = array_values(array_filter(array_map('trim', explode(',', getEnvVar('TRUSTED_PROXIES', '')))));

return [
    'email' => getEnvVar('PORTFOLIO_EMAIL', 'devante@johnson-rose.co.uk'),
    'debug' => getEnvVar('APP_DEBUG', 'false') === 'true',
    'env'   => getEnvVar('APP_ENV', 'production'),
    'db'    => [
        'host' => getEnvVar('DB_HOST', 'localhost'),
        'port' => getEnvVar('DB_PORT', ''),
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
    'trusted_proxies'     => $trustedProxies,
    // Rate limits, daily jobs, admin sign-outs and the weather cache. Empty
    // means a folder in the system temp directory. See lib/state.php.
    'state_dir'           => getEnvVar('APP_STATE_DIR', ''),
    // The taskbar weather is always for this one place, never the visitor's.
    'weather' => [
        'latitude'  => (float)getEnvVar('WEATHER_LATITUDE', '51.87'),
        'longitude' => (float)getEnvVar('WEATHER_LONGITUDE', '0.56'),
        'city'      => getEnvVar('WEATHER_CITY', 'Essex'),
    ],
    // Copilot (api/copilot.php) is switched off until ANTHROPIC_API_KEY is set.
    // The key stays on the server: it is never sent to the browser or logged.
    // Defaults and limits are in lib/copilot.php (copilot_settings).
    'copilot' => [
        'api_key'         => getEnvVar('ANTHROPIC_API_KEY', ''),
        'base_url'        => getEnvVar('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
        'chat_model'      => getEnvVar('COPILOT_CHAT_MODEL', 'claude-haiku-5-5'),
        'match_model'     => getEnvVar('COPILOT_MATCH_MODEL', 'claude-sonnet-5-5'),
        'timeout'         => (float)getEnvVar('COPILOT_TIMEOUT', '60'),
        'daily_cap'       => (int)getEnvVar('COPILOT_DAILY_CAP', '500'),
        'match_daily_cap' => (int)getEnvVar('COPILOT_MATCH_DAILY_CAP', '100'),
    ],
];
