<?php
// lib/contact.php - validation, limits and message building for the contact
// form. Kept free of database and mail calls so it can be unit tested; see
// tests/php/contact_test.php. api/send_email.php wires it together.

const CONTACT_MAX_SUBJECT = 200;
const CONTACT_MAX_BODY = 5000;
const CONTACT_MAX_FILES = 3;
const CONTACT_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const CONTACT_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
const CONTACT_RATE_PER_IP = 5;
const CONTACT_RATE_WINDOW = 900;
const CONTACT_RATE_DAILY_CAP = 50;

function contact_single_line(string $value): string {
    return trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $value));
}

/**
 * Validates the visitor's fields. The recipient is deliberately not an input:
 * the address comes from config, so the form cannot be used as a relay.
 */
function contact_validate(array $post): array {
    $replyTo = $post['reply_to'] ?? '';
    $subject = $post['subject'] ?? '';
    $body = $post['body'] ?? '';

    if (!is_string($replyTo) || !is_string($subject) || !is_string($body)) {
        return ['ok' => false, 'error' => 'Please fill in every field.'];
    }

    $replyTo = trim($replyTo);
    if ($replyTo === '' || strlen($replyTo) > 254
        || preg_match('/[\r\n]/', $replyTo) || !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Please enter a valid email address so I can reply.'];
    }

    $subject = contact_single_line($subject);
    if ($subject === '') {
        return ['ok' => false, 'error' => 'Please add a subject.'];
    }
    if (mb_strlen($subject, 'UTF-8') > CONTACT_MAX_SUBJECT) {
        return ['ok' => false, 'error' => 'Please shorten the subject to ' . CONTACT_MAX_SUBJECT . ' characters.'];
    }

    $body = trim(str_replace(["\r\n", "\r"], "\n", $body));
    if ($body === '') {
        return ['ok' => false, 'error' => 'Please add a message.'];
    }
    if (mb_strlen($body, 'UTF-8') > CONTACT_MAX_BODY) {
        return ['ok' => false, 'error' => 'Please shorten the message to ' . CONTACT_MAX_BODY . ' characters.'];
    }

    return ['ok' => true, 'data' => ['reply_to' => $replyTo, 'subject' => $subject, 'body' => $body]];
}

/** A missing Origin is allowed; a present one must match the site's host. */
function contact_origin_allowed(?string $origin, string $host): bool {
    if ($origin === null || $origin === '') return true;
    $originHost = parse_url($origin, PHP_URL_HOST);
    $siteHost = parse_url('http://' . $host, PHP_URL_HOST);
    return is_string($originHost) && is_string($siteHost)
        && strcasecmp($originHost, $siteHost) === 0;
}

/**
 * Flattens $_FILES into a simple list. v1 posts attachment_0, attachment_1 and
 * so on, while v2 posts attachments[], which PHP nests differently.
 */
function contact_collect_attachments(array $files): array {
    $list = [];
    foreach ($files as $entry) {
        if (is_array($entry['name'] ?? null)) {
            foreach ($entry['name'] as $i => $name) {
                $list[] = [
                    'name' => $name,
                    'type' => $entry['type'][$i] ?? '',
                    'tmp_name' => $entry['tmp_name'][$i] ?? '',
                    'error' => $entry['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                    'size' => $entry['size'][$i] ?? 0,
                ];
            }
        } else {
            $list[] = $entry;
        }
    }

    $clean = [];
    $total = 0;
    foreach ($list as $file) {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['ok' => false, 'error' => 'That attachment could not be uploaded. The limit is 5 MB.'];
        }

        $name = str_replace(['"', '\\', '/'], '', contact_single_line((string)$file['name']));
        $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if ($name === '' || !in_array($extension, CONTACT_ALLOWED_EXTENSIONS, true)) {
            return ['ok' => false, 'error' => 'Attachments can be PDF, Word, text or image files.'];
        }

        $total += (int)$file['size'];
        $clean[] = [
            'name' => $name,
            'type' => (string)$file['type'],
            'tmp_name' => (string)$file['tmp_name'],
            'size' => (int)$file['size'],
        ];
    }

    if (count($clean) > CONTACT_MAX_FILES) {
        return ['ok' => false, 'error' => 'Please attach no more than ' . CONTACT_MAX_FILES . ' files.'];
    }
    if ($total > CONTACT_MAX_ATTACHMENT_BYTES) {
        return ['ok' => false, 'error' => 'Attachments can be 5 MB in total.'];
    }

    return ['ok' => true, 'files' => $clean];
}

function contact_encode_subject(string $subject): string {
    return preg_match('/[^\x20-\x7E]/', $subject)
        ? '=?UTF-8?B?' . base64_encode($subject) . '?='
        : $subject;
}

/** Builds the arguments for mail(). $cfg holds to, from and from_name. */
function contact_build_mail(array $data, array $attachments, array $cfg): array {
    $text = "New enquiry from your portfolio.\n\n"
        . "From: {$data['reply_to']}\n"
        . "Subject: {$data['subject']}\n\n"
        . $data['body'] . "\n\n"
        . "Reply to this email to answer them directly.\n";

    $headers = [
        'From' => "{$cfg['from_name']} <{$cfg['from']}>",
        'Reply-To' => $data['reply_to'],
        'MIME-Version' => '1.0',
        'X-Mailer' => 'PHP/' . phpversion(),
    ];

    if ($attachments === []) {
        $headers['Content-Type'] = 'text/plain; charset=UTF-8';
        $body = $text;
    } else {
        $boundary = 'portfolio_' . bin2hex(random_bytes(12));
        $headers['Content-Type'] = "multipart/mixed; boundary=\"{$boundary}\"";
        $body = "--{$boundary}\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n\r\n"
            . $text . "\r\n";
        foreach ($attachments as $file) {
            $body .= "--{$boundary}\r\n"
                . "Content-Type: application/octet-stream\r\n"
                . "Content-Transfer-Encoding: base64\r\n"
                . "Content-Disposition: attachment; filename=\"{$file['name']}\"\r\n\r\n"
                . chunk_split(base64_encode((string)file_get_contents($file['tmp_name']))) . "\r\n";
        }
        $body .= "--{$boundary}--\r\n";
    }

    return [
        'to' => $cfg['to'],
        'subject' => contact_encode_subject('Portfolio enquiry: ' . $data['subject']),
        'body' => $body,
        'headers' => $headers,
    ];
}

/**
 * File-based limiter: CONTACT_RATE_PER_IP per window for each visitor, plus a
 * daily cap as a backstop against a flood from many addresses. Visitors are
 * stored as hashes, never as raw IPs. If storage is unavailable it stays open,
 * as losing a real enquiry is worse than letting a message through.
 */
function contact_rate_allowed(string $dir, string $ip, int $now): bool {
    $handle = @fopen(rtrim($dir, '/\\') . '/contact_rate.json', 'c+');
    if ($handle === false) return true;

    try {
        if (!flock($handle, LOCK_EX)) return true;

        $state = json_decode((string)stream_get_contents($handle), true);
        if (!is_array($state)) $state = [];

        $day = (int)floor($now / 86400);
        if (($state['day'] ?? null) !== $day) {
            $state = ['day' => $day, 'count' => 0, 'ips' => []];
        }

        $key = hash('sha256', $ip);
        $recent = array_values(array_filter(
            $state['ips'][$key] ?? [],
            fn($t) => $t > $now - CONTACT_RATE_WINDOW
        ));

        $allowed = count($recent) < CONTACT_RATE_PER_IP && $state['count'] < CONTACT_RATE_DAILY_CAP;
        if ($allowed) {
            $recent[] = $now;
            $state['count']++;
        }
        $state['ips'][$key] = $recent;

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($state));
        return $allowed;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
