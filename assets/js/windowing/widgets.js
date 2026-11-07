// What the Widgets panel shows for this site's recent changes and for
// testimonials, shared by both builds. api/activity.php sends only each
// commit's first line, short SHA and date, and api/testimonials.php only the
// documented fields of data/testimonials.json (see lib/testimonials.php).

/** How many recent changes Widgets lists. api/activity.php sends no more. */
export const ACTIVITY_SHOWN = 5;

const LONDON_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/London',
});

const toTime = (date) => (typeof date === 'string' ? Date.parse(date) : Number.NaN);
const ago = (n, unit) => (n === 1 ? `1 ${unit} ago` : `${n} ${unit}s ago`);

/**
 * How long ago a date was, in words: "just now", "5 minutes ago", "yesterday",
 * "2 weeks ago", "3 months ago". A time a little ahead, from a clock that is
 * out, is "just now". '' for something that is not a date.
 */
export function timeAgo(date, now = Date.now()) {
  const time = toTime(date);
  if (!Number.isFinite(time)) return '';
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return ago(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ago(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return ago(Math.floor(days / 7), 'week');
  if (days < 365) return ago(Math.max(1, Math.floor(days / 30)), 'month');
  return ago(Math.floor(days / 365), 'year');
}

/** A date in full, day first, as it was in London: "6 November 2026". '' for something that is not a date. */
export function fullDate(date) {
  const time = toTime(date);
  return Number.isFinite(time) ? LONDON_DATE.format(time) : '';
}

/**
 * The commits to list from an api/activity.php answer, at most
 * ACTIVITY_SHOWN, each only { message, sha, date }. Broken entries are left
 * out. Null when there is nothing to show.
 */
export function activityFromApi(data) {
  const commits = Array.isArray(data?.commits) ? data.commits : [];
  const shown = [];
  for (const commit of commits) {
    const { message, sha, date } = commit ?? {};
    if (typeof message !== 'string' || !message.trim()) continue;
    if (typeof sha !== 'string' || !/^[0-9a-f]{7,40}$/.test(sha)) continue;
    if (!Number.isFinite(toTime(date))) continue;
    shown.push({ message: message.trim(), sha: sha.slice(0, 7), date });
    if (shown.length === ACTIVITY_SHOWN) break;
  }
  return shown.length ? shown : null;
}

/**
 * Whether opening Widgets should ask for the recent changes: on the first
 * opening and after a failure, but not once they have loaded or while they
 * are loading. The server keeps its answer for half an hour anyway.
 */
export function activityNeedsLoading(status) {
  return status !== 'ready' && status !== 'loading';
}

/**
 * The commits in a reply from api/activity.php, or an error. The body is read
 * either way, as weatherFromResponse does, so Chrome lets the request go.
 */
export async function activityFromResponse(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const commits = activityFromApi(data);
  if (!commits) throw new Error('No recent changes');
  return commits;
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function httpsLink(value) {
  if (typeof value !== 'string' || !value.startsWith('https://')) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname ? value : null;
  } catch {
    return null;
  }
}

/**
 * The testimonials to show from an api/testimonials.php answer, each
 * { quote, name, role, company } and a link only when it is https. One
 * without a quote or a name is left out.
 */
export function testimonialsFromApi(data) {
  const entries = Array.isArray(data?.testimonials) ? data.testimonials : [];
  const shown = [];
  for (const entry of entries) {
    const quote = text(entry?.quote);
    const name = text(entry?.name);
    if (!quote || !name) continue;
    const item = { quote, name, role: text(entry.role), company: text(entry.company) };
    const link = httpsLink(entry.link);
    if (link) item.link = link;
    shown.push(item);
  }
  return shown;
}

/** The testimonials in a reply from api/testimonials.php. Any failure gives none, which hides the widget. */
export async function testimonialsFromResponse(res) {
  const data = await res.json().catch(() => null);
  return res.ok ? testimonialsFromApi(data) : [];
}

/** Which testimonial to show after stepping `by` from `index`, going round at either end. */
export function stepTestimonial(index, by, count) {
  if (!(count > 0)) return 0;
  const from = Number.isFinite(index) ? index : 0;
  return (((from + by) % count) + count) % count;
}

/** The line under a testimonial's name: "Role, Company", leaving out what is blank. */
export function testimonialByline(testimonial) {
  return [testimonial?.role, testimonial?.company].filter((part) => typeof part === 'string' && part).join(', ');
}
