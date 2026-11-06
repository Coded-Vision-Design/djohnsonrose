// What Video, PDF Reader and Photos share between the builds: the player's
// clock and seek bar, whether this browser can show a PDF inside a window, and
// which pictures Photos shows.

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

// ---- Photos ----------------------------------------------------------------

export const DEFAULT_ALBUM = 'C:\\Users\\DeVante\\Pictures';

const isPicture = (entry) => !!entry.url && (entry.type === 'image' || /\.(webp|png|jpe?g|gif)$/i.test(entry.name ?? ''));
const urlKey = (url) => decodeURIComponent(String(url)).replace(/^\/+/, '');
const sameUrl = (a, b) => urlKey(a).endsWith(urlKey(b)) || urlKey(b).endsWith(urlKey(a));

/**
 * What Photos shows: the pictures in a folder of the shared file system, and
 * which one is open. Pictures holds both the portfolio screenshots and the
 * competition photos. A picture opened from elsewhere brings its own folder.
 * Returns { path, images, index }.
 */
export function photoAlbum(fs, { folderPath, imageName, imageUrl } = {}) {
  const pictures = (path) => (fs[path] ?? []).filter(isPicture);
  const path = folderPath && fs[folderPath] ? folderPath : DEFAULT_ALBUM;
  const images = pictures(path);
  if (!imageName && !imageUrl) return { path, images, index: 0 };

  const wanted = (entry) => (!imageName || entry.name === imageName) && (!imageUrl || sameUrl(entry.url, imageUrl));
  const here = images.findIndex(wanted);
  if (here !== -1) return { path, images, index: here };
  for (const folder of Object.keys(fs)) {
    const others = pictures(folder);
    const index = others.findIndex(wanted);
    if (index !== -1) return { path: folder, images: others, index };
  }
  if (imageUrl) return { path: '', images: [{ name: mediaName(imageUrl), type: 'image', url: imageUrl }], index: 0 };
  return { path, images, index: 0 };
}
