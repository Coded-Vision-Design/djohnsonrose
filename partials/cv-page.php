<?php
// partials/cv-page.php - the recruiter CV at /cv (see router.php). A plain page
// for people who want the CV rather than the desktop: server rendered from
// data/profile.json and data/portfolio.json, no JavaScript, its own canonical
// URL. The helpers it uses are in lib/cv.php; tests/php/cv_test.php renders it.
if (!defined('BASE_PATH')) {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../lib/cv.php';

$profile = load_shared_data('profile');
$portfolio = load_shared_data('portfolio');
$email = (string)($config['email'] ?? '');
$phone = cv_tel((string)($profile['phone'] ?? ''));
$siteUrl = (string)($profile['url'] ?? 'https://devante.johnson-rose.co.uk/');
$canonical = $siteUrl . 'cv';
$shareImage = $siteUrl . 'assets/img/share-card.png';
$shareAlt = 'Portrait of DeVanté Johnson-Rose beside his name and devante.johnson-rose.co.uk';
$name = (string)($profile['name'] ?? '');
$headline = (string)($profile['headline'] ?? '');
$summary = cv_text((string)($portfolio['summary'] ?? ''));
$description = cv_sentences($summary)[0] ?? $summary;
$featured = cv_featured_projects($portfolio['projects'] ?? []);
$roles = cv_split_experience($portfolio['experience'] ?? []);
$certificates = cv_certificate_groups($portfolio['certifications'] ?? []);
$skillLabels = [
    'frameworks' => 'Languages and frameworks',
    'tools' => 'Data and infrastructure',
    'operations' => 'Automation and delivery',
    'apis' => 'AI and APIs',
];

$pdfFile = __DIR__ . '/../data/cv.pdf';
$pdfSize = is_file($pdfFile) ? ', ' . max(1, (int)round(filesize($pdfFile) / 1024)) . ' KB' : '';
$pdfHref = BASE_PATH . 'data/cv.pdf';
$pdfName = 'DeVante-Johnson-Rose-CV.pdf';

$jsonLd = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'ProfilePage',
            '@id' => $canonical . '#page',
            'url' => $canonical,
            'name' => "{$name} | CV",
            'inLanguage' => 'en-GB',
            'isPartOf' => ['@id' => $siteUrl . '#website'],
            'mainEntity' => ['@id' => $siteUrl . '#person'],
        ],
        cv_person_schema($profile, $headline, $email),
    ],
];

/** Escapes text for the page, in the house style. */
$e = fn($text) => htmlspecialchars(cv_text((string)$text), ENT_QUOTES, 'UTF-8');
/** Escapes a URL for an attribute. */
$u = fn($url) => htmlspecialchars((string)$url, ENT_QUOTES, 'UTF-8');
$newTab = '<span class="visually-hidden"> (opens in a new tab)</span>';
$externalIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"><path d="M9 2h5v5h-1.5V4.6L7.1 10 6 8.9 11.4 3.5H9V2Zm-6 2h4v1.5H3.5v7h7V9H12v5H2V4h1Z" fill="currentColor"/></svg>';
$downloadIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"><path d="M7.25 1.5h1.5v7.4l2.7-2.7 1.05 1.06L8 11.77 3.5 7.26 4.55 6.2l2.7 2.7V1.5ZM2 13h12v1.5H2V13Z" fill="currentColor"/></svg>';
$windowsIcon = '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16"><path d="M1 1h6.5v6.5H1V1Zm7.5 0H15v6.5H8.5V1ZM1 8.5h6.5V15H1V8.5Zm7.5 0H15V15H8.5V8.5Z" fill="currentColor"/></svg>';

// No scripts at all: the JSON-LD block is data, which a policy does not block.
// connect-src lets audit tools such as Lighthouse read robots.txt from the page.
$nonce = csp_nonce();
if (!headers_sent()) {
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'nonce-{$nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
}
?>
<!DOCTYPE html>
<html lang="en-GB">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $e("{$name} | CV | {$headline}") ?></title>
    <meta name="description" content="<?= $e($description) ?>">
    <meta name="author" content="<?= $e($name) ?>">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#f3f3f3">
    <link rel="canonical" href="<?= $u($canonical) ?>">
    <link rel="icon" href="<?= $u(BASE_PATH) ?>favicon.ico" sizes="any">

    <meta property="og:type" content="profile">
    <meta property="og:site_name" content="DeVanté Johnson-Rose · Portfolio OS">
    <meta property="og:title" content="<?= $e("{$name} | CV") ?>">
    <meta property="og:description" content="<?= $e($description) ?>">
    <meta property="og:url" content="<?= $u($canonical) ?>">
    <meta property="og:image" content="<?= $u($shareImage) ?>">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="<?= $e($shareAlt) ?>">
    <meta property="og:locale" content="en_GB">
    <meta property="profile:first_name" content="DeVanté">
    <meta property="profile:last_name" content="Johnson-Rose">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= $e("{$name} | CV") ?>">
    <meta name="twitter:description" content="<?= $e($description) ?>">
    <meta name="twitter:image" content="<?= $u($shareImage) ?>">
    <meta name="twitter:image:alt" content="<?= $e($shareAlt) ?>">

    <style nonce="<?= $u($nonce) ?>">
    :root {
        --bg: #f3f3f3;
        --surface: #ffffff;
        --text: #1b1b1b;
        --muted: #4d4d4d;
        --accent: #005fb8;
        --accent-hover: #004a8f;
        --border: #d1d1d1;
        --tag: #e8eff8;
        color-scheme: light;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { overflow-x: hidden; scrollbar-gutter: stable; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    body {
        margin: 0;
        overflow-x: clip;
        max-width: 100%;
        background: var(--bg);
        color: var(--text);
        font: 400 1rem/1.6 "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
    }
    img, svg { max-width: 100%; }
    img { display: block; height: auto; }
    a { color: var(--accent); text-underline-offset: 0.15em; }
    a:hover { color: var(--accent-hover); }
    :focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
    .visually-hidden {
        position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
        overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .skip-link {
        position: absolute; top: 0.5rem; left: 1rem; z-index: 100;
        padding: 0.75rem 1rem; border-radius: 6px;
        background: var(--surface); color: var(--accent); font-weight: 600;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        transform: translateY(-200%);
    }
    .skip-link:focus { transform: none; }

    /* Sticky header, as on every page of the house style. */
    .site-header {
        position: sticky; top: 0; z-index: 50;
        background: rgba(243, 243, 243, 0.9);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--border);
    }
    .bar {
        max-width: 60rem; height: 3.5rem; margin: 0 auto; padding: 0 1rem;
        display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
    }
    .brand {
        display: none; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-weight: 600;
    }
    .site-header nav { margin-left: auto; }
    .site-header ul { display: flex; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
    .button {
        display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; padding: 0.5rem 0.875rem;
        border: 1px solid var(--border); border-radius: 6px; background: var(--surface);
        color: var(--text); font-weight: 600; line-height: 1.2; text-decoration: none; white-space: nowrap;
    }
    .button:hover { background: #f9f9f9; color: var(--text); }
    .button-primary { background: var(--accent); border-color: var(--accent); color: #ffffff; }
    .button-primary:hover { background: var(--accent-hover); color: #ffffff; }
    .button svg, .external svg { width: 1rem; height: 1rem; flex: none; }

    main { display: block; max-width: 60rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    main:focus { outline: none; }
    section { margin-top: 2.5rem; }
    h1, h2, h3 { line-height: 1.25; }
    h1 { margin: 0; font-size: clamp(1.75rem, 1.2rem + 2.5vw, 2.75rem); letter-spacing: -0.01em; }
    h2 { margin: 0 0 1rem; font-size: 1.375rem; }
    h3 { margin: 0; font-size: 1.0625rem; }
    h4 { margin: 0; font-size: 1rem; }
    p { margin: 0; }

    .intro { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.25rem; margin: 0; }
    .portrait {
        width: 6rem; height: 6rem; border-radius: 50%; object-fit: cover;
        border: 3px solid var(--surface); box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
    }
    .headline { margin-top: 0.25rem; color: var(--accent); font-size: clamp(1.0625rem, 1rem + 0.5vw, 1.25rem); font-weight: 600; }
    .location { margin-top: 0.125rem; color: var(--muted); }
    .nowrap { white-space: nowrap; }
    .summary { max-width: 46rem; margin-top: 1.25rem; font-size: 1.0625rem; }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
    .contact { margin-top: 1.5rem; padding: 1rem; }
    .contact dl { display: grid; gap: 0.75rem; margin: 0; }
    .contact dl > div { display: grid; gap: 0.125rem; }
    .contact dt { color: var(--muted); font-weight: 600; }
    .contact dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
    [data-email] { font-weight: 600; user-select: all; }
    .contact .button { margin-top: 0.25rem; white-space: normal; }

    .stats { display: grid; gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
    .stats li { display: flex; align-items: baseline; gap: 0.75rem; padding: 0.75rem 1rem; }
    .stat-value { color: var(--accent); font-size: clamp(1.5rem, 1.2rem + 1.5vw, 2rem); font-weight: 700; line-height: 1.2; }
    .stat-label { color: var(--muted); line-height: 1.35; }

    .projects { display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }
    .project { display: flex; flex-direction: column; overflow: hidden; }
    .project img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: top; background: #e5e5e5; border-bottom: 1px solid var(--border); }
    .project-body { display: flex; flex: 1; flex-direction: column; gap: 0.5rem; padding: 1rem; }
    .external { display: inline-flex; align-items: center; gap: 0.375rem; }
    .project-domain { color: var(--muted); overflow-wrap: anywhere; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin: auto 0 0; padding: 0.25rem 0 0; list-style: none; }
    .tags li { padding: 0.125rem 0.5rem; border-radius: 999px; background: var(--tag); font-size: 0.875rem; }

    .roles { display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }
    .role { padding: 1rem 1.125rem; }
    .role-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.125rem 1rem; }
    .role-org, .role-period { color: var(--muted); }
    .highlights { margin: 0.75rem 0 0; padding-left: 1.25rem; }
    .highlights li + li { margin-top: 0.25rem; }
    .earlier-title { margin: 2rem 0 0.75rem; font-size: 1.125rem; }
    .highlights-text { margin-top: 0.5rem; }

    .skills { display: grid; gap: 0.75rem; margin: 0; padding: 1rem; }
    .skills dt { font-weight: 600; }
    .skills dd { margin: 0; }
    .inline-list { display: flex; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
    .inline-list li:not(:last-child)::after { content: "\00B7"; margin: 0 0.5rem; color: var(--muted); }
    .plain-list { display: grid; gap: 0.75rem; margin: 0; padding: 1rem; list-style: none; }
    .plain-list .muted { color: var(--muted); }

    .site-footer { padding: 1.5rem 1rem 2rem; border-top: 1px solid var(--border); color: var(--muted); text-align: center; }
    .site-footer p { max-width: 60rem; margin: 0 auto; }

    @media (min-width: 480px) {
        .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .stats li { flex-direction: column; align-items: center; gap: 0.125rem; text-align: center; }
    }
    @media (min-width: 640px) {
        .brand { display: block; }
        .contact dl > div { grid-template-columns: 6.5rem minmax(0, 1fr); align-items: baseline; }
        .projects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .portrait { width: 7rem; height: 7rem; }
    }
    @media (min-width: 768px) {
        .bar { height: 4rem; padding: 0 1.5rem; }
        main { padding: 2.5rem 1.5rem 4rem; }
        .contact, .skills, .plain-list { padding: 1.25rem 1.5rem; }
    }

    @media print {
        @page { margin: 15mm; }
        html, body { background: #ffffff; color: #000000; font-size: 11pt; }
        /* Paper has no use for the navigation, the download or the mail link. */
        .site-header, .skip-link, .project img, .external svg, .print-hide, .contact dl > .print-hide { display: none; }
        .site-header { position: static; }
        main { max-width: none; padding: 0; }
        section { margin-top: 1.25rem; }
        .card { border: 0; padding: 0; }
        .contact, .skills, .plain-list, .role, .project-body { padding: 0; }
        a { color: #000000; text-decoration: none; }
        .stats li, .role, .project { break-inside: avoid; }
        h2 { break-after: avoid; }
    }
    </style>
    <script type="application/ld+json"><?= json_encode($jsonLd, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
</head>
<body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="site-header">
        <div class="bar">
            <p class="brand"><?= $e($name) ?></p>
            <nav aria-label="Site">
                <ul>
                    <li><a class="button" href="<?= $u(BASE_PATH) ?>"><?= $windowsIcon ?>Desktop</a></li>
                    <li><a class="button button-primary" href="<?= $u($pdfHref) ?>" download="<?= $u($pdfName) ?>" type="application/pdf"><?= $downloadIcon ?>Download PDF</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main id="main-content" tabindex="-1">
        <div class="intro">
            <img class="portrait" src="<?= $u(BASE_PATH) ?>assets/img/profile.webp" width="112" height="112" alt="Portrait of <?= $e($name) ?>">
            <div>
                <h1><?= $e($name) ?></h1>
                <p class="headline" data-cv-headline><?= implode(' · ', array_map(fn($part) => '<span class="nowrap">' . $e($part) . '</span>', explode(' · ', $headline))) ?></p>
                <p class="location"><?= $e($profile['location'] ?? '') ?></p>
            </div>
        </div>
        <p class="summary"><?= $e($summary) ?></p>

        <div class="card contact">
            <dl>
                <div>
                    <dt>Email</dt>
                    <dd><span data-email><?= $e($email) ?></span><span class="print-hide"><br><a href="mailto:<?= $u($email) ?>">Write an email</a></span></dd>
                </div>
                <?php if ($phone !== ''): ?>
                <div>
                    <dt>Phone</dt>
                    <dd><a href="tel:<?= $u($phone) ?>" data-phone><?= $e($profile['phone']) ?></a></dd>
                </div>
                <?php endif; ?>
                <?php if (!empty($profile['linkedin'])): ?>
                <div>
                    <dt>LinkedIn</dt>
                    <dd><a class="external" href="<?= $u($profile['linkedin']) ?>" target="_blank" rel="noopener noreferrer"><?= $e(cv_link_label($profile['linkedin'])) ?><?= $newTab ?><?= $externalIcon ?></a></dd>
                </div>
                <?php endif; ?>
                <?php if (!empty($profile['github'])): ?>
                <div>
                    <dt>GitHub</dt>
                    <dd><a class="external" href="<?= $u($profile['github']) ?>" target="_blank" rel="noopener noreferrer"><?= $e(cv_link_label($profile['github'])) ?><?= $newTab ?><?= $externalIcon ?></a></dd>
                </div>
                <?php endif; ?>
                <div class="print-hide">
                    <dt>CV</dt>
                    <dd><a class="button button-primary" href="<?= $u($pdfHref) ?>" download="<?= $u($pdfName) ?>" type="application/pdf"><?= $downloadIcon ?>Download the CV (PDF<?= $e($pdfSize) ?>)</a></dd>
                </div>
            </dl>
        </div>

        <section aria-labelledby="glance-title">
            <h2 id="glance-title">At a glance</h2>
            <ul class="stats">
                <?php foreach ($portfolio['stats'] ?? [] as $stat): ?>
                <li class="card"><span class="stat-value"><?= $e($stat['value'] ?? '') ?></span> <span class="stat-label"><?= $e($stat['label'] ?? '') ?></span></li>
                <?php endforeach; ?>
            </ul>
        </section>

        <section aria-labelledby="projects-title">
            <h2 id="projects-title">Featured projects</h2>
            <ul class="projects">
                <?php foreach ($featured as $project): ?>
                <li class="card project">
                    <?php if (!empty($project['thumbnail'])): ?>
                    <img src="<?= $u(BASE_PATH . $project['thumbnail']) ?>" width="1440" height="900" loading="lazy" decoding="async" alt="The <?= $e($project['title']) ?> home page">
                    <?php endif; ?>
                    <div class="project-body">
                        <h3><a class="external" data-project-link href="<?= $u($project['url']) ?>" target="_blank" rel="noopener noreferrer"><?= $e($project['title']) ?><?= $newTab ?><?= $externalIcon ?></a></h3>
                        <p class="project-domain"><?= $e(rtrim(preg_replace('#^https?://(www\.)?#', '', $project['url']), '/')) ?></p>
                        <p><?= $e($project['description'] ?? '') ?></p>
                        <ul class="tags" aria-label="Built with">
                            <?php foreach ($project['tags'] ?? [] as $tag): ?>
                            <li data-tag><?= $e($tag) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                </li>
                <?php endforeach; ?>
            </ul>
        </section>

        <section aria-labelledby="experience-title">
            <h2 id="experience-title">Experience</h2>
            <ol class="roles">
                <?php foreach ($roles['recent'] as $job): ?>
                <li class="card role">
                    <div class="role-head">
                        <div>
                            <h3><?= $e($job['role'] ?? '') ?></h3>
                            <p class="role-org"><?= $e($job['company'] ?? '') ?><?= empty($job['location']) ? '' : ', ' . $e($job['location']) ?></p>
                        </div>
                        <p class="role-period"><?= $e($job['period'] ?? '') ?></p>
                    </div>
                    <ul class="highlights">
                        <?php foreach (cv_sentences(cv_text((string)($job['highlights'] ?? ''))) as $line): ?>
                        <li><?= $e($line) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </li>
                <?php endforeach; ?>
            </ol>
            <?php if ($roles['earlier']): ?>
            <h3 class="earlier-title">Earlier roles</h3>
            <ol class="roles">
                <?php foreach ($roles['earlier'] as $job): ?>
                <li class="card role">
                    <div class="role-head">
                        <div>
                            <h4 class="role-title"><?= $e($job['role'] ?? '') ?></h4>
                            <p class="role-org"><?= $e($job['company'] ?? '') ?></p>
                        </div>
                        <p class="role-period"><?= $e($job['period'] ?? '') ?></p>
                    </div>
                    <?php if (!empty($job['highlights'])): ?>
                    <p class="highlights-text"><?= $e($job['highlights']) ?></p>
                    <?php endif; ?>
                </li>
                <?php endforeach; ?>
            </ol>
            <?php endif; ?>
        </section>

        <section aria-labelledby="skills-title">
            <h2 id="skills-title">Skills</h2>
            <dl class="card skills">
                <?php foreach ($portfolio['skills'] ?? [] as $group => $list): ?>
                <div>
                    <dt><?= $e($skillLabels[$group] ?? ucfirst((string)$group)) ?></dt>
                    <dd>
                        <ul class="inline-list">
                            <?php foreach ((array)$list as $skill): ?>
                            <li><?= $e($skill) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </dd>
                </div>
                <?php endforeach; ?>
            </dl>
        </section>

        <section aria-labelledby="education-title">
            <h2 id="education-title">Education</h2>
            <ul class="card plain-list">
                <?php foreach ($portfolio['education'] ?? [] as $course): ?>
                <li><strong><?= $e($course['title'] ?? '') ?></strong><br><span class="muted"><?= $e($course['issuer'] ?? '') ?></span></li>
                <?php endforeach; ?>
            </ul>
        </section>

        <section aria-labelledby="certificates-title">
            <h2 id="certificates-title">Certificates</h2>
            <ul class="card plain-list">
                <?php foreach ($certificates as $group): ?>
                <li>
                    <strong><?= $e($group['issuer']) ?></strong><?= $group['years'] === '' ? '' : ' <span class="muted">' . $e($group['years']) . '</span>' ?>
                    <ul class="inline-list">
                        <?php foreach ($group['names'] as $certificate): ?>
                        <li data-certificate><?= $e($certificate) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </li>
                <?php endforeach; ?>
            </ul>
        </section>
    </main>

    <footer class="site-footer">
        <p>This is the plain version of an interactive, Windows-style portfolio. <a href="<?= $u(BASE_PATH) ?>">Open the desktop</a> to explore it.</p>
    </footer>
</body>
</html>
