// The Chrome app's rules, shared by both builds: what an address means, each
// tab's history, and which projects the home page shows. Other sites cannot be
// shown inside the window, so each build offers to open them in a real tab.

export const HOME_URL = 'portfolio://projects';
export const HOME_TITLE = 'Featured Projects';

export const isExternal = (url) => /^https?:\/\//i.test(url);

/** What Chrome would load for the text typed into its address bar. */
export function normaliseAddress(text) {
  const value = text.trim();
  if (!value || value.toLowerCase() === HOME_URL) return HOME_URL;
  if (isExternal(value)) return value;
  if (/^[^\s/]+\.[^\s/]{2,}(\/\S*)?$/.test(value)) return `https://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

/** A site's host without www, or the text itself when it is not an address. */
export function siteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

export const tabTitle = (url) => (url === HOME_URL ? HOME_TITLE : siteName(url));

/**
 * The real site a Visit Site file opens in a new tab, or null. Each build's
 * openApp opens it at once, inside the visitor's click, as pop-up blockers
 * (Safari's above all) stop a tab opened later, once Chrome has loaded.
 */
export function siteToVisit(app, extra) {
  const url = extra?.initialUrl;
  return app === 'edge' && typeof url === 'string' && isExternal(url) ? url : null;
}

export function newTab(id, address = HOME_URL) {
  const url = normaliseAddress(address);
  return { id, url, title: tabTitle(url), back: [], forward: [] };
}

/** The tab after loading what was typed. The same address changes nothing. */
export function navigateTab(tab, address) {
  const url = normaliseAddress(address);
  if (url === tab.url) return tab;
  return { ...tab, url, title: tabTitle(url), back: [...tab.back, tab.url], forward: [] };
}

export function tabBack(tab) {
  if (tab.back.length === 0) return tab;
  const url = tab.back[tab.back.length - 1];
  return { ...tab, url, title: tabTitle(url), back: tab.back.slice(0, -1), forward: [tab.url, ...tab.forward] };
}

export function tabForward(tab) {
  if (tab.forward.length === 0) return tab;
  const [url, ...forward] = tab.forward;
  return { ...tab, url, title: tabTitle(url), back: [...tab.back, tab.url], forward };
}

/** The featured projects, or every project when none is featured, so the page never blanks. */
export function featuredProjects(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const featured = list.filter((project) => project.featured);
  return featured.length > 0 ? featured : list;
}

export const projectTags = (project) => (Array.isArray(project?.tags) ? project.tags : []);
