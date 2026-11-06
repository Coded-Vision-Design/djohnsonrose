<?php
// pages/layout.php - the frame for the plain server-rendered pages (privacy,
// 404): a sticky header, a skip link and readable text, with no JavaScript.
// A page sets $pageTitle, $pageDescription and $pageContent (HTML), and may
// set $pageCurrent (the nav item to mark), $pageCanonical and $pageNoIndex,
// then includes this file. Included from index.php, so BASE_PATH is defined.

$pageNonce = csp_nonce();
header('Content-Type: text/html; charset=UTF-8');
header('Content-Security-Policy: ' . page_content_security_policy($pageNonce));

$e = fn($value) => htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
$navItems = ['portfolio' => ['Portfolio', BASE_PATH], 'privacy' => ['Privacy', BASE_PATH . 'privacy']];
?>
<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo $e($pageTitle); ?> | DeVanté Johnson-Rose</title>
    <meta name="description" content="<?php echo $e($pageDescription); ?>">
<?php if (!empty($pageNoIndex)): ?>
    <meta name="robots" content="noindex">
<?php endif; ?>
<?php if (!empty($pageCanonical)): ?>
    <link rel="canonical" href="<?php echo $e($pageCanonical); ?>">
<?php endif; ?>
    <meta name="theme-color" content="#005fb8">
    <link rel="icon" href="<?php echo $e(BASE_PATH); ?>favicon.ico">
    <style nonce="<?php echo $e($pageNonce); ?>">
        :root {
            color-scheme: light dark;
            --bg: #f3f3f3;
            --surface: #ffffff;
            --text: #1b1b1b;
            --muted: #474747;
            --accent: #005fb8;
            --border: #d1d1d1;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #1c1c1c;
                --surface: #2b2b2b;
                --text: #f3f3f3;
                --muted: #c8c8c8;
                --accent: #60cdff;
                --border: #454545;
            }
        }
        *, *::before, *::after { box-sizing: border-box; }
        html { overflow-x: hidden; scrollbar-gutter: stable; -webkit-text-size-adjust: 100%; }
        body {
            margin: 0;
            overflow-x: clip;
            max-width: 100%;
            background: var(--bg);
            color: var(--text);
            font: 400 clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)/1.6 "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        a { color: var(--accent); text-underline-offset: 0.15em; }
        a:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 2px; }
        .skip {
            position: absolute;
            left: 16px;
            top: -200px;
            z-index: 100;
            padding: 12px 16px;
            background: var(--surface);
            color: var(--text);
            border: 2px solid var(--accent);
            border-radius: 6px;
        }
        .skip:focus { top: 8px; }
        .site-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: var(--surface);
            border-bottom: 1px solid var(--border);
        }
        .bar {
            max-width: 46rem;
            height: 64px;
            margin: 0 auto;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        @media (min-width: 768px) { .bar { height: 72px; } }
        .brand {
            min-width: 0;
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            color: var(--text);
            font-weight: 600;
            text-decoration: none;
            overflow-wrap: anywhere;
        }
        .site-header ul { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; }
        .site-header nav a {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            padding: 0 10px;
            border-radius: 6px;
        }
        .site-header nav a[aria-current="page"] { color: var(--text); font-weight: 600; text-decoration: none; }
        main { display: block; max-width: 46rem; margin: 0 auto; padding: 24px 16px 48px; }
        main:focus { outline: none; }
        h1 { font-size: clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem); line-height: 1.2; margin: 8px 0 16px; }
        h2 { font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem); line-height: 1.3; margin: 36px 0 8px; }
        p, ul { margin: 0 0 16px; }
        ul { padding-left: 1.25rem; }
        li { margin-bottom: 6px; }
        .lead { font-size: 1.125em; color: var(--muted); }
        .note {
            margin: 24px 0;
            padding: 16px;
            background: var(--surface);
            border: 1px solid var(--border);
            border-left: 4px solid var(--accent);
            border-radius: 6px;
        }
        .note p:last-child { margin-bottom: 0; }
        code { font-family: Consolas, ui-monospace, monospace; font-size: 0.95em; overflow-wrap: anywhere; }
        .site-footer { border-top: 1px solid var(--border); }
        .site-footer p { max-width: 46rem; margin: 0 auto; padding: 16px; color: var(--muted); font-size: 0.9375rem; }
    </style>
</head>
<body>
    <a class="skip" href="#main-content">Skip to main content</a>
    <header class="site-header">
        <div class="bar">
            <a class="brand" href="<?php echo $e(BASE_PATH); ?>">DeVanté Johnson-Rose</a>
            <nav aria-label="Site">
                <ul>
<?php foreach ($navItems as $key => [$label, $href]): ?>
                    <li><a href="<?php echo $e($href); ?>"<?php echo ($pageCurrent ?? '') === $key ? ' aria-current="page"' : ''; ?>><?php echo $e($label); ?></a></li>
<?php endforeach; ?>
                </ul>
            </nav>
        </div>
    </header>
    <main id="main-content" tabindex="-1">
<?php echo $pageContent; ?>
    </main>
    <footer class="site-footer">
        <p>DeVanté Johnson-Rose, Full Stack Developer and Systems Engineer.</p>
    </footer>
</body>
</html>
