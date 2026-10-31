<?php
// tests/php/security_test.php - unit tests for lib/security.php.
// Run with: php tests/php/security_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/security.php';

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

$apps = ['word', 'calculator', 'edge'];

// request_path
check('path: root', request_path('/', '/') === '/');
check('path: keeps slashes at the docroot', request_path('/app/word', '/') === '/app/word');
check('path: strips only the base prefix', request_path('/devante/app/word', '/devante/') === '/app/word');
check('path: leaves a repeated segment alone', request_path('/devante/devante/x', '/devante/') === '/devante/x');
check('path: drops the query string', request_path('/app/word?x=1', '/') === '/app/word');
check('path: survives a malformed URI', request_path('//', '/') === '/');
check('path: survives a path with no base', request_path('/other', '/devante/') === '/other');

// app_from_path
check('app: finds a known app', app_from_path('/app/word', $apps) === 'word');
check('app: allows a trailing slash', app_from_path('/app/word/', $apps) === 'word');
check('app: ignores other paths', app_from_path('/desktop', $apps) === null);
check('app: ignores an unknown app', app_from_path('/app/nope', $apps) === null);
check('app: is case sensitive', app_from_path('/app/WORD', $apps) === null);
check('app: rejects the script breakout', app_from_path("/app/'+alert(1)+'", $apps) === null);
check('app: rejects an encoded breakout', app_from_path('/app/%27+alert(1)+%27', $apps) === null);
check('app: rejects a tag breakout', app_from_path('/app/</script><script>alert(1)</script>', $apps) === null);
check('app: rejects a longer path', app_from_path('/app/word/extra', $apps) === null);
check('app: rejects an empty name', app_from_path('/app/', $apps) === null);

// js_value
check('js: quotes a plain string', js_value('word') === '"word"');
check('js: gives null for null', js_value(null) === 'null');
check('js: cannot break out of a string', !str_contains(js_value("'+alert(1)+'"), "'"));
check('js: cannot close a script block', !str_contains(js_value('</script>'), '<'));
check('js: escapes double quotes', !str_contains(substr(js_value('a"b'), 1, -1), '"'));
check('js: escapes ampersands', !str_contains(js_value('a&b'), '&'));
check('js: encodes arrays', js_value(['a' => 1]) === '{"a":1}');

// csp_nonce
$a = csp_nonce();
$b = csp_nonce();
check('nonce: differs per request', $a !== $b);
check('nonce: has at least 128 bits of entropy', strlen(base64_decode($a)) >= 16);
check('nonce: is safe inside a header and an attribute', preg_match('/^[A-Za-z0-9+\/=]+$/', $a) === 1);

// v1_content_security_policy
$policy = v1_content_security_policy('abc123');
$directive = function (string $name) use ($policy): string {
    foreach (explode(';', $policy) as $part) {
        $part = trim($part);
        if ($part === $name || str_starts_with($part, $name . ' ')) return $part;
    }
    return '';
};

check('csp: scripts use the nonce', str_contains($directive('script-src'), "'nonce-abc123'"));
check('csp: scripts do not allow inline code', !str_contains($directive('script-src'), "'unsafe-inline'"));
check('csp: Alpine can evaluate its expressions', str_contains($directive('script-src'), "'unsafe-eval'"));
check('csp: no plugins', $directive('object-src') === "object-src 'none'");
check('csp: base tag cannot be hijacked', $directive('base-uri') === "base-uri 'self'");
check('csp: forms stay on this site', $directive('form-action') === "form-action 'self'");
check('csp: only this site may frame it', $directive('frame-ancestors') === "frame-ancestors 'self'");
check('csp: defaults to this site', $directive('default-src') === "default-src 'self'");
check('csp: Google sign-in can load', str_contains($directive('script-src'), 'https://accounts.google.com/gsi/client'));
check('csp: Google sign-in can frame', str_contains($directive('frame-src'), 'https://accounts.google.com/gsi/'));
check('csp: no unpkg, now that Alpine is self-hosted', !str_contains($policy, 'unpkg.com'));
check('csp: no wildcard script host', !preg_match('/script-src[^;]*\shttps:(\s|;|$)/', $policy));
check('csp: a nonce cannot inject a directive', !str_contains(v1_content_security_policy('a;b'), 'a;b'));

$manifest = load_app_manifest();
$manifestIds = array_column($manifest['apps'], 'id');
check('manifest: has apps', count($manifestIds) > 0);
check('manifest: has taskbar pins', count($manifest['pinned']) > 0);
check('manifest: has Start pins', count($manifest['startPinned'] ?? []) > 0);
check('manifest: Start pins are real apps', array_diff($manifest['startPinned'] ?? ['none'], $manifestIds) === []);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
