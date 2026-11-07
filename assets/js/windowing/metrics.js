// What Task Manager shows, in both builds. Every figure comes from the browser
// (Web Vitals from PerformanceObserver, downloads from Resource Timing, the
// heap from performance.memory) or from the build.json the deploy writes.
// Nothing here makes a number up: a figure the browser does not give is
// shown as not measured.

// Google's thresholds: up to the first is good, over the second is poor.
// https://web.dev/articles/vitals
export const VITAL_THRESHOLDS = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FID: [100, 300],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export const RATING_COLOURS = { good: '#0cce6b', 'needs-improvement': '#ffa400', poor: '#ff4e42' };
export const RATING_LABELS = { good: 'Good', 'needs-improvement': 'Needs improvement', poor: 'Poor' };

const VITAL_NAMES = {
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  INP: 'Interaction to Next Paint',
  FID: 'First Input Delay',
  FCP: 'First Contentful Paint',
  TTFB: 'Time to First Byte',
};

export const TASK_MANAGER_TABS = [
  { id: 'processes', label: 'Processes' },
  { id: 'performance', label: 'Performance' },
  { id: 'build', label: 'Build' },
];

/** The tab to move to for a key pressed on the tab list, or null. */
export function tabAfterKey(key, index, count) {
  if (!(count > 0)) return null;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

const isMeasure = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** good, needs-improvement or poor for a vital's value, or null when it is not a measurement. */
export function rateVital(id, value) {
  const thresholds = VITAL_THRESHOLDS[id];
  if (!thresholds || !isMeasure(value)) return null;
  if (value > thresholds[1]) return 'poor';
  if (value > thresholds[0]) return 'needs-improvement';
  return 'good';
}

/** 123 ms below a second, 1.23 s from there. */
export function formatDuration(ms) {
  if (!isMeasure(ms)) return '';
  const rounded = Math.round(ms);
  return rounded < 1000 ? `${rounded} ms` : `${(ms / 1000).toFixed(2)} s`;
}

/** Sizes in powers of 1000, as Chrome's DevTools shows them. */
export function formatBytes(bytes) {
  if (!isMeasure(bytes)) return '';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 999_950) return `${(bytes / 1000).toFixed(1)} kB`;
  if (bytes < 999_995_000) return `${(bytes / 1e6).toFixed(2)} MB`;
  return `${(bytes / 1e9).toFixed(2)} GB`;
}

/** A vital's value as shown: layout shift is a score, the rest are times. */
export function formatVitalValue(id, value) {
  if (!isMeasure(value)) return '';
  if (id !== 'CLS') return formatDuration(value);
  if (value === 0) return '0';
  return value < 0.001 ? '< 0.001' : value.toFixed(3);
}

/** "Good up to 2.50 s, poor over 4.00 s" */
export function vitalThresholdText(id) {
  const thresholds = VITAL_THRESHOLDS[id];
  if (!thresholds) return '';
  const show = (value) => (id === 'CLS' ? String(value) : formatDuration(value));
  return `Good up to ${show(thresholds[0])}, poor over ${show(thresholds[1])}`;
}

/**
 * Cumulative Layout Shift: the worst burst of shifts, where a burst ends after
 * a second with no shift or five seconds in all. Shifts just after input do not
 * count, as the visitor caused them.
 */
export function clsFromShifts(shifts) {
  let worst = 0;
  let burst = 0;
  let first = 0;
  let last = 0;
  for (const shift of Array.isArray(shifts) ? shifts : []) {
    if (!shift || shift.hadRecentInput || !isMeasure(shift.value) || !Number.isFinite(shift.startTime)) continue;
    if (burst > 0 && shift.startTime - last < 1000 && shift.startTime - first < 5000) {
      burst += shift.value;
    } else {
      burst = shift.value;
      first = shift.startTime;
    }
    last = shift.startTime;
    worst = Math.max(worst, burst);
  }
  return worst;
}

/**
 * Interaction to Next Paint: the slowest interaction, taking the longest event
 * in each, after leaving out one slowest interaction for every fifty. The
 * browser's own count of interactions is used when it knows more of them.
 */
export function inpFromEvents(events, interactionCount = 0) {
  const longest = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || !(event.interactionId > 0) || !isMeasure(event.duration)) continue;
    longest.set(event.interactionId, Math.max(longest.get(event.interactionId) ?? 0, event.duration));
  }
  if (longest.size === 0) return null;
  const slowest = [...longest.values()].sort((a, b) => b - a);
  const count = Math.max(longest.size, Number(interactionCount) || 0);
  return slowest[Math.min(Math.floor(count / 50), slowest.length - 1)];
}

// Room for every download in a long visit; the browser keeps 250 by default.
const RESOURCE_BUFFER = 2000;

/**
 * Starts watching the page's Web Vitals. Each observer asks for the entries
 * from before it started (buffered), so it can start after the page loads,
 * though interactions before it starts are only kept if they were slow.
 * The browser parts can be passed in, for tests.
 */
export function createVitalsCollector(env = {}) {
  const PO = 'PerformanceObserver' in env ? env.PerformanceObserver : globalThis.PerformanceObserver;
  const perf = 'performance' in env ? env.performance : globalThis.performance;
  const doc = 'document' in env ? env.document : globalThis.document;
  const EventTiming = 'PerformanceEventTiming' in env ? env.PerformanceEventTiming : globalThis.PerformanceEventTiming;

  const types = (PO && Array.isArray(PO.supportedEntryTypes) && PO.supportedEntryTypes) || [];
  const has = (type) => types.includes(type);
  const navigation = () => perf?.getEntriesByType?.('navigation')?.[0] ?? null;
  const activationStart = Number(navigation()?.activationStart) || 0;
  const sinceActivation = (time) => Math.max(time - activationStart, 0);

  // Paints after the page was first hidden are not what the visitor saw load.
  let firstHidden = doc?.visibilityState === 'hidden' ? 0 : Infinity;
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden' && firstHidden === Infinity) firstHidden = perf?.now?.() ?? 0;
  };
  doc?.addEventListener?.('visibilitychange', onVisibility, true);

  let resourcesFull = false;
  const onFull = () => {
    resourcesFull = true;
  };
  try {
    perf?.setResourceTimingBufferSize?.(RESOURCE_BUFFER);
    perf?.addEventListener?.('resourcetimingbufferfull', onFull);
  } catch {
    // An old browser without these keeps its own list size.
  }

  let lcp = null;
  let fcp = null;
  let firstInput = null;
  let seenPaintBeforeHidden = false;
  const shifts = [];
  const interactions = [];

  const handlers = {
    'largest-contentful-paint': (entry) => {
      if (entry.startTime < firstHidden) lcp = entry;
    },
    'layout-shift': (entry) => {
      if (!entry.hadRecentInput) shifts.push({ value: entry.value, startTime: entry.startTime });
    },
    event: (entry) => {
      if (entry.interactionId > 0) interactions.push({ interactionId: entry.interactionId, duration: entry.duration });
    },
    'first-input': (entry) => {
      if (!firstInput) firstInput = entry;
      if (entry.interactionId > 0) interactions.push({ interactionId: entry.interactionId, duration: entry.duration });
    },
    paint: (entry) => {
      if (entry.name !== 'first-contentful-paint' || fcp) return;
      if (entry.startTime < firstHidden) {
        fcp = entry;
        seenPaintBeforeHidden = true;
      }
    },
  };

  const interactionIds = !!EventTiming?.prototype && 'interactionId' in EventTiming.prototype;
  const watched = [];
  const watch = (type, options = {}) => {
    if (!has(type)) return;
    try {
      const observer = new PO((list) => list.getEntries().forEach(handlers[type]));
      observer.observe({ type, buffered: true, ...options });
      watched.push({ type, observer });
    } catch {
      // A browser that lists a type it then refuses is treated as without it.
    }
  };
  watch('largest-contentful-paint');
  watch('layout-shift');
  if (interactionIds) watch('event', { durationThreshold: 16 });
  watch('first-input');
  watch('paint');

  // Entries the browser has queued but not yet handed over, so a read never lags.
  const flush = () => {
    for (const { type, observer } of watched) observer.takeRecords?.().forEach(handlers[type]);
  };

  return {
    read() {
      flush();
      const nav = navigation();
      const hidden = firstHidden !== Infinity;
      const interactionCount = Number(perf?.interactionCount) || 0;
      const inpValue = inpFromEvents(interactions, interactionCount);
      const interaction = interactionIds && has('event')
        ? { id: 'INP', supported: true, value: inpValue, under: inpValue === null && interactionCount > 0 }
        : has('first-input')
          ? {
              id: 'FID',
              supported: true,
              value: firstInput ? Math.max(firstInput.processingStart - firstInput.startTime, 0) : null,
              under: false,
            }
          : { id: 'INP', supported: false, value: null, under: false };
      return {
        LCP: {
          supported: has('largest-contentful-paint'),
          value: lcp ? sinceActivation(lcp.startTime) : null,
          hidden: !lcp && hidden && has('largest-contentful-paint'),
        },
        CLS: { supported: has('layout-shift'), value: has('layout-shift') ? clsFromShifts(shifts) : null },
        interaction,
        FCP: {
          supported: has('paint'),
          value: fcp ? sinceActivation(fcp.startTime) : null,
          hidden: !seenPaintBeforeHidden && hidden && has('paint'),
        },
        TTFB: nav && nav.responseStart > 0
          ? { supported: true, value: sinceActivation(nav.responseStart) }
          : { supported: false, value: null },
        resourcesFull,
      };
    },
    stop() {
      for (const { observer } of watched) observer.disconnect();
      watched.length = 0;
      doc?.removeEventListener?.('visibilitychange', onVisibility, true);
      perf?.removeEventListener?.('resourcetimingbufferfull', onFull);
    },
  };
}

let pageVitals = null;

/** The page's one collector, started on first use. Both builds start it as they boot. */
export function startVitals() {
  if (!pageVitals) pageVitals = createVitalsCollector();
  return pageVitals;
}

const NOT_MEASURED = 'Not measured in this browser';

function card(id, state, value, note = '') {
  const rating = state === 'measured' && isMeasure(value) ? rateVital(id, value) : null;
  return {
    id,
    name: VITAL_NAMES[id],
    state,
    value: state === 'measured' && isMeasure(value) ? formatVitalValue(id, value) : value,
    rating: rating ?? 'none',
    ratingLabel: rating ? RATING_LABELS[rating] : '',
    colour: rating ? RATING_COLOURS[rating] : null,
    scale: vitalThresholdText(id),
    note,
  };
}

/** The five vitals as cards, in the order Google lists them, from a collector's read(). */
export function vitalCards(reading) {
  const paint = (id, metric, waiting) => {
    if (!metric?.supported) return card(id, 'unsupported', NOT_MEASURED);
    if (isMeasure(metric.value)) return card(id, 'measured', metric.value);
    if (metric.hidden) return card(id, 'waiting', 'Not measured', 'The page loaded in a background tab, so its paints do not count.');
    return card(id, 'waiting', waiting);
  };

  const interaction = reading?.interaction;
  let input;
  if (!interaction?.supported) {
    input = card('INP', 'unsupported', NOT_MEASURED);
  } else if (interaction.id === 'FID') {
    const note = 'This browser cannot measure Interaction to Next Paint, so this is First Input Delay instead.';
    input = isMeasure(interaction.value) ? card('FID', 'measured', interaction.value, note) : card('FID', 'waiting', 'No input yet', note);
  } else if (isMeasure(interaction.value)) {
    input = card('INP', 'measured', interaction.value, 'The slowest response to a click, tap or key press so far.');
  } else if (interaction.under) {
    // The browser reports interactions from 16 ms; every one so far was quicker.
    input = { ...card('INP', 'measured', 0), value: 'Under 16 ms', note: 'Every response to a click, tap or key press so far.' };
  } else {
    input = card('INP', 'waiting', 'No interactions yet', 'Updates when you click, tap or press a key.');
  }

  const cls = reading?.CLS;
  return [
    paint('LCP', reading?.LCP, 'Waiting for the page to paint'),
    cls?.supported && isMeasure(cls.value) ? card('CLS', 'measured', cls.value) : card('CLS', 'unsupported', NOT_MEASURED),
    input,
    paint('FCP', reading?.FCP, 'Waiting for the page to paint'),
    reading?.TTFB?.supported && isMeasure(reading.TTFB.value)
      ? card('TTFB', 'measured', reading.TTFB.value)
      : card('TTFB', 'unsupported', NOT_MEASURED),
  ];
}

export const RESOURCE_GROUPS = [
  { id: 'scripts', label: 'Scripts' },
  { id: 'styles', label: 'Styles' },
  { id: 'images', label: 'Images' },
  { id: 'fonts', label: 'Fonts' },
  { id: 'data', label: 'Data' },
  { id: 'other', label: 'Other' },
];

const GROUP_LABELS = Object.fromEntries(RESOURCE_GROUPS.map((group) => [group.id, group.label]));

const EXTENSIONS = {
  scripts: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'],
  styles: ['css'],
  images: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico', 'bmp'],
  fonts: ['woff', 'woff2', 'ttf', 'otf', 'eot'],
  data: ['json', 'xml', 'txt', 'csv'],
};

const pathOf = (url) => {
  try {
    return new URL(url, 'http://local.invalid').pathname;
  } catch {
    return '';
  }
};

const extensionOf = (url) => {
  const last = pathOf(url).split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  return dot > 0 ? last.slice(dot + 1).toLowerCase() : '';
};

const groupForType = (type) => {
  const mime = String(type || '').toLowerCase().split(';')[0].trim();
  if (!mime) return null;
  if (mime.includes('javascript') || mime.includes('ecmascript')) return 'scripts';
  if (mime === 'text/css') return 'styles';
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('font/') || mime.includes('font-woff') || mime.includes('opentype')) return 'fonts';
  if (mime.includes('json') || mime.includes('xml') || mime === 'text/plain' || mime === 'text/csv') return 'data';
  return 'other';
};

/**
 * Which group a download belongs in: by the content type the server sent where
 * the browser says (Chromium), then by the file name, then by what asked for it.
 */
export function resourceGroup(entry) {
  if (!entry) return 'other';
  const byType = groupForType(entry.contentType);
  if (byType && byType !== 'data' && byType !== 'other') return byType;
  const initiator = entry.initiatorType;
  if (initiator === 'fetch' || initiator === 'xmlhttprequest' || initiator === 'beacon') return 'data';
  if (byType) return byType;
  const extension = extensionOf(entry.name);
  for (const [group, extensions] of Object.entries(EXTENSIONS)) if (extensions.includes(extension)) return group;
  if (initiator === 'script') return 'scripts';
  if (initiator === 'img' || initiator === 'image') return 'images';
  return 'other';
}

/** A short name for a download: its file name, keeping what an endpoint was asked. */
export function resourceName(url, origin = globalThis.location?.origin) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return String(url ?? '');
  }
  let path = parsed.pathname;
  try {
    path = decodeURIComponent(path);
  } catch {
    // Keep the encoded form.
  }
  const last = path.split('/').pop();
  let name = last || path;
  if (last && last.endsWith('.php')) name += parsed.search;
  return parsed.origin === origin ? name : `${parsed.host}/${name}`;
}

const isCached = (entry) => entry.transferSize === 0 && (entry.decodedBodySize > 0 || entry.deliveryType === 'cache');

const sizeOf = (value) => (isMeasure(value) ? value : 0);

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/**
 * What the page downloaded, from Resource Timing: each group's requests, bytes
 * over the network (transferred) and bytes once unpacked (size), the largest
 * files, and notes on what the figures cannot show.
 */
export function summariseDownloads(entries, { origin = globalThis.location?.origin, navigation = null, limit = 5, full = false } = {}) {
  const all = [...(navigation ? [navigation] : []), ...(Array.isArray(entries) ? entries : [])].filter(Boolean);
  const totals = Object.fromEntries(RESOURCE_GROUPS.map((group) => [group.id, { requests: 0, transferred: 0, size: 0, cached: 0 }]));
  const total = { requests: 0, transferred: 0, size: 0, cached: 0, unreported: 0 };
  const files = [];

  for (const entry of all) {
    const group = resourceGroup(entry);
    const transferred = sizeOf(entry.transferSize);
    const size = sizeOf(entry.decodedBodySize);
    const cached = isCached(entry);
    let crossOrigin = false;
    try {
      crossOrigin = new URL(entry.name).origin !== origin;
    } catch {
      crossOrigin = false;
    }
    const unreported = crossOrigin && !cached && transferred === 0 && size === 0 && sizeOf(entry.encodedBodySize) === 0;
    const sum = totals[group];
    sum.requests += 1;
    sum.transferred += transferred;
    sum.size += size;
    if (cached) sum.cached += 1;
    total.requests += 1;
    total.transferred += transferred;
    total.size += size;
    if (cached) total.cached += 1;
    if (unreported) total.unreported += 1;
    files.push({ url: entry.name, name: resourceName(entry.name, origin), group, transferred, size, cached });
  }

  const notes = [];
  if (total.cached) {
    notes.push(`${plural(total.cached, 'request', 'requests')} came from the browser cache, so nothing was transferred for ${total.cached === 1 ? 'it' : 'them'}.`);
  }
  if (total.unreported) {
    notes.push(total.unreported === 1
      ? '1 request from another site did not share its size.'
      : `${total.unreported} requests from other sites did not share their sizes.`);
  }
  if (full) notes.push("The browser's list of downloads filled up, so later downloads are missing.");

  const text = (sum) => ({ ...sum, transferredText: formatBytes(sum.transferred), sizeText: formatBytes(sum.size) });
  return {
    groups: RESOURCE_GROUPS.map((group) => ({ id: group.id, label: group.label, ...text(totals[group.id]) })),
    total: text(total),
    largest: files
      .filter((file) => file.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, limit)
      .map((file) => ({ ...text(file), groupLabel: GROUP_LABELS[file.group] })),
    notes,
  };
}

// v2 names two components differently from their app.
const APP_FILE_NAMES = { admin: ['adminconsole'], references: ['referencesvault'] };

const plainName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Whether a download is an app's own: v1's partial for it (api/app.php?name=),
 * a file in v2's folder for it (src/apps/<id>/), or a file named after it, with
 * or without the hash a build adds. Shared code and pictures are not anyone's.
 */
export function appOwnsFile(appId, url) {
  if (!appId || !url) return false;
  let parsed;
  try {
    parsed = new URL(url, 'http://local.invalid');
  } catch {
    return false;
  }
  const path = parsed.pathname;
  if (path.endsWith('/api/app.php')) return parsed.searchParams.get('name') === appId;
  if (path.includes(`/src/apps/${appId}/`)) return true;
  const file = path.split('/').pop() ?? '';
  if (!/\.(m?js|tsx?|jsx)$/.test(file)) return false;
  const base = file.replace(/\.[^.]+$/, '');
  const names = [appId, ...(APP_FILE_NAMES[appId] ?? [])];
  const hashless = base.replace(/-[A-Za-z0-9_-]{8}$/, '');
  return names.includes(plainName(base)) || names.includes(plainName(hashless));
}

/** The downloads that are an app's own, added up. */
export function appFiles(appId, entries) {
  const own = (Array.isArray(entries) ? entries : []).filter((entry) => entry && appOwnsFile(appId, entry.name));
  const size = own.reduce((sum, entry) => sum + sizeOf(entry.decodedBodySize), 0);
  const transferred = own.reduce((sum, entry) => sum + sizeOf(entry.transferSize), 0);
  return {
    files: own.length,
    size,
    transferred,
    text: own.length ? `${plural(own.length, 'file', 'files')}, ${formatBytes(size)}` : 'None found',
  };
}

const WINDOW_STATES = { minimized: 'Minimised', maximized: 'Maximised', snapped: 'Snapped' };

/** A window's state from the store, in words. */
export function windowStatusLabel(state) {
  return WINDOW_STATES[state] ?? 'Open';
}

/** One row per open window, straight from the store, with the files named for its app. */
export function processRows(windows, entries) {
  return (Array.isArray(windows) ? windows : []).map((win) => ({
    id: win.id,
    app: win.app,
    title: win.title,
    status: windowStatusLabel(win.state),
    files: appFiles(win.app, entries).text,
  }));
}

/** The page's JavaScript heap, where the browser tells (Chromium only), or null. */
export function jsHeap(perf = globalThis.performance) {
  const memory = perf?.memory;
  if (!memory) return null;
  const used = memory.usedJSHeapSize;
  const total = memory.totalJSHeapSize;
  const limit = memory.jsHeapSizeLimit;
  if (![used, total, limit].every(isMeasure)) return null;
  return {
    used,
    total,
    limit,
    text: `${formatBytes(used)} used of ${formatBytes(total)} allocated, limit ${formatBytes(limit)}`,
  };
}

const hasControl = (text) => [...text].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127);

const CHECK_STATES = ['read', 'none', 'unreadable'];
const RAN_ON = ['pull-request', 'commit'];
const MAX_CHECKS = 100;

/**
 * Checks a build.json against the shape the deploy writes, and keeps only the
 * parts Task Manager shows. Anything else in the file is dropped.
 */
export function parseBuildInfo(value) {
  const fail = (reason) => ({ ok: false, reason });
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('not an object');
  if (value.schema !== 1) return fail('unknown schema');
  const { commit, shortCommit, deployedAt, checks } = value;
  if (typeof commit !== 'string' || !/^[0-9a-f]{40}$/.test(commit)) return fail('bad commit');
  if (typeof shortCommit !== 'string' || !/^[0-9a-f]{7,12}$/.test(shortCommit) || !commit.startsWith(shortCommit)) {
    return fail('bad short commit');
  }
  if (typeof deployedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(deployedAt)) return fail('bad time');
  const when = new Date(deployedAt);
  if (Number.isNaN(when.getTime()) || when.toISOString().slice(0, 19) !== deployedAt.slice(0, 19)) return fail('bad time');
  if (!checks || typeof checks !== 'object' || !CHECK_STATES.includes(checks.state)) return fail('bad checks');
  const results = checks.results ?? [];
  if (!Array.isArray(results) || results.length > MAX_CHECKS) return fail('bad results');
  if (checks.state !== 'read' && results.length) return fail('results without a read');
  if (checks.state === 'read' && !results.length) return fail('a read with no results');
  if (checks.state !== 'unreadable' && !RAN_ON.includes(checks.ranOn)) return fail('bad source');
  const clean = [];
  for (const item of results) {
    const name = item?.name;
    const result = item?.result;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || hasControl(name)) return fail('bad name');
    if (typeof result !== 'string' || !/^[a-z_]{1,32}$/.test(result)) return fail('bad result');
    clean.push({ name, result });
  }
  return {
    ok: true,
    build: {
      commit,
      shortCommit,
      deployedAt,
      checks: checks.state === 'unreadable' ? { state: 'unreadable', results: [] } : { state: checks.state, ranOn: checks.ranOn, results: clean },
    },
  };
}

/**
 * Reads build.json. A copy without one (404) is a local build; anything else
 * that is not a valid file is reported as unreadable rather than guessed at.
 */
export async function loadBuildInfo(fetchImpl = globalThis.fetch, url = '/build.json') {
  let res;
  try {
    res = await fetchImpl(url, { cache: 'no-store', headers: { Accept: 'application/json' } });
  } catch {
    return { state: 'unreadable', reason: 'not reachable' };
  }
  if (res.status === 404) {
    // Read the body all the same, so the request does not stay open.
    await res.text().catch(() => '');
    return { state: 'local' };
  }
  const body = await res.text().catch(() => '');
  if (!res.ok) return { state: 'unreadable', reason: `HTTP ${res.status}` };
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return { state: 'unreadable', reason: 'not JSON' };
  }
  const parsed = parseBuildInfo(data);
  return parsed.ok ? { state: 'deployed', build: parsed.build } : { state: 'unreadable', reason: parsed.reason };
}

const CHECK_LABELS = {
  success: ['Passed', 'good'],
  failure: ['Failed', 'poor'],
  error: ['Error', 'poor'],
  timed_out: ['Timed out', 'poor'],
  startup_failure: ['Failed to start', 'poor'],
  action_required: ['Needs action', 'warn'],
  pending: ['Not finished at deploy', 'warn'],
  cancelled: ['Cancelled', 'neutral'],
  skipped: ['Skipped', 'neutral'],
  neutral: ['Neutral', 'neutral'],
  stale: ['Stale', 'neutral'],
};

export const TONE_COLOURS = {
  good: RATING_COLOURS.good,
  warn: RATING_COLOURS['needs-improvement'],
  poor: RATING_COLOURS.poor,
  neutral: '#c8c8c8',
};

/** A check's conclusion in words, with the tone its badge takes. */
export function checkResultLabel(result) {
  const known = CHECK_LABELS[result];
  if (known) return { label: known[0], tone: known[1] };
  const words = String(result ?? '').replace(/_/g, ' ').trim();
  return { label: words ? words[0].toUpperCase() + words.slice(1) : 'Unknown', tone: 'neutral' };
}

const TONE_ORDER = ['poor', 'warn', 'good', 'neutral'];

/** "1 failed, 2 passed, 1 skipped", worst first. */
export function summariseChecks(results) {
  const counts = new Map();
  for (const { result } of Array.isArray(results) ? results : []) {
    const { label, tone } = checkResultLabel(result);
    const key = label.toLowerCase();
    const found = counts.get(key) ?? { tone, count: 0 };
    found.count += 1;
    counts.set(key, found);
  }
  return [...counts.entries()]
    .sort((a, b) => TONE_ORDER.indexOf(a[1].tone) - TONE_ORDER.indexOf(b[1].tone))
    .map(([label, { count }]) => `${count} ${label}`)
    .join(', ');
}

/** "7 Nov 2026, 08:30 GMT" in the reader's own time zone, or '' for a bad date. */
export function formatDeployTime(iso, { timeZone } = {}) {
  const when = new Date(iso);
  if (typeof iso !== 'string' || Number.isNaN(when.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  }).format(when);
}

/** What the Build tab shows for a loadBuildInfo() result, or for null while it loads. */
export function buildView(result, options = {}) {
  const blank = { commit: '', deployed: '', checksTitle: '', checksMessage: '', checks: [] };
  if (!result) {
    return { state: 'loading', title: 'Reading build information', message: '', ...blank };
  }
  if (result.state === 'local') {
    return {
      state: 'local',
      title: 'Local build',
      message: 'There is no build.json here, so this copy was not deployed and has no commit to show.',
      ...blank,
    };
  }
  if (result.state !== 'deployed' || !result.build) {
    return {
      state: 'unreadable',
      title: 'Build information could not be read',
      message: 'build.json is here but is not in the shape the deploy writes, so nothing from it is shown.',
      ...blank,
    };
  }
  const { build } = result;
  const { checks } = build;
  const where = checks.ranOn === 'pull-request' ? 'the merged pull request' : 'this commit';
  let checksMessage;
  if (checks.state === 'unreadable') checksMessage = 'The check results could not be read when this was deployed.';
  else if (checks.state === 'none') checksMessage = `No checks ran on ${where}.`;
  else checksMessage = summariseChecks(checks.results);
  return {
    state: 'deployed',
    title: 'Deployed build',
    message: '',
    commit: build.shortCommit,
    deployed: formatDeployTime(build.deployedAt, options),
    checksTitle: checks.state === 'unreadable' ? 'Checks' : `Checks on ${where}`,
    checksMessage,
    checks: checks.results.map(({ name, result: conclusion }) => ({ name, ...checkResultLabel(conclusion) })),
  };
}
