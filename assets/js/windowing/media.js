// What Video and PDF Reader share between the builds: the player's clock and
// seek bar, and whether this browser can show a PDF inside a window.

// Paths from the site root. v1 puts its base path in front, v2 a slash.
export const DEFAULT_VIDEO = 'data/south-africa-25.mp4';
export const DEFAULT_PDF = 'data/cv.pdf';

export function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** The time a point on the seek bar stands for, kept inside the clip. */
export function seekTime(clientX, bar, duration) {
  if (!Number.isFinite(duration) || duration <= 0 || !bar.width) return 0;
  const fraction = Math.min(1, Math.max(0, (clientX - bar.left) / bar.width));
  return fraction * duration;
}

export function progressPercent(currentTime, duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, (currentTime / duration) * 100);
}

/**
 * Phones often cannot show a PDF in a frame. Browsers that say so get the
 * open and download prompt at any width; narrow screens always get it.
 */
export const canShowPdf = (nav) => nav?.pdfViewerEnabled !== false;

export const pdfOpenLabel = (url) => (/(^|\/)cv\.pdf$/i.test(url) ? 'Open the CV' : 'Open the PDF');

export const mediaName = (url) => url.split('/').pop() ?? '';
