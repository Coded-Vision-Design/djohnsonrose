<?php
// tests/php/testimonials_test.php - unit tests for lib/testimonials.php, the
// Testimonials widget, against tests/php/fixtures/testimonials.json and the
// real data/testimonials.json.
// Run with: php tests/php/testimonials_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/testimonials.php';

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

$fixture = __DIR__ . '/fixtures/testimonials.json';

// ---- testimonials_load: the fixture ----
$shown = testimonials_load($fixture);
check('fixture: keeps the three complete ones, in order', array_column($shown, 'name') === ['Fixture Person One', 'Fixture Person Two', 'Fixture Person Three']);
check('fixture: a full entry keeps every field', ($shown[0] ?? null) === [
    'quote' => 'Fixture quote one, for tests only.',
    'name' => 'Fixture Person One',
    'role' => 'Test Role',
    'company' => 'Example Ltd',
    'link' => 'https://example.com/one',
]);
check('fixture: spaces round a quote go', ($shown[1]['quote'] ?? null) === 'Fixture quote two, with spaces round it.');
check('fixture: a link that is not https goes, the words stay', isset($shown[1]) && !array_key_exists('link', $shown[1]));
check('fixture: a missing role and company read as empty', ($shown[2]['role'] ?? null) === '' && ($shown[2]['company'] ?? null) === '');
check('fixture: no link means no link', isset($shown[2]) && !array_key_exists('link', $shown[2]));

// ---- testimonials_from_data: edge and error cases ----
check('data: nothing gives none', testimonials_from_data(null) === []);
check('data: an object is not a list', testimonials_from_data(['quote' => 'a', 'name' => 'b']) === []);
check('data: an empty list gives none', testimonials_from_data([]) === []);
check('data: a quote that is not text is dropped', testimonials_from_data([['quote' => ['a'], 'name' => 'b']]) === []);
check('data: a role that is not text reads as empty', testimonials_from_data([['quote' => 'a', 'name' => 'b', 'role' => 5]])[0]['role'] === '');
foreach (['http://example.com', 'javascript:alert(1)', '//example.com', 'https://', 'not a url', 'data:text/html,x'] as $link) {
    check("data: the link {$link} is dropped", !array_key_exists('link', testimonials_from_data([['quote' => 'a', 'name' => 'b', 'link' => $link]])[0]));
}
check('data: only the documented fields come out', array_keys(testimonials_from_data([['quote' => 'a', 'name' => 'b', 'email' => 'x@example.com', 'link' => 'https://example.com']])[0]) === ['quote', 'name', 'role', 'company', 'link']);

// ---- testimonials_load: files that are not there or broken ----
check('load: a missing file gives none', testimonials_load(__DIR__ . '/fixtures/nope.json') === []);
$broken = sys_get_temp_dir() . '/testimonials_test_' . bin2hex(random_bytes(4)) . '.json';
file_put_contents($broken, '[{"quote": "a", ');
check('load: broken JSON gives none', testimonials_load($broken) === []);
unlink($broken);

// ---- The real file: valid JSON, and nothing in it is dropped ----
$raw = file_get_contents(TESTIMONIALS_FILE);
$real = json_decode((string)$raw, true);
check('real: data/testimonials.json is a JSON list', is_array($real) && array_is_list($real));
check('real: every entry in it is shown, so a typo cannot hide one quietly', is_array($real) && count(testimonials_load()) === count($real));

// ---- api/testimonials.php answers with exactly what the lib gives ----
$out = shell_exec(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg(__DIR__ . '/../../api/testimonials.php'));
check('endpoint: answers with the shown testimonials', json_decode((string)$out, true) === ['testimonials' => testimonials_load()]);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
