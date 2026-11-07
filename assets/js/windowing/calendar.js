// The clock's flyout, shared by both builds: the month grid, Monday first as in
// the UK, its labels, today and the keys that move round it, and the list of
// notifications shown this session. Days are plain 'YYYY-MM-DD' strings, so
// both frameworks keep them in state as they are, and the sums run in UTC, so
// no clock change can shift a day.

export const CALENDAR_DAYS = [
  { short: 'Mo', long: 'Monday' },
  { short: 'Tu', long: 'Tuesday' },
  { short: 'We', long: 'Wednesday' },
  { short: 'Th', long: 'Thursday' },
  { short: 'Fr', long: 'Friday' },
  { short: 'Sa', long: 'Saturday' },
  { short: 'Su', long: 'Sunday' },
];

// Written out rather than asked of Intl, which words dates differently from one
// browser to the next.
export const CALENDAR_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MAX_NOTIFICATIONS = 20;

const DAY_MS = 86_400_000;
const pad = (n, size = 2) => String(n).padStart(size, '0');
// Date.UTC reads a year below 100 as 19xx, which setUTCFullYear does not.
const utc = (year, month, day) => new Date(0).setUTCFullYear(year, month, day);
const fromUtc = (ms) => {
  const date = new Date(ms);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** The days in a month, 0 for January. February has 29 in a leap year. */
export function daysInMonth(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new RangeError(`No such month: ${year}-${month}`);
  }
  return new Date(utc(year, month + 1, 0)).getUTCDate();
}

/** 'YYYY-MM-DD' for a year, a month (0 for January) and a day. Days past the end carry over. */
export function isoDate(year, month, day) {
  return fromUtc(utc(year, month, day));
}

/** Today, or the day of any Date, by the visitor's own clock. */
export function todayIso(now = new Date()) {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The year, month (0 for January) and day of a 'YYYY-MM-DD' day, or null when it is not a real one. */
export function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof iso === 'string' ? iso : '');
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function mustParse(iso) {
  const parts = parseIsoDate(iso);
  if (!parts) throw new RangeError(`Not a day: ${iso}`);
  return parts;
}

const toUtc = ({ year, month, day }) => utc(year, month, day);

/** 0 for Monday to 6 for Sunday. */
const weekday = (parts) => (new Date(toUtc(parts)).getUTCDay() + 6) % 7;

/** A day some number of days away. */
export function shiftDay(iso, days) {
  return fromUtc(toUtc(mustParse(iso)) + days * DAY_MS);
}

/** The same day some months away, kept inside a shorter month: 31 January and a month is 28 February. */
export function shiftMonth(iso, months) {
  const { year, month, day } = mustParse(iso);
  const first = new Date(utc(year, month + months, 1));
  const target = { year: first.getUTCFullYear(), month: first.getUTCMonth() };
  return isoDate(target.year, target.month, Math.min(day, daysInMonth(target.year, target.month)));
}

/** "Saturday 7 November", as the flyout names today. Empty for a day that does not exist. */
export function longDate(iso) {
  const parts = parseIsoDate(iso);
  if (!parts) return '';
  return `${CALENDAR_DAYS[weekday(parts)].long} ${parts.day} ${CALENDAR_MONTHS[parts.month]}`;
}

/** "Saturday 7 November 2026", what a screen reader hears for a day in the grid. */
export function dayLabel(iso) {
  const parts = parseIsoDate(iso);
  return parts ? `${longDate(iso)} ${parts.year}` : '';
}

/** "November 2026", the month a day falls in. */
export function monthTitle(iso) {
  const parts = parseIsoDate(iso);
  return parts ? `${CALENDAR_MONTHS[parts.month]} ${parts.year}` : '';
}

/**
 * The six weeks shown for the month the selected day is in, Monday first, with
 * the days of the months either side filling the first and last weeks. Six
 * weeks always, so that the grid never changes height from month to month.
 */
export function monthGrid(selected, today) {
  const parts = mustParse(selected);
  const first = { year: parts.year, month: parts.month, day: 1 };
  const start = toUtc(first) - weekday(first) * DAY_MS;
  const weeks = [];
  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      const iso = fromUtc(start + (row * 7 + col) * DAY_MS);
      const { month, day } = parseIsoDate(iso);
      week.push({
        iso,
        day,
        inMonth: month === parts.month,
        today: iso === today,
        selected: iso === selected,
        label: dayLabel(iso),
      });
    }
    weeks.push(week);
  }
  return { title: monthTitle(selected), weeks };
}

/**
 * Where a key moves the selected day in the grid: the arrows by a day or a
 * week, Home and End to the ends of the week, Page Up and Page Down by a month,
 * and by a year with Shift. Null for any other key, or a day that does not exist.
 */
export function calendarKeyTarget(iso, { key, shiftKey = false }) {
  const parts = parseIsoDate(iso);
  if (!parts) return null;
  switch (key) {
    case 'ArrowLeft': return shiftDay(iso, -1);
    case 'ArrowRight': return shiftDay(iso, 1);
    case 'ArrowUp': return shiftDay(iso, -7);
    case 'ArrowDown': return shiftDay(iso, 7);
    case 'Home': return shiftDay(iso, -weekday(parts));
    case 'End': return shiftDay(iso, 6 - weekday(parts));
    case 'PageUp': return shiftMonth(iso, shiftKey ? -12 : -1);
    case 'PageDown': return shiftMonth(iso, shiftKey ? 12 : 1);
    default: return null;
  }
}

/**
 * The notifications shown this session with a new one on top, the newest
 * MAX_NOTIFICATIONS of them. An empty message leaves the list as it was.
 */
export function addNotification(list, message, time) {
  if (typeof message !== 'string' || !message.trim()) return list;
  const id = list.reduce((top, note) => Math.max(top, note.id), 0) + 1;
  return [{ id, message, time }, ...list].slice(0, MAX_NOTIFICATIONS);
}

/** When a notification came, as the taskbar clock tells the time: "09:05". */
export function notificationTime(time) {
  if (!Number.isFinite(time)) return '';
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
