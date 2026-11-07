<?php
// lib/admin_session.php - the Admin Console's session cookie. Free of global
// state so it can be unit tested; see tests/php/admin_session_test.php.
// bootstrap.php sets and reads the cookie with these.
//
// The cookie is base64url(payload).base64url(HMAC-SHA256 signature), where
// the payload is JSON { email, gen, iat, exp }. gen is the number of times
// that admin had signed out when the cookie was issued. Signing out moves the
// count on, so every cookie issued before it stops working at once, on every
// device, even though the cookies themselves cannot be recalled.

require_once __DIR__ . '/state.php';

// Sign-in attempts allowed per visitor in any fifteen minutes.
const ADMIN_SIGN_IN_LIMIT = 5;
const ADMIN_SIGN_IN_WINDOW = 900;
// Seconds to wait for Google to verify a sign-in token.
const ADMIN_TOKENINFO_TIMEOUT = 3;

function admin_b64_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function admin_b64_decode(string $data): string {
    return (string)base64_decode(strtr($data, '-_', '+/'), true);
}

function admin_session_encode(string $email, int $generation, string $secret, int $now, int $ttl): string {
    $payload = admin_b64_encode(json_encode([
        'email' => strtolower(trim($email)),
        'gen' => $generation,
        'iat' => $now,
        'exp' => $now + $ttl,
    ]));
    return $payload . '.' . admin_b64_encode(hash_hmac('sha256', $payload, $secret, true));
}

/** The verified payload of a cookie, or null if it is missing, forged, malformed or expired. */
function admin_session_decode($cookie, string $secret, int $now): ?array {
    if ($secret === '' || !is_string($cookie) || substr_count($cookie, '.') !== 1) return null;

    [$payload, $signature] = explode('.', $cookie);
    $expected = admin_b64_encode(hash_hmac('sha256', $payload, $secret, true));
    if (!hash_equals($expected, $signature)) return null;

    $data = json_decode(admin_b64_decode($payload), true);
    if (!is_array($data) || !is_string($data['email'] ?? null) || $data['email'] === '') return null;
    if (!is_int($data['exp'] ?? null) || $data['exp'] < $now) return null;

    return [
        'email' => strtolower($data['email']),
        'gen' => is_int($data['gen'] ?? null) ? $data['gen'] : 0,
        'exp' => $data['exp'],
    ];
}

/** Whether an email is on the admin allowlist, ignoring case on both sides. */
function admin_email_allowed(?string $email, array $admins): bool {
    if ($email === null || trim($email) === '') return false;
    $email = strtolower(trim($email));
    foreach ($admins as $admin) {
        if (is_string($admin) && strtolower(trim($admin)) === $email) return true;
    }
    return false;
}

function admin_sessions_file(string $dir): string {
    return rtrim($dir, '/\\') . '/admin-sessions.json';
}

/** How many times this admin has signed out. Stored against a hash of the email. */
function admin_session_generation(string $dir, string $email): int {
    $count = state_read(admin_sessions_file($dir))[hash('sha256', strtolower(trim($email)))] ?? 0;
    return is_int($count) ? $count : 0;
}

/** Signs an admin out everywhere. Returns the new count, or null if it could not be recorded. */
function admin_session_revoke(string $dir, string $email): ?int {
    $key = hash('sha256', strtolower(trim($email)));
    return state_update(admin_sessions_file($dir), function (array &$state) use ($key): int {
        $state[$key] = (is_int($state[$key] ?? null) ? $state[$key] : 0) + 1;
        return $state[$key];
    }, null);
}

/** The signed-in admin's email, or null. Checks the signature, expiry, allowlist and sign-outs. */
function admin_session_current($cookie, string $secret, array $admins, string $dir, int $now): ?string {
    $payload = admin_session_decode($cookie, $secret, $now);
    if ($payload === null || !admin_email_allowed($payload['email'], $admins)) return null;
    if ($payload['gen'] !== admin_session_generation($dir, $payload['email'])) return null;
    return $payload['email'];
}
