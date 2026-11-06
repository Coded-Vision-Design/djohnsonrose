<?php
// tests/php/admin_session_test.php - unit tests for lib/admin_session.php and
// the admin allowlist in config.php.
// Run with: php tests/php/admin_session_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/admin_session.php';

$failures = 0;
$passes = 0;

function check(string $label, bool $ok): void {
    global $failures, $passes;
    if ($ok) {
        $passes++;
        return;
    }
    $failures++;
    echo "FAIL: {$label}\n";
}

function tempDir(): string {
    $dir = sys_get_temp_dir() . '/admin_session_test_' . bin2hex(random_bytes(6));
    mkdir($dir);
    return $dir;
}

$secret = 'test-secret-that-is-long-enough';
$now = 1_800_000_000;

// admin_session_encode and admin_session_decode
$cookie = admin_session_encode('Owner@Example.com', 0, $secret, $now, 86400);
$payload = admin_session_decode($cookie, $secret, $now + 10);
check('cookie: round trips', is_array($payload));
check('cookie: stores the email in lower case', $payload['email'] === 'owner@example.com');
check('cookie: records the sign-out count it was issued under', $payload['gen'] === 0);
check('cookie: expires', admin_session_decode($cookie, $secret, $now + 86401) === null);
[$body, $sig] = explode('.', $cookie);
$forged = rtrim(strtr(base64_encode(json_encode(['email' => 'evil@example.com', 'gen' => 0, 'exp' => $now + 9999])), '+/', '-_'), '=');
check('cookie: a changed payload is refused', admin_session_decode($forged . '.' . $sig, $secret, $now) === null);
check('cookie: another secret is refused', admin_session_decode($cookie, 'other-secret', $now) === null);
check('cookie: an empty secret signs nothing', admin_session_decode($cookie, '', $now) === null);
check('cookie: an array is refused, not a crash', admin_session_decode(['x' => 'y'], $secret, $now) === null);
check('cookie: missing is refused', admin_session_decode(null, $secret, $now) === null);
check('cookie: no signature is refused', admin_session_decode($body, $secret, $now) === null);
$notJson = rtrim(strtr(base64_encode('not json'), '+/', '-_'), '=');
$signed = $notJson . '.' . rtrim(strtr(base64_encode(hash_hmac('sha256', $notJson, $secret, true)), '+/', '-_'), '=');
check('cookie: a signed payload that is not JSON is refused', admin_session_decode($signed, $secret, $now) === null);
$noEmail = rtrim(strtr(base64_encode(json_encode(['exp' => $now + 60])), '+/', '-_'), '=');
$signed = $noEmail . '.' . rtrim(strtr(base64_encode(hash_hmac('sha256', $noEmail, $secret, true)), '+/', '-_'), '=');
check('cookie: a payload with no email is refused', admin_session_decode($signed, $secret, $now) === null);
$legacy = rtrim(strtr(base64_encode(json_encode(['email' => 'owner@example.com', 'exp' => $now + 60])), '+/', '-_'), '=');
$signed = $legacy . '.' . rtrim(strtr(base64_encode(hash_hmac('sha256', $legacy, $secret, true)), '+/', '-_'), '=');
check('cookie: one from before sign-out counts reads as count 0', admin_session_decode($signed, $secret, $now)['gen'] === 0);

// admin_email_allowed
$admins = ['owner@example.com'];
check('allowlist: matches whatever the case of the email', admin_email_allowed('Owner@EXAMPLE.com', $admins));
check('allowlist: matches whatever the case of the list', admin_email_allowed('owner@example.com', ['Owner@Example.COM']));
check('allowlist: refuses another address', !admin_email_allowed('other@example.com', $admins));
check('allowlist: refuses nothing', !admin_email_allowed(null, $admins) && !admin_email_allowed('', $admins));
check('allowlist: an empty list allows nobody', !admin_email_allowed('owner@example.com', []));
check('allowlist: ignores entries that are not strings', !admin_email_allowed('owner@example.com', [['owner@example.com']]));

// config.php lowercases ADMIN_EMAILS once
putenv('ADMIN_EMAILS= Owner@Example.com, Second@EXAMPLE.org ,,');
$config = require __DIR__ . '/../../config.php';
check('config: lowercases and trims the admin list', $config['admin_emails'] === ['owner@example.com', 'second@example.org']);
putenv('ADMIN_EMAILS');

// Signing out revokes every cookie issued before it
$dir = tempDir();
check('revoke: nobody has signed out yet', admin_session_generation($dir, 'owner@example.com') === 0);
$old = admin_session_encode('owner@example.com', 0, $secret, $now, 86400);
check('revoke: a fresh cookie is accepted', admin_session_current($old, $secret, $admins, $dir, $now) === 'owner@example.com');
check('revoke: signing out moves the count on', admin_session_revoke($dir, 'Owner@Example.com') === 1);
check('revoke: the count ignores case', admin_session_generation($dir, 'OWNER@example.com') === 1);
check('revoke: the old cookie no longer works', admin_session_current($old, $secret, $admins, $dir, $now) === null);
$new = admin_session_encode('owner@example.com', admin_session_generation($dir, 'owner@example.com'), $secret, $now + 5, 86400);
check('revoke: signing in again works', admin_session_current($new, $secret, $admins, $dir, $now + 5) === 'owner@example.com');
check('revoke: other admins are unaffected', admin_session_generation($dir, 'second@example.org') === 0);
check('revoke: an admin removed from the list is refused', admin_session_current($new, $secret, ['second@example.org'], $dir, $now + 5) === null);
check('revoke: the store holds no email addresses', !str_contains((string)file_get_contents($dir . '/admin-sessions.json'), 'owner'));
check('revoke: reports when it cannot record the sign-out', admin_session_revoke($dir . '/missing/dir', 'owner@example.com') === null);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
