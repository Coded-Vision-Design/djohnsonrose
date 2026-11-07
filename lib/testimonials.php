<?php
// lib/testimonials.php - the Testimonials widget in both builds. Widgets hides
// it while data/testimonials.json is empty, and that is how it stays until
// there are real ones: never invent one. See tests/php/testimonials_test.php.
//
// data/testimonials.json is a JSON array. Each entry is an object:
//   "quote"   what they said, in their own words (required)
//   "name"    who said it (required)
//   "role"    their job title (text, may be "")
//   "company" where they work (text, may be "")
//   "link"    optional: an https:// address for them, such as their LinkedIn
// For example:
//   [{ "quote": "...", "name": "...", "role": "...", "company": "...", "link": "https://..." }]
// An entry without a quote or a name is left out, as is a link that is not https.

const TESTIMONIALS_FILE = __DIR__ . '/../data/testimonials.json';

/** Text with its ends trimmed, or '' when it is not text. */
function testimonials_text($value): string {
    return is_string($value) ? trim($value) : '';
}

/** The testimonials worth showing from the decoded file, each with only the documented fields. */
function testimonials_from_data($data): array {
    if (!is_array($data) || !array_is_list($data)) return [];

    $shown = [];
    foreach ($data as $entry) {
        if (!is_array($entry)) continue;
        $item = [
            'quote' => testimonials_text($entry['quote'] ?? null),
            'name' => testimonials_text($entry['name'] ?? null),
            'role' => testimonials_text($entry['role'] ?? null),
            'company' => testimonials_text($entry['company'] ?? null),
        ];
        if ($item['quote'] === '' || $item['name'] === '') continue;

        $link = testimonials_text($entry['link'] ?? null);
        if (filter_var($link, FILTER_VALIDATE_URL) !== false
            && strtolower((string)parse_url($link, PHP_URL_SCHEME)) === 'https'
            && (string)parse_url($link, PHP_URL_HOST) !== '') {
            $item['link'] = $link;
        }
        $shown[] = $item;
    }
    return $shown;
}

/** The testimonials in a file. A missing or broken file has none, so the widget stays hidden. */
function testimonials_load(string $path = TESTIMONIALS_FILE): array {
    $raw = is_file($path) ? @file_get_contents($path) : false;
    return is_string($raw) ? testimonials_from_data(json_decode($raw, true)) : [];
}
