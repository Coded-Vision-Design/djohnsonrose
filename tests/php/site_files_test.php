<?php
// tests/php/site_files_test.php - checks on files the site ships rather than
// code: the web manifest, what a deploy leaves out, what SECURITY.md says is
// served, and endpoints that were removed.
// Run with: php tests/php/site_files_test.php (exits non-zero on failure).

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

$root = realpath(__DIR__ . '/../..');

// manifest.json: each icon's declared type and size match the file.
$manifest = json_decode((string)file_get_contents("{$root}/manifest.json"), true);
check('manifest: parses', is_array($manifest) && is_array($manifest['icons'] ?? null));
foreach ($manifest['icons'] ?? [] as $icon) {
    $file = $root . '/' . ltrim((string)$icon['src'], '/');
    $info = is_file($file) ? getimagesize($file) : false;
    check("manifest: {$icon['src']} exists", $info !== false);
    check("manifest: {$icon['src']} is declared as {$info['mime']}", $info !== false && $icon['type'] === $info['mime']);
    check("manifest: {$icon['src']} is declared at its real size", $info !== false && $icon['sizes'] === "{$info[0]}x{$info[1]}");
}

// deploy-config.json: repo-only files never reach the server.
$deploy = json_decode((string)file_get_contents("{$root}/deploy-config.json"), true);
$excluded = $deploy['exclude_patterns'] ?? [];
foreach (['scripts', 'tests', 'CODEOWNERS', 'SECURITY.md', 'LICENSE', 'README.md', '.github', '.coderabbit.yaml',
          '.gitattributes', '.gitignore', '.env.example', 'dev-server.php', 'package.json', 'package-lock.json'] as $repoOnly) {
    check("deploy: leaves out {$repoOnly}", in_array($repoOnly, $excluded, true));
}
foreach (['api', 'lib', 'pages', 'partials', 'assets', 'data', 'portfolio', 'index.php', 'router.php', 'bootstrap.php', 'config.php'] as $needed) {
    check("deploy: keeps {$needed}", !in_array($needed, $excluded, true));
}
check('deploy: lets the old weather cache be removed', !in_array('data/weather_cache.json', $excluded, true));

// SECURITY.md describes what /data/ really serves (see data/.htaccess).
$security = (string)file_get_contents("{$root}/SECURITY.md");
$dataRules = (string)file_get_contents("{$root}/data/.htaccess");
preg_match('/<FilesMatch "\^\(([^)]*)\)\$">/', $dataRules, $m);
$served = array_map(fn($name) => stripslashes($name), explode('|', $m[1] ?? ''));
check('security: data/.htaccess still lists its public files', count($served) >= 3);
check('security: no longer claims data/cv.* is denied', !preg_match('/denied[^\n]*data\/cv\.\*/i', $security));
foreach ($served as $name) {
    check("security: says data/{$name} is public", str_contains($security, "data/{$name}"));
}
check('security: no longer lists the removed SQL endpoint', !str_contains($security, 'database_query'));

// Removed files stay removed, and nothing points at them.
check('removed: api/database_query.php', !file_exists("{$root}/api/database_query.php"));
check('removed: sitemaps.php', !file_exists("{$root}/sitemaps.php"));
$references = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) {
    $path = str_replace('\\', '/', (string)$file);
    // Tests may name them, to check that they stay gone.
    if (preg_match('#/(node_modules|\.git|dist|test-results|playwright-report|tests/php|v2/e2e)/#', $path)) continue;
    if (!preg_match('/\.(php|js|ts|tsx|json|md|txt|xml|yml)$/', $path)) continue;
    $text = (string)file_get_contents($path);
    if (str_contains($text, 'database_query') || str_contains($text, 'sitemaps.php')) $references[] = substr($path, strlen($root) + 1);
}
check('removed: nothing refers to them' . ($references ? ' (' . implode(', ', $references) . ')' : ''), $references === []);

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
