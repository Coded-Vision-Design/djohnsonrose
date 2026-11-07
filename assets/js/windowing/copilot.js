// Copilot, shared by both builds: what goes to api/copilot.php, how its replies
// and errors are read, where a citation opens, and the tailored CV the visitor
// prints or saves. The server checks every citation and builds the CV from the
// site's data (lib/copilot.php); this file only shows it. The limits match
// lib/copilot.php, and tests/php/copilot_test.php checks that they still do.

import { findEntry } from './file-ops.js';

export const COPILOT_ENDPOINT = 'api/copilot.php';
export const QUESTION_MAX = 500;
export const JOB_MIN = 80;
export const JOB_MAX = 6000;
/** Earlier questions, with their answers, sent along with a new one. */
export const HISTORY_TURNS = 3;
export const HISTORY_TEXT_MAX = 1200;

export const SUGGESTED_QUESTIONS = [
  'What does he do now?',
  'Which projects has he built with React?',
  'What certificates does he hold?',
  'What automation work has he done?',
];

const NETWORK_MESSAGE = 'Copilot could not be reached. Check your connection and try again.';
const GENERIC_MESSAGE = 'Copilot could not answer just now. Please try again.';

export class CopilotError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CopilotError';
    this.status = status;
    this.code = code;
  }
}

const characters = (text) => [...text].length;
const clip = (text, max) => [...text].slice(0, max).join('');

export const copilotUrl = (basePath = '/') => `${basePath}${COPILOT_ENDPOINT}`;

/** Why a question cannot be sent yet, or '' when it can. */
export function questionProblem(text) {
  const question = String(text ?? '').trim();
  if (!question) return 'Type a question for Copilot.';
  if (characters(question) > QUESTION_MAX) return `Keep your question under ${QUESTION_MAX} characters.`;
  return '';
}

/** Why a job description cannot be sent yet, or '' when it can. */
export function jobProblem(text) {
  const job = String(text ?? '').trim();
  if (characters(job) < JOB_MIN) return `Paste the whole job description, at least ${JOB_MIN} characters.`;
  if (characters(job) > JOB_MAX) {
    return `Job descriptions can be up to ${JOB_MAX.toLocaleString('en-GB')} characters. Paste the part with the requirements.`;
  }
  return '';
}

/**
 * The last few questions with their answers, oldest first, in the shape the
 * server checks: a question, then its answer, in turn. A question that ended
 * in an error, and the welcome message, are left out.
 */
export function historyFor(messages) {
  const pairs = [];
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < list.length - 1; i++) {
    const question = list[i];
    const answer = list[i + 1];
    if (question?.role !== 'user' || answer?.role !== 'assistant') continue;
    const q = String(question.text ?? '').trim();
    const a = String(answer.text ?? '').trim();
    if (!q || !a) continue;
    pairs.push([
      { role: 'user', text: clip(q, HISTORY_TEXT_MAX) },
      { role: 'assistant', text: clip(a, HISTORY_TEXT_MAX) },
    ]);
    i++;
  }
  return pairs.slice(-HISTORY_TURNS).flat();
}

export const chatBody = (question, messages) => ({ task: 'chat', question: String(question).trim(), history: historyFor(messages) });

export const matchBody = (job) => ({ task: 'match', job: String(job).trim() });

const defaultFetch = (...args) => globalThis.fetch(...args);

/**
 * Sends one request to Copilot. Resolves with the reply, or rejects with a
 * CopilotError whose message can be shown as it is, and whose code says what
 * went wrong: off (no key set yet), rate_limited, daily_limit, busy, timeout,
 * invalid_input, network, and so on.
 */
export async function askCopilot(body, { fetcher = defaultFetch, basePath = '/', signal } = {}) {
  let res;
  try {
    res = await fetcher(copilotUrl(basePath), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new CopilotError(0, 'network', NETWORK_MESSAGE);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.ok && data && typeof data === 'object') return data;
  const code = typeof data?.code === 'string' ? data.code : 'error';
  const message = typeof data?.error === 'string' && data.error ? data.error : GENERIC_MESSAGE;
  throw new CopilotError(res.status, code, message);
}

/** Whether Copilot is switched on: on, off (no key set yet), or unknown when the check itself fails. */
export async function copilotStatus({ fetcher = defaultFetch, basePath = '/' } = {}) {
  try {
    const res = await fetcher(copilotUrl(basePath), { credentials: 'same-origin' });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.enabled === true) return 'on';
    if (res.status === 503 && data?.code === 'off') return 'off';
  } catch {
    // Unknown: the visitor can still try, and gets a clear error if it fails.
  }
  return 'unknown';
}

/** The kind of place a citation opens: cv, file, folder or app. */
export const citationKind = (citation) => citation?.target?.type ?? '';

const KIND_LABELS = { cv: 'CV', file: 'File', folder: 'Folder', app: 'App' };
const KIND_HINTS = {
  cv: 'opens the CV page in a new tab',
  file: 'opens the file',
  folder: 'opens the folder in File Explorer',
  app: 'opens the app',
};

/** A short word for a citation's kind, shown before its title. */
export const citationKindLabel = (citation) => KIND_LABELS[citationKind(citation)] ?? '';

/** What following a citation does, for its title and screen readers. */
export const citationHint = (citation) => KIND_HINTS[citationKind(citation)] ?? '';

/** The /cv address for a CV citation, or null for one that opens on the desktop. */
export function citationHref(citation, basePath = '/') {
  if (citationKind(citation) !== 'cv') return null;
  const anchor = encodeURIComponent(String(citation.target.anchor ?? ''));
  return `${basePath}cv${anchor ? `#${anchor}` : ''}`;
}

/**
 * Opens what a citation points at, through the build's own handlers: a CV
 * section on /cv, a file in its app, a folder in File Explorer, or an app.
 * Returns false when there is nothing to open, for example when the visitor
 * has moved or deleted that file on this desktop.
 */
export function openCitation(citation, { fileSystem, openEntry, openApp, openUrl, basePath = '/' }) {
  const target = citation?.target ?? {};
  switch (target.type) {
    case 'cv':
      openUrl(citationHref(citation, basePath));
      return true;
    case 'file':
    case 'folder': {
      const found = findEntry(fileSystem ?? {}, String(target.path ?? ''));
      if (!found) return false;
      openEntry(found.entry, found.path);
      return true;
    }
    case 'app':
      if (typeof target.app !== 'string' || !/^[a-z0-9-]+$/.test(target.app)) return false;
      openApp(target.app);
      return true;
    default:
      return false;
  }
}

const STRENGTH_LABELS = { strong: 'Strong', partial: 'Partial', none: 'None' };

export const strengthLabel = (strength) => STRENGTH_LABELS[strength] ?? STRENGTH_LABELS.none;

/** How many requirements have each strength. */
export function matchCounts(requirements) {
  const counts = { strong: 0, partial: 0, none: 0 };
  for (const item of Array.isArray(requirements) ? requirements : []) {
    counts[Object.hasOwn(counts, item?.strength) ? item.strength : 'none']++;
  }
  return counts;
}

// ---- The tailored CV ------------------------------------------------------

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const isWebAddress = (url) => /^https:\/\/[^\s"'<>]+$/i.test(String(url ?? ''));

const shortAddress = (url) => String(url).replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');

const link = (url, text) => (isWebAddress(url) ? `<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>` : escapeHtml(text));

const CV_STYLES = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: #ffffff; color: #1b1b1b; font: 15px/1.5 "Segoe UI", Selawik, system-ui, -apple-system, sans-serif; overflow-wrap: anywhere; }
main { max-width: 800px; margin: 0 auto; padding: 32px 24px 48px; }
header { border-bottom: 2px solid #0f5ea8; padding-bottom: 12px; margin-bottom: 16px; }
h1 { margin: 0; font-size: 28px; line-height: 1.2; }
h2 { margin: 24px 0 8px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #0f5ea8; border-bottom: 1px solid #d0d7de; padding-bottom: 4px; }
h3 { margin: 0; font-size: 15px; }
p { margin: 0 0 8px; }
ul { margin: 4px 0 0; padding-left: 20px; }
li { margin: 2px 0; }
a { color: #0f5ea8; }
.headline { font-size: 17px; color: #333333; margin: 4px 0; }
.contact, .muted, .period, .org { color: #4a4a4a; font-size: 14px; }
.note { font-size: 13px; color: #4a4a4a; background: #f3f6f9; border-left: 3px solid #0f5ea8; padding: 8px 12px; }
.generated { margin-top: 12px; border: 1px dashed #8a5cf5; border-radius: 6px; padding: 10px 12px; background: #f7f3ff; }
.generated .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #5b2fc9; margin-bottom: 4px; }
.generated .sources { font-size: 13px; color: #4a4a4a; margin: 4px 0 0; }
.role, .project { margin: 12px 0; break-inside: avoid; }
.role-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0 12px; }
.brief { padding-left: 0; list-style: none; }
.brief li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0 12px; }
dl { margin: 0; }
dt { font-weight: 600; margin-top: 8px; }
dd { margin: 0; }
.inline { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 6px; }
.inline li { margin: 0; }
.inline li:not(:last-child)::after { content: ","; }
mark { background: #fff1a8; color: #000000; font-weight: 600; padding: 0 2px; border-radius: 2px; }
@media (max-width: 480px) {
  main { padding: 20px 16px 32px; }
  h1 { font-size: 24px; }
}
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  body { font-size: 10.5pt; }
  main { max-width: none; padding: 0; }
  a { color: #000000; text-decoration: none; }
  .note { background: none; }
  mark, .generated { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { break-after: avoid; }
}
`;

/**
 * The tailored CV as one self-contained HTML document: the preview shows it in
 * a frame, Print prints that frame, and Download saves it as a file. All text
 * comes from the server's CV object and is escaped here; the only links are
 * https and mailto, and the page loads nothing from anywhere.
 */
export function tailoredCvHtml(cv) {
  const roles = Array.isArray(cv?.roles) ? cv.roles : [];
  const otherRoles = Array.isArray(cv?.otherRoles) ? cv.otherRoles : [];
  const projects = Array.isArray(cv?.projects) ? cv.projects : [];
  const skills = Array.isArray(cv?.skills) ? cv.skills : [];
  const education = Array.isArray(cv?.education) ? cv.education : [];
  const certificates = Array.isArray(cv?.certificates) ? cv.certificates : [];
  const generated = cv?.generated?.text ? cv.generated : null;
  const name = String(cv?.name ?? '');

  const contact = [
    escapeHtml(cv?.location),
    cv?.email ? `<a href="mailto:${escapeHtml(cv.email)}">${escapeHtml(cv.email)}</a>` : '',
    isWebAddress(cv?.website) ? link(cv.website, shortAddress(cv.website)) : '',
    isWebAddress(cv?.linkedin) ? link(cv.linkedin, 'LinkedIn') : '',
  ].filter(Boolean);

  const roleHtml = (role) => `
      <article class="role">
        <div class="role-head"><h3>${escapeHtml(role.title)}</h3><p class="period">${escapeHtml(role.period)}</p></div>
        <p class="org">${escapeHtml([role.company, role.location].filter(Boolean).join(', '))}</p>
        <ul>${(role.highlights ?? []).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      </article>`;

  const anyMatched = skills.some((group) => (group.items ?? []).some((item) => item.matched));

  const sections = [
    `<section>
      <h2>Summary</h2>
      <p>${escapeHtml(cv?.summary)}</p>${
        generated
          ? `
      <aside class="generated" data-cv-generated>
        <p class="label">Generated by Copilot, not written by ${escapeHtml(name || 'the candidate')}</p>
        <p>${escapeHtml(generated.text)}</p>
        <p class="sources">Based on: ${(generated.citations ?? []).map((c) => escapeHtml(c.title)).join('; ')}</p>
      </aside>`
          : ''
      }
    </section>`,
    roles.length
      ? `<section>
      <h2>${otherRoles.length ? 'Relevant experience' : 'Experience'}</h2>${roles.map(roleHtml).join('')}
    </section>`
      : '',
    otherRoles.length
      ? `<section>
      <h2>Other experience</h2>
      <ul class="brief">${otherRoles
        .map((role) => `<li><span><strong>${escapeHtml(role.title)}</strong>, ${escapeHtml(role.company)}</span><span class="period">${escapeHtml(role.period)}</span></li>`)
        .join('')}</ul>
    </section>`
      : '',
    projects.length
      ? `<section>
      <h2>Selected projects</h2>${projects
        .map(
          (project) => `
      <article class="project">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        ${project.tags?.length ? `<p class="muted">Built with ${escapeHtml(project.tags.join(', '))}</p>` : ''}
        ${isWebAddress(project.url) ? `<p>${link(project.url, shortAddress(project.url))}</p>` : ''}
      </article>`,
        )
        .join('')}
    </section>`
      : '',
    skills.length
      ? `<section>
      <h2>Skills</h2>${anyMatched ? '\n      <p class="muted">Highlighted skills are the ones the job description asks for.</p>' : ''}
      <dl>${skills
        .map(
          (group) =>
            `<dt>${escapeHtml(group.label)}</dt><dd><ul class="inline">${(group.items ?? [])
              .map((item) => `<li>${item.matched ? `<mark>${escapeHtml(item.name)}</mark>` : escapeHtml(item.name)}</li>`)
              .join('')}</ul></dd>`,
        )
        .join('')}</dl>
    </section>`
      : '',
    education.length
      ? `<section>
      <h2>Education</h2>
      <ul>${education.map((course) => `<li><strong>${escapeHtml(course.title)}</strong>, ${escapeHtml(course.issuer)}</li>`).join('')}</ul>
    </section>`
      : '',
    certificates.length
      ? `<section>
      <h2>Certificates</h2>
      <ul>${certificates
        .map((group) => `<li><strong>${escapeHtml(group.issuer)}</strong>${group.years ? ` (${escapeHtml(group.years)})` : ''}: ${escapeHtml((group.names ?? []).join(', '))}</li>`)
        .join('')}</ul>
    </section>`
      : '',
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name ? `${name}, CV` : 'CV')}</title>
<style>${CV_STYLES}</style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(name)}</h1>
      <p class="headline">${escapeHtml(cv?.headline)}</p>
      <p class="contact">${contact.join(' · ')}</p>
    </header>
    <p class="note">Chosen and ordered for one job description by Copilot. Every line is from the CV${generated ? ', apart from the summary marked as generated' : ''}.</p>
    ${sections.join('\n    ')}
  </main>
</body>
</html>
`;
}

/** The file name the tailored CV saves as, in plain letters. */
export function tailoredCvFileName(cv) {
  const name = String(cv?.name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${name ? `${name}-` : ''}CV-tailored.html`;
}

/** Saves the tailored CV as a file the browser downloads. Returns the file name. */
export function saveTailoredCv(cv, doc = document) {
  const name = tailoredCvFileName(cv);
  const url = URL.createObjectURL(new Blob([tailoredCvHtml(cv)], { type: 'text/html;charset=utf-8' }));
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return name;
}

/** Prints the preview frame, and only it. Returns false when there is no preview to print. */
export function printTailoredCv(frame) {
  const view = frame?.contentWindow;
  if (!view) return false;
  view.focus?.();
  view.print();
  return true;
}
