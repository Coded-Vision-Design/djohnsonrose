<?php
// tests/php/contact_test.php - unit tests for lib/contact.php.
// Run with: php tests/php/contact_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/contact.php';

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
    $dir = sys_get_temp_dir() . '/contact_test_' . bin2hex(random_bytes(6));
    mkdir($dir);
    return $dir;
}

$valid = ['reply_to' => 'jo@example.com', 'subject' => 'Hello', 'body' => 'A real message'];

// contact_validate
$r = contact_validate($valid);
check('validate: accepts a complete enquiry', $r['ok'] === true);
check('validate: returns the cleaned fields', $r['data']['reply_to'] === 'jo@example.com' && $r['data']['subject'] === 'Hello');

$r = contact_validate(['reply_to' => '', 'subject' => 'Hello', 'body' => 'Hi']);
check('validate: requires a reply address', $r['ok'] === false && stripos($r['error'], 'email') !== false);

$r = contact_validate(['reply_to' => 'not-an-email', 'subject' => 'Hello', 'body' => 'Hi']);
check('validate: rejects a malformed reply address', $r['ok'] === false);

$r = contact_validate(['reply_to' => "jo@example.com\r\nBcc: spam@example.com", 'subject' => 'Hello', 'body' => 'Hi']);
check('validate: rejects header injection in the reply address', $r['ok'] === false);

$r = contact_validate(['reply_to' => 'jo@example.com', 'subject' => "Hello\r\nBcc: spam@example.com", 'body' => 'Hi']);
check('validate: strips line breaks from the subject', $r['ok'] === true && strpbrk($r['data']['subject'], "\r\n") === false);

$r = contact_validate(['reply_to' => 'jo@example.com', 'subject' => '   ', 'body' => 'Hi']);
check('validate: requires a subject', $r['ok'] === false);

$r = contact_validate(['reply_to' => 'jo@example.com', 'subject' => 'Hello', 'body' => '  ']);
check('validate: requires a message', $r['ok'] === false);

$r = contact_validate(['reply_to' => 'jo@example.com', 'subject' => str_repeat('a', 201), 'body' => 'Hi']);
check('validate: caps the subject length', $r['ok'] === false);

$r = contact_validate(['reply_to' => 'jo@example.com', 'subject' => 'Hello', 'body' => str_repeat('a', 5001)]);
check('validate: caps the message length', $r['ok'] === false);

$r = contact_validate(['reply_to' => ['a@b.co'], 'subject' => ['x'], 'body' => ['y']]);
check('validate: rejects array input without crashing', $r['ok'] === false);

// contact_origin_allowed
check('origin: allows the same host', contact_origin_allowed('https://devante.johnson-rose.co.uk', 'devante.johnson-rose.co.uk'));
check('origin: ignores ports, for the dev proxy', contact_origin_allowed('http://localhost:5173', 'localhost:8765'));
check('origin: allows a missing Origin header', contact_origin_allowed(null, 'devante.johnson-rose.co.uk'));
check('origin: refuses another site', !contact_origin_allowed('https://evil.example', 'devante.johnson-rose.co.uk'));
check('origin: refuses a lookalike host', !contact_origin_allowed('https://devante.johnson-rose.co.uk.evil.example', 'devante.johnson-rose.co.uk'));

// contact_collect_attachments
$r = contact_collect_attachments([]);
check('attachments: none is fine', $r['ok'] === true && $r['files'] === []);

$r = contact_collect_attachments([
    'attachment_0' => ['name' => 'brief.pdf', 'type' => 'application/pdf', 'tmp_name' => '/tmp/a', 'error' => UPLOAD_ERR_OK, 'size' => 100],
]);
check('attachments: reads the v1 field shape', $r['ok'] === true && count($r['files']) === 1 && $r['files'][0]['name'] === 'brief.pdf');

$r = contact_collect_attachments([
    'attachments' => [
        'name' => ['a.pdf', 'b.png'],
        'type' => ['application/pdf', 'image/png'],
        'tmp_name' => ['/tmp/a', '/tmp/b'],
        'error' => [UPLOAD_ERR_OK, UPLOAD_ERR_OK],
        'size' => [100, 200],
    ],
]);
check('attachments: reads the v2 array shape', $r['ok'] === true && count($r['files']) === 2 && $r['files'][1]['name'] === 'b.png');

$r = contact_collect_attachments([
    'attachment_0' => ['name' => '', 'type' => '', 'tmp_name' => '', 'error' => UPLOAD_ERR_NO_FILE, 'size' => 0],
]);
check('attachments: skips an empty slot', $r['ok'] === true && $r['files'] === []);

$r = contact_collect_attachments([
    'attachment_0' => ['name' => 'virus.exe', 'type' => 'application/x-msdownload', 'tmp_name' => '/tmp/a', 'error' => UPLOAD_ERR_OK, 'size' => 100],
]);
check('attachments: refuses an unsafe file type', $r['ok'] === false);

$r = contact_collect_attachments([
    'attachment_0' => ['name' => 'big.pdf', 'type' => 'application/pdf', 'tmp_name' => '/tmp/a', 'error' => UPLOAD_ERR_OK, 'size' => 6 * 1024 * 1024],
]);
check('attachments: refuses more than 5 MB', $r['ok'] === false);

$r = contact_collect_attachments([
    'attachment_0' => ['name' => 'big.pdf', 'type' => 'application/pdf', 'tmp_name' => '', 'error' => UPLOAD_ERR_INI_SIZE, 'size' => 0],
]);
check('attachments: reports a failed upload', $r['ok'] === false);

$many = [];
for ($i = 0; $i < 4; $i++) {
    $many["attachment_{$i}"] = ['name' => "f{$i}.pdf", 'type' => 'application/pdf', 'tmp_name' => '/tmp/a', 'error' => UPLOAD_ERR_OK, 'size' => 10];
}
$r = contact_collect_attachments($many);
check('attachments: refuses more than three files', $r['ok'] === false);

$r = contact_collect_attachments([
    'attachment_0' => ['name' => "bad\r\nname\".pdf", 'type' => 'application/pdf', 'tmp_name' => '/tmp/a', 'error' => UPLOAD_ERR_OK, 'size' => 10],
]);
check('attachments: cleans the filename', $r['ok'] === true && strpbrk($r['files'][0]['name'], "\r\n\"") === false);

// contact_build_mail
$cfg = ['to' => 'owner@example.com', 'from' => 'no-reply@example.com', 'from_name' => 'Portfolio OS'];
$data = ['reply_to' => 'jo@example.com', 'subject' => 'Hello', 'body' => 'A real message'];

$m = contact_build_mail($data, [], $cfg);
check('mail: always goes to the configured address', $m['to'] === 'owner@example.com');
check('mail: sets Reply-To to the visitor', $m['headers']['Reply-To'] === 'jo@example.com');
check('mail: sends from the site address, not the visitor', str_contains($m['headers']['From'], 'no-reply@example.com') && !str_contains($m['headers']['From'], 'jo@example.com'));
check('mail: includes the visitor message and address', str_contains($m['body'], 'A real message') && str_contains($m['body'], 'jo@example.com'));
check('mail: plain text without attachments', str_contains($m['headers']['Content-Type'], 'text/plain'));

$m = contact_build_mail(['reply_to' => 'jo@example.com', 'subject' => 'Café enquiry', 'body' => 'Hi'], [], $cfg);
check('mail: encodes a non-ASCII subject', str_starts_with($m['subject'], '=?UTF-8?B?'));

$file = tempnam(sys_get_temp_dir(), 'att');
file_put_contents($file, 'attachment payload');
$m = contact_build_mail($data, [['name' => 'brief.pdf', 'type' => 'application/pdf', 'tmp_name' => $file, 'size' => 18]], $cfg);
check('mail: multipart with an attachment', str_contains($m['headers']['Content-Type'], 'multipart/mixed'));
check('mail: attachment is base64 encoded', str_contains($m['body'], base64_encode('attachment payload')) && str_contains($m['body'], 'filename="brief.pdf"'));
check('mail: message text survives in multipart', str_contains($m['body'], 'A real message'));
unlink($file);

// contact_rate_allowed
$dir = tempDir();
$now = 1_800_000_000;
$allowed = 0;
for ($i = 0; $i < 6; $i++) {
    if (contact_rate_allowed($dir, '203.0.113.1', $now + $i)) $allowed++;
}
check('rate: allows five then refuses the sixth', $allowed === 5);
check('rate: other visitors are unaffected', contact_rate_allowed($dir, '203.0.113.2', $now + 10));
check('rate: resets after the window', contact_rate_allowed($dir, '203.0.113.1', $now + 901));

$dir2 = tempDir();
$ok = 0;
for ($i = 0; $i < 60; $i++) {
    if (contact_rate_allowed($dir2, "198.51.100.{$i}", $now + $i)) $ok++;
}
check('rate: daily cap stops a spread-out flood', $ok === 50);
check('rate: daily cap clears the next day', contact_rate_allowed($dir2, '198.51.100.200', $now + 86401));
check('rate: stores no raw IP addresses', !str_contains(file_get_contents($dir . '/contact_rate.json'), '203.0.113.1'));

$unwritable = $dir . '/does/not/exist';
check('rate: stays open if storage is unavailable', contact_rate_allowed($unwritable, '203.0.113.9', $now));

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
