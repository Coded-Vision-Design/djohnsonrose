<?php
// lib/cv.php - the data behind the recruiter CV page, /cv. Pure functions over
// data/portfolio.json and data/profile.json, so that they can be unit tested;
// see tests/php/cv_test.php. The page itself is partials/cv-page.php.

/**
 * Text for the page in the house style, which has no em or en dashes: a spaced
 * dash becomes a spaced hyphen, and an en dash in a range becomes a hyphen.
 */
function cv_text(string $text): string {
    $out = preg_replace(['/\s*\x{2014}\s*/u', '/\s+\x{2013}\s+/u', '/\x{2013}/u'], [' - ', ' - ', '-'], $text);
    return is_string($out) ? $out : $text;
}

/** The projects marked featured, in the data's order, each with a web link. */
function cv_featured_projects(array $projects, int $limit = 4): array {
    $featured = array_filter($projects, fn($p) =>
        is_array($p)
        && ($p['featured'] ?? false) === true
        && is_string($p['title'] ?? null)
        && preg_match('#^https?://#', (string)($p['url'] ?? '')));
    return array_slice(array_values($featured), 0, $limit);
}

/** The year a period such as "Apr 2025 - Present" starts, or null. */
function cv_start_year(string $period): ?int {
    return preg_match('/\b(19|20)\d{2}\b/', $period, $m) ? (int)$m[0] : null;
}

/**
 * Roles split into recent ones and earlier ones that started before $cutoff,
 * as the Word CV does. A role with no date, or one still going, is recent.
 */
function cv_split_experience(array $experience, int $cutoff = 2017): array {
    $split = ['recent' => [], 'earlier' => []];
    foreach ($experience as $job) {
        $period = (string)($job['period'] ?? '');
        $year = cv_start_year($period);
        $ongoing = (bool)preg_match('/present\s*$/i', $period);
        $split[$year !== null && $year < $cutoff && !$ongoing ? 'earlier' : 'recent'][] = $job;
    }
    return $split;
}

/** A paragraph of highlights as a list of sentences. */
function cv_sentences(string $text): array {
    $parts = preg_split('/(?<=[.!?])\s+(?=[A-Z0-9£(])/u', trim($text));
    return array_values(array_filter(is_array($parts) ? $parts : [], fn($s) => trim($s) !== ''));
}

/** Certificates grouped by issuer, in the data's order, with the years they span. */
function cv_certificate_groups(array $certificates): array {
    $groups = [];
    foreach ($certificates as $cert) {
        $issuer = (string)($cert['issuer'] ?? '');
        if ($issuer === '') continue;
        $groups[$issuer] ??= ['issuer' => $issuer, 'names' => [], 'from' => PHP_INT_MAX, 'to' => 0];
        $groups[$issuer]['names'][] = (string)($cert['name'] ?? '');
        preg_match_all('/\b(?:19|20)\d{2}\b/', (string)($cert['year'] ?? ''), $years);
        foreach ($years[0] as $year) {
            $groups[$issuer]['from'] = min($groups[$issuer]['from'], (int)$year);
            $groups[$issuer]['to'] = max($groups[$issuer]['to'], (int)$year);
        }
    }
    return array_map(function ($g) {
        $years = $g['to'] === 0 ? '' : ($g['from'] === $g['to'] ? (string)$g['to'] : "{$g['from']}-{$g['to']}");
        return ['issuer' => $g['issuer'], 'names' => $g['names'], 'years' => $years];
    }, array_values($groups));
}

/** The public profiles for sameAs: GitHub, and LinkedIn when the data has one. */
function cv_same_as(array $profile): array {
    $links = [$profile['github'] ?? '', $profile['linkedin'] ?? ''];
    return array_values(array_filter($links, fn($url) => is_string($url) && preg_match('#^https://#', $url)));
}

/**
 * The schema.org Person. The desktops (partials/shell.php, v2/index.html) carry
 * the same node, written out by hand; v2/src/data/profile.test.ts keeps them in
 * step with data/profile.json.
 */
function cv_person_schema(array $profile, string $jobTitle, string $email): array {
    return [
        '@type' => 'Person',
        '@id' => $profile['url'] . '#person',
        'name' => $profile['name'],
        'url' => $profile['url'],
        'image' => $profile['image'],
        'jobTitle' => $jobTitle,
        'email' => 'mailto:' . $email,
        'worksFor' => array_map(fn($name) => ['@type' => 'Organization', 'name' => $name], $profile['worksFor'] ?? []),
        'alumniOf' => ['@type' => 'CollegeOrUniversity', 'name' => $profile['alumniOf'] ?? ''],
        'knowsAbout' => $profile['knowsAbout'] ?? [],
        'sameAs' => cv_same_as($profile),
    ];
}
