<?php
// lib/request.php - reading a request safely: who sent it, where it came
// from, and inputs that may not be the type they claim. Free of global state
// so it can be unit tested; see tests/php/request_test.php.

/**
 * The visitor's IP address, or '' when there is no valid one. REMOTE_ADDR is
 * the only value a client cannot forge, so forwarding headers are believed
 * only when the request arrived from a proxy listed in TRUSTED_PROXIES.
 */
function client_ip(array $server, array $trustedProxies = []): string {
    $remote = $server['REMOTE_ADDR'] ?? '';
    $remote = is_string($remote) ? trim($remote) : '';
    if (filter_var($remote, FILTER_VALIDATE_IP) === false) return '';
    if ($trustedProxies === [] || !ip_in_ranges($remote, $trustedProxies)) return $remote;

    // Each proxy appends the address it saw, so read from the right and stop
    // at the first hop that is not one of ours: that is the visitor.
    $forwarded = $server['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($forwarded) && $forwarded !== '') {
        foreach (array_reverse(array_map('trim', explode(',', $forwarded))) as $hop) {
            if (filter_var($hop, FILTER_VALIDATE_IP) === false) break;
            if (!ip_in_ranges($hop, $trustedProxies)) return $hop;
        }
    }
    return $remote;
}

/** True when $ip is one of $ranges, each a single address or a CIDR block. */
function ip_in_ranges(string $ip, array $ranges): bool {
    $address = @inet_pton($ip);
    if ($address === false) return false;

    foreach ($ranges as $range) {
        if (!is_string($range)) continue;
        $parts = explode('/', trim($range), 2);
        $network = @inet_pton($parts[0]);
        if ($network === false || strlen($network) !== strlen($address)) continue;

        $maxBits = strlen($address) * 8;
        if (!isset($parts[1])) {
            $bits = $maxBits;
        } elseif (ctype_digit($parts[1]) && (int)$parts[1] <= $maxBits) {
            $bits = (int)$parts[1];
        } else {
            continue;
        }

        $whole = intdiv($bits, 8);
        if (strncmp($address, $network, $whole) !== 0) continue;
        $rest = $bits % 8;
        if ($rest === 0) return true;
        $mask = chr((0xFF << (8 - $rest)) & 0xFF);
        if (($address[$whole] & $mask) === ($network[$whole] & $mask)) return true;
    }
    return false;
}

/**
 * Shortens an address so it no longer points at one connection: IPv4 to its
 * /24 and IPv6 to its /48. Returns '' for anything that is not an address.
 */
function ip_truncate(string $ip): string {
    $address = @inet_pton(trim($ip));
    if ($address === false) return '';

    // An IPv4 address written as IPv6 (::ffff:a.b.c.d) is shortened as IPv4.
    if (strlen($address) === 16 && strncmp($address, str_repeat("\0", 10) . "\xff\xff", 12) === 0) {
        $address = substr($address, 12);
    }
    if (strlen($address) === 4) {
        return inet_ntop(substr($address, 0, 3) . "\0");
    }
    return inet_ntop(substr($address, 0, 6) . str_repeat("\0", 10));
}

/**
 * True when a request was sent by a page on this site. Browsers send Origin
 * with every POST (and Sec-Fetch-Site on current versions), and a page cannot
 * forge either. A request with neither did not come from a browser, so there
 * is no visitor's session to protect, and it is allowed. Ports are ignored so
 * that the Vite dev proxy counts as this site.
 */
function request_same_origin(array $server): bool {
    $origin = $server['HTTP_ORIGIN'] ?? null;
    if (is_string($origin) && $origin !== '') {
        $host = $server['HTTP_HOST'] ?? '';
        $originHost = parse_url($origin, PHP_URL_HOST);
        $siteHost = is_string($host) ? parse_url('http://' . $host, PHP_URL_HOST) : null;
        return is_string($originHost) && is_string($siteHost)
            && strcasecmp($originHost, $siteHost) === 0;
    }

    $fetchSite = $server['HTTP_SEC_FETCH_SITE'] ?? null;
    if (is_string($fetchSite) && $fetchSite !== '') {
        return in_array(strtolower($fetchSite), ['same-origin', 'none'], true);
    }
    return true;
}

/** True on a local development server, which must never send real mail. */
function request_is_local(array $server): bool {
    $host = $server['HTTP_HOST'] ?? '';
    if (!is_string($host) || $host === '') return false;
    return in_array(strtolower((string)parse_url('http://' . $host, PHP_URL_HOST)), ['localhost', '127.0.0.1'], true);
}

/** A query, form or cookie value, or null when it is missing or not a string (name[]=x arrives as an array). */
function request_string(array $source, string $key): ?string {
    $value = $source[$key] ?? null;
    return is_string($value) ? $value : null;
}

/** The raw request body, or null when it is longer than $maxBytes. */
function read_request_body(int $maxBytes, string $source = 'php://input'): ?string {
    $body = @file_get_contents($source, false, null, 0, $maxBytes + 1);
    if (!is_string($body)) return '';
    return strlen($body) > $maxBytes ? null : $body;
}

/**
 * GETs a JSON document, giving up after $timeout seconds (the limit covers
 * connecting and each read). Returns null on any failure, including an error
 * status, so a slow or broken upstream can never hold a visitor's request.
 * $headers are extra request lines, such as 'User-Agent: x'.
 */
function http_get_json(string $url, float $timeout, array $headers = []): ?array {
    $context = stream_context_create([
        'http' => [
            'timeout' => $timeout,
            'follow_location' => 0,
            'header' => implode("\r\n", ['Accept: application/json', ...$headers]) . "\r\n",
        ],
    ]);
    $raw = @file_get_contents($url, false, $context);
    if (!is_string($raw) || $raw === '') return null;
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}
