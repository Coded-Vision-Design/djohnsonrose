<?php
// tests/php/cv_test.php - unit tests for lib/cv.php and the /cv page.
// Run with: php tests/php/cv_test.php (exits non-zero on failure).

require_once __DIR__ . '/../../lib/security.php';
require_once __DIR__ . '/../../lib/cv.php';

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

$root = __DIR__ . '/../..';
$profile = load_shared_data('profile');
$portfolio = load_shared_data('portfolio');

// cv_text: the house style has no em or en dashes.
check('text: a spaced em dash becomes a spaced hyphen', cv_text("Killik & Co \u{2014} Engineer") === 'Killik & Co - Engineer');
check('text: a spaced en dash becomes a spaced hyphen', cv_text("Apr 2025 \u{2013} Present") === 'Apr 2025 - Present');
check('text: an en dash in a range becomes a hyphen', cv_text("2011\u{2013}2017") === '2011-2017');
check('text: an unspaced em dash is spaced', cv_text("site\u{2014}a brochure") === 'site - a brochure');
check('text: leaves plain text alone', cv_text('100+ projects, 99.9% uptime') === '100+ projects, 99.9% uptime');
check('text: leaves an empty string alone', cv_text('') === '');
check('text: survives invalid UTF-8', is_string(cv_text("bad \xC3\x28 byte")));

// cv_featured_projects
$projects = [
    ['title' => 'A', 'url' => 'https://a.example/', 'featured' => true],
    ['title' => 'B', 'url' => 'https://b.example/'],
    ['title' => 'C', 'url' => 'https://c.example/', 'featured' => true],
];
check('featured: keeps only featured projects, in order', array_column(cv_featured_projects($projects), 'title') === ['A', 'C']);
check('featured: respects the limit', count(cv_featured_projects($projects, 1)) === 1);
check('featured: none featured gives none', cv_featured_projects([['title' => 'B', 'url' => 'https://b.example/']]) === []);
check('featured: skips entries with no link', cv_featured_projects([['title' => 'X', 'featured' => true], 'junk']) === []);
check('featured: skips links that are not http', cv_featured_projects([['title' => 'X', 'url' => 'javascript:alert(1)', 'featured' => true]]) === []);
$featured = cv_featured_projects($portfolio['projects'] ?? []);
check('featured: the data has four', count($featured) === 4);
check('featured: they are the four marked in the data', array_column($featured, 'url') === array_values(array_column(array_filter($portfolio['projects'], fn($p) => !empty($p['featured'])), 'url')));

// cv_start_year
check('start year: month and year', cv_start_year('Apr 2025 - Present') === 2025);
check('start year: year only', cv_start_year('2013 - Present') === 2013);
check('start year: no year', cv_start_year('Present') === null);
check('start year: empty', cv_start_year('') === null);

// cv_split_experience
$split = cv_split_experience([
    ['company' => 'New', 'period' => 'Mar 2017 - Mar 2020'],
    ['company' => 'Old', 'period' => 'Aug 2016 - Feb 2017'],
    ['company' => 'Undated', 'period' => ''],
    ['company' => 'Ongoing', 'period' => '2013 - Present'],
]);
check('experience: recent roles start in or after the cutoff, or are ongoing', array_column($split['recent'], 'company') === ['New', 'Undated', 'Ongoing']);
check('experience: earlier roles start before it', array_column($split['earlier'], 'company') === ['Old']);
check('experience: nothing in, nothing out', cv_split_experience([]) === ['recent' => [], 'earlier' => []]);
$real = cv_split_experience($portfolio['experience'] ?? []);
check('experience: the current role leads', ($real['recent'][0]['company'] ?? '') === 'Killik & Co');
check('experience: the freelance work stays with the recent roles', in_array('Coded Vision Design', array_column($real['recent'], 'company'), true));
check('experience: every role is kept', count($real['recent']) + count($real['earlier']) === count($portfolio['experience']));

// cv_sentences
check('sentences: splits a paragraph', cv_sentences('Did one thing. Did 2 more. Saved £500K.') === ['Did one thing.', 'Did 2 more.', 'Saved £500K.']);
check('sentences: keeps decimals whole', cv_sentences('Kept 99.9% uptime. Done.') === ['Kept 99.9% uptime.', 'Done.']);
check('sentences: empty gives none', cv_sentences('   ') === []);

// cv_certificate_groups
$groups = cv_certificate_groups([
    ['name' => 'A+', 'issuer' => 'CompTIA', 'year' => '2011-2025'],
    ['name' => 'MCSA', 'issuer' => 'Microsoft', 'year' => '2012-2013'],
    ['name' => 'Server+ ce', 'issuer' => 'CompTIA', 'year' => '2025'],
]);
check('certificates: grouped by issuer, in order', array_column($groups, 'issuer') === ['CompTIA', 'Microsoft']);
check('certificates: names stay with their issuer', $groups[0]['names'] === ['A+', 'Server+ ce']);
check('certificates: years span the group', $groups[0]['years'] === '2011-2025');
check('certificates: a single year stays single', cv_certificate_groups([['name' => 'X', 'issuer' => 'I', 'year' => '2026']])[0]['years'] === '2026');
check('certificates: no issuer is skipped', cv_certificate_groups([['name' => 'X']]) === []);
$certCount = array_sum(array_map(fn($g) => count($g['names']), cv_certificate_groups($portfolio['certifications'] ?? [])));
check('certificates: every one in the data is listed', $certCount === count($portfolio['certifications']));

// cv_same_as
check('sameAs: LinkedIn alone, when there is no GitHub', cv_same_as(['github' => '', 'linkedin' => 'https://www.linkedin.com/in/x']) === ['https://www.linkedin.com/in/x']);
check('sameAs: GitHub and LinkedIn', cv_same_as(['github' => 'https://github.com/x', 'linkedin' => 'https://www.linkedin.com/in/x']) === ['https://github.com/x', 'https://www.linkedin.com/in/x']);
check('sameAs: ignores anything that is not a link', cv_same_as(['github' => 'not a url']) === []);

// cv_tel: a UK number as written on the CV, in the international form a tel: link and schema.org want.
check('tel: a UK mobile as the CV writes it', cv_tel('07429 490 333') === '+447429490333');
check('tel: already international', cv_tel('+44 7429 490333') === '+447429490333');
check('tel: keeps only digits', cv_tel('(01206) 123-456') === '+441206123456');
check('tel: empty gives empty', cv_tel('') === '');
check('tel: words give empty', cv_tel('call me') === '');
check('tel: too short gives empty', cv_tel('0123') === '');

// cv_link_label: a profile address as people read it.
check('label: drops the scheme, www and the closing slash', cv_link_label('https://www.linkedin.com/in/someone/') === 'linkedin.com/in/someone');
check('label: shows accented letters, not their codes', cv_link_label('https://www.linkedin.com/in/devant%C3%A9-johnson-rose-b5303a47/') === 'linkedin.com/in/devanté-johnson-rose-b5303a47');
check('label: a bare domain', cv_link_label('https://example.com') === 'example.com');
check('label: empty gives empty', cv_link_label('') === '');
check('label: broken escapes stay as they are', cv_link_label('https://example.com/%E9') === 'example.com/%E9');

// cv_person_schema
$person = cv_person_schema($profile, 'Role', 'me@example.com');
check('person: has the shared id', $person['@id'] === 'https://devante.johnson-rose.co.uk/#person');
check('person: has the job title given', $person['jobTitle'] === 'Role');
check('person: has the email', $person['email'] === 'mailto:me@example.com');
check('person: has the phone, in international form', ($person['telephone'] ?? '') === cv_tel($profile['phone']));
check('person: has no phone when the data has none', !array_key_exists('telephone', cv_person_schema(['phone' => ''] + $profile, 'Role', 'me@example.com')));
check('person: works for the current employers', array_column($person['worksFor'], 'name') === $profile['worksFor']);
check('person: is an alumnus of the university', $person['alumniOf']['name'] === $profile['alumniOf']);
check('person: knows about things', count($person['knowsAbout']) >= 10);
check('person: links LinkedIn', in_array($profile['linkedin'], $person['sameAs'], true));

// data/profile.json is the structured copy of the CV header. It must not drift
// from the Word app's CV (data/cv.php) or invent skills the CV does not claim.
$cvPhp = html_entity_decode((string)file_get_contents("{$root}/data/cv.php"), ENT_QUOTES | ENT_HTML5, 'UTF-8');
$portfolioText = (string)file_get_contents("{$root}/data/portfolio.json");
check('profile: the name matches the CV', str_contains($cvPhp, $profile['name'] ?? '?'));
check('profile: the headline is the one the owner chose', ($profile['headline'] ?? '') === 'Full Stack Developer');
preg_match('#<h1[^>]*>[^<]*</h1>\s*<p[^>]*>([^<]*)</p>#', $cvPhp, $cvHeadline);
check('profile: the headline heads the CV', ($cvHeadline[1] ?? '') === ($profile['headline'] ?? '?'));
check('profile: the location matches the CV', str_contains($cvPhp, $profile['location'] ?? '?'));
check('profile: the phone is the one on the CV', ($profile['phone'] ?? '') !== '' && str_contains($cvPhp, "☎ {$profile['phone']} ·"));
check('profile: LinkedIn is the owner\'s profile', ($profile['linkedin'] ?? '') === 'https://www.linkedin.com/in/devant%C3%A9-johnson-rose-b5303a47/');
check('profile: the CV links LinkedIn', str_contains($cvPhp, 'href="' . ($profile['linkedin'] ?? '?') . '"') && str_contains($cvPhp, '>' . cv_link_label($profile['linkedin'] ?? '?') . '</a>'));
foreach ($profile['knowsAbout'] ?? [] as $skill) {
    check("profile: the CV claims {$skill}", stripos($cvPhp, $skill) !== false || stripos($portfolioText, $skill) !== false);
}
foreach ($profile['worksFor'] ?? [] as $employer) {
    $current = array_filter($portfolio['experience'], fn($j) => str_contains($j['company'], $employer) && str_ends_with($j['period'], 'Present'));
    check("profile: {$employer} is a current role", count($current) === 1);
}

// The Word app's CV counts its certifications in the heading: "/ 20". Each
// issuer's certificates are one line, separated by middle dots.
$cvRaw = (string)file_get_contents("{$root}/data/cv.php");
preg_match('#CERTIFICATIONS <span[^>]*>/ (\d+)</span></h2>(.*?)</section>#s', $cvRaw, $certSection);
preg_match_all('#<span class="text-gray-600">(.*?)</span>#s', $certSection[2] ?? '', $certLines);
$cvCertificates = [];
foreach ($certLines[1] as $line) array_push($cvCertificates, ...explode(' · ', trim($line)));
check('certificates: the CV heading has a count', isset($certSection[1]));
check('certificates: the CV heading counts every certificate it lists', (int)($certSection[1] ?? -1) === count($cvCertificates));
check('certificates: the CV lists as many as the data', count($cvCertificates) === count($portfolio['certifications']));
check('certificates: there are 20', count($cvCertificates) === 20);

// The share image used by og:image and twitter:image.
$share = @getimagesize("{$root}/assets/img/share-card.png");
check('share image: exists', is_array($share));
check('share image: is 1200x630', is_array($share) && $share[0] === 1200 && $share[1] === 630);
check('share image: is a PNG', is_array($share) && $share['mime'] === 'image/png');
check('share image: is small enough for every network', @filesize("{$root}/assets/img/share-card.png") < 1024 * 1024);

// The page itself, rendered as the router would.
if (!defined('BASE_PATH')) define('BASE_PATH', '/');
$config = ['email' => 'devante@johnson-rose.co.uk'];
ob_start();
include "{$root}/partials/cv-page.php";
$html = (string)ob_get_clean();

check('page: is a full document', str_starts_with(ltrim($html), '<!DOCTYPE html>'));
check('page: is in British English', str_contains($html, '<html lang="en-GB"'));
check('page: has its own canonical', str_contains($html, '<link rel="canonical" href="https://devante.johnson-rose.co.uk/cv">'));
check('page: names the person', (bool)preg_match('/<h1[^>]*>\s*DeVanté Johnson-Rose\s*<\/h1>/u', $html));
preg_match('/<p [^>]*data-cv-headline[^>]*>(.*?)<\/p>/s', $html, $headlineTag);
check('page: shows the CV headline', html_entity_decode(strip_tags($headlineTag[1] ?? '')) === $profile['headline']);
check('page: keeps each part of the headline on one line', substr_count($headlineTag[1] ?? '', 'class="nowrap"') === count(explode(' · ', $profile['headline'])));
check('page: shows the summary', str_contains($html, htmlspecialchars(cv_text($portfolio['summary']))));
check('page: shows the email as text', (bool)preg_match('/<span[^>]*data-email[^>]*>devante@johnson-rose\.co\.uk<\/span>/', $html));
check('page: offers a mailto link', str_contains($html, 'href="mailto:devante@johnson-rose.co.uk"'));
check('page: shows the phone as a tel: link', (bool)preg_match('/<a [^>]*href="tel:' . preg_quote(cv_tel($profile['phone']), '/') . '"[^>]*data-phone[^>]*>' . preg_quote($profile['phone'], '/') . '<\/a>/', $html));
check('page: links LinkedIn by its readable address', (bool)preg_match('/<a [^>]*href="' . preg_quote($profile['linkedin'], '/') . '"[^>]*>' . preg_quote(cv_link_label($profile['linkedin']), '/') . '</', $html));
check('page: links the PDF', str_contains($html, 'href="/data/cv.pdf"'));
foreach ($featured as $p) {
    check("page: links {$p['title']} in a new tab", (bool)preg_match('/<a [^>]*href="' . preg_quote(htmlspecialchars($p['url']), '/') . '"[^>]*target="_blank" rel="noopener noreferrer"/', $html));
}
check('page: every stat is shown', count(array_filter($portfolio['stats'], fn($s) => str_contains($html, htmlspecialchars($s['value'])))) === count($portfolio['stats']));
check('page: every role is shown', count(array_filter($portfolio['experience'], fn($j) => str_contains($html, htmlspecialchars(cv_text($j['company']))))) === count($portfolio['experience']));
check('page: education is shown', str_contains($html, 'University of East Anglia'));
check('page: has a skip link', str_contains($html, 'href="#main-content"') && str_contains($html, '<main id="main-content"'));
check('page: has a sticky header', (bool)preg_match('/\.site-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/', $html));
check('page: has a print stylesheet', str_contains($html, '@media print'));
check('page: shares the share image', str_contains($html, '<meta property="og:image" content="https://devante.johnson-rose.co.uk/assets/img/share-card.png">') && str_contains($html, '<meta name="twitter:image" content="https://devante.johnson-rose.co.uk/assets/img/share-card.png">'));
check('page: runs no scripts', preg_match_all('/<script(?![^>]*type="application\/ld\+json")/', $html) === 0);
preg_match_all('/\ssrc="([^"]*)"/', $html, $sources);
check('page: loads images from this site only', $sources[1] !== [] && array_filter($sources[1], fn($s) => !str_starts_with($s, '/')) === []);
preg_match_all('/<link [^>]*>/', $html, $links);
check('page: loads no stylesheet or font from elsewhere', array_filter($links[0], fn($l) => preg_match('/href="(?!\/|https:\/\/devante\.johnson-rose\.co\.uk\/)/', $l)) === []);
check('page: imports nothing in its CSS', !preg_match('/@import|url\(\s*["\']?https?:/', $html));
check('page: has no em or en dashes', !preg_match('/[\x{2013}\x{2014}]/u', $html));
preg_match('/<script type="application\/ld\+json">(.*?)<\/script>/s', $html, $ld);
$graph = json_decode($ld[1] ?? '', true)['@graph'] ?? [];
$types = array_column($graph, '@type');
check('page: structured data is a profile page', in_array('ProfilePage', $types, true));
$pagePerson = $graph[array_search('Person', $types, true)] ?? [];
check('page: structured data uses the CV headline', ($pagePerson['jobTitle'] ?? '') === $profile['headline']);
check('page: structured data matches the shared person', ($pagePerson['knowsAbout'] ?? null) === $person['knowsAbout'] && ($pagePerson['sameAs'] ?? null) === $person['sameAs']);
check('page: structured data has the phone', ($pagePerson['telephone'] ?? '') === cv_tel($profile['phone']));

echo "{$passes} passed, {$failures} failed\n";
exit($failures === 0 ? 0 : 1);
