<!-- BEGIN: cvd-org-header (auto-managed by scripts/inject-readme-header.ps1 in cdv-vps-ops; this block may be regenerated) -->

Part of the [Coded Vision Design](https://github.com/Coded-Vision-Design) organisation. Org-wide standards: [community profile](https://github.com/Coded-Vision-Design/.github) | [security disclosure](https://github.com/Coded-Vision-Design/.github/blob/main/SECURITY.md)

<!-- END: cvd-org-header -->
# Portfolio OS — DeVanté Johnson-Rose

A pixel-faithful Windows 11 desktop, in the browser, as a portfolio.

> Live: **<https://devante.johnson-rose.co.uk>**

Two parallel builds of the same OS ship from the same repo and the same `assets/`:

| Track | Stack | URL |
|---|---|---|
| **v1** | PHP 8 · HTMX · Alpine.js · Tailwind | `/` |
| **v2** | React 19 · TypeScript · Vite · Zustand · Tailwind | `/v2/` |

A toggle in each taskbar flips between the two builds so visitors (and recruiters) can compare the same product written two different ways.

---

## Why this exists

Portfolios that link to other portfolios are forgettable. This one **is** the work:

- A working desktop OS — taskbar, start menu, quick settings, snapping, drag‑resize, context menus, recycle bin with restore, file explorer, lock screen, telemetry pipeline, admin dashboard.
- 25 windowed apps in v2 (calculator, paint, photos, video, notepad, word, excel, powerpoint, outlook, edge, vscode, terminal, explorer, photoshop, fl studio, docker, putty, filezilla, ssms‑style SQL viewer, task manager, event viewer, settings, pdf reader, admin console). v1 ships 23 of the same partials.
- The whole thing is intentionally over‑engineered: SPA routing, lazy‑loaded code‑split bundles, a typed state store, an admin OAuth flow, a Chart.js analytics dashboard, and a CI/CD pipeline that builds **both** tracks and rsyncs them to Hostinger atomically.

---

## Tech stack

**Frontend (v2)** — React 19.2 · TypeScript 6 · Vite 8 · React Router 6 · Tailwind 3.4 · [Zustand 5 with `persist`](v2/src/store/osStore.ts) · Chart.js 4 / react‑chartjs‑2

**Frontend (v1)** — Alpine.js · HTMX · Tailwind 3 · vanilla JS modules

**Backend** — PHP 8 (no framework) · MySQL · PDO with prepared statements · HMAC‑SHA256 session cookies (no JWT lib) · Google OAuth (Identity Services + `tokeninfo` verification)

**Tooling** — Vitest 4 (118 unit tests) · Playwright 1 (e2e) · `concurrently` for dual‑server dev · `actionlint` for CI · `git-filter-repo` for history hygiene

**Infra / CI** — GitHub Actions → rsync over SSH to Hostinger · atomic releases with snapshot for one‑click rollback · `.htaccess` rewrites for SPA + PHP coexistence

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       devante.johnson-rose.co.uk                │
└─────────────────────────────────────────────────────────────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │      Apache + .htaccess   │
                  └─────────────┬─────────────┘
                                │
        ┌──────────── / ────────┴──────── /v2/ ────────┐
        ▼                                              ▼
 ┌────────────────┐                          ┌──────────────────┐
 │  v1 — PHP/Alp  │                          │  v2 — React SPA  │
 │  index.php     │                          │  /v2/dist/...    │
 │  partials/*    │                          │  static + index  │
 │  Alpine store  │                          │  Zustand store   │
 └────────┬───────┘                          └────────┬─────────┘
          │                                           │
          └────────────┬──────────────────────────────┘
                       ▼
              ┌──────────────────┐
              │   /api/*.php     │  log · stats · admin_auth ·
              │                  │  admin_logout · admin_me ·
              │   shared API     │  database_query · send_email ·
              │                  │  news · weather · app
              └────────┬─────────┘
                       ▼
                 ┌───────────┐
                 │  MySQL    │  event_logs · email_logs
                 └───────────┘
```

Both tracks talk to the **same** PHP API. The React build is just a static SPA mounted at `/v2/`; it has no privileged knowledge the PHP build doesn't have, which kept porting honest.

---

## Selected highlights

### 1. HMAC‑signed admin session — no JWT library

The admin dashboard is gated by Google OAuth. To avoid pulling a JWT dep, I sign a tiny JSON payload with `hash_hmac('sha256', ...)` and store it in a `HttpOnly`, `SameSite=Lax`, `Secure` cookie. Verification is constant‑time via `hash_equals`. ([bootstrap.php:49-103](bootstrap.php#L49-L103))

```php
function issueAdminSession($email, $secret, $ttlSeconds = 86400) {
    $payload = json_encode(['email' => $email, 'exp' => time() + $ttlSeconds]);
    $encoded = b64UrlEncode($payload);
    $sig     = b64UrlEncode(hash_hmac('sha256', $encoded, $secret, true));
    setcookie(adminCookieName(), $encoded . '.' . $sig, [
        'expires'  => time() + $ttlSeconds,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => !in_array(strtok($_SERVER['HTTP_HOST'] ?? '', ':'), ['localhost', '127.0.0.1'], true),
    ]);
}

function requireAdmin($config) {
    $email = currentAdminEmail($config['admin_session_secret'] ?? '');
    if (!$email || !in_array($email, $config['admin_emails'] ?? [], true)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Admin auth required']);
        exit;
    }
    return $email;
}
```

Google id_tokens are verified server‑side via Google's `tokeninfo` endpoint, with explicit checks on `aud`, `iss`, `email_verified`, and an email allowlist — no client‑trusted claims. ([api/admin_auth.php](api/admin_auth.php))

### 2. Defence‑in‑depth SQL viewer

The SSMS‑styled app lets visitors read a few demo tables. The first version naively eval'd the SELECT — a textbook injection footgun. The hardened version cookie‑gates the endpoint, extracts the requested table name from the inbound query, allowlists it, and only ever runs a parameter‑free `SELECT * FROM \`<table>\` ORDER BY 1 DESC LIMIT 500`. ([api/database_query.php](api/database_query.php))

```php
requireAdmin($config);

$allowedTables = ['projects', 'experience', 'certifications', 'email_logs', 'event_logs'];

if (preg_match('/\[([a-zA-Z0-9_]+)\](?:\s*$|\s*;?\s*$)/', $query, $m)) {
    $table = strtolower($m[1]);
} elseif (preg_match('/from\s+`?([a-zA-Z0-9_]+)`?/i', $query, $m)) {
    $table = strtolower($m[1]);
}

if (!$table || !in_array($table, $allowedTables, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only SELECT queries against an allowlisted table are permitted.']);
    exit;
}

$stmt = $pdo->query("SELECT * FROM `{$table}` ORDER BY 1 DESC LIMIT 500");
```

Error responses are intentionally generic; details only land in `error_log` when `APP_DEBUG=true`. The same pattern is applied to [`api/send_email.php`](api/send_email.php).

### 3. Lazy app registry with code splitting

Every windowed app is registered once and lazy‑loaded via `React.lazy` + `Suspense`, so the initial JS payload is just the shell — apps stream in as visitors open them. ([v2/src/apps/registry.ts](v2/src/apps/registry.ts))

```ts
const FLStudio    = lazy(() => import('./flstudio/FLStudio'))
const AdminConsole = lazy(() => import('./admin/AdminConsole'))

export const apps: Record<string, AppDef> = {
  flstudio: { id: 'flstudio', title: 'FL Studio 24', icon: `${IMG}fl%20studio.webp`,
              defaultSize: { w: 1200, h: 720 }, Component: FLStudio },
  admin:    { id: 'admin',    title: 'Admin Console', icon: `${IMG}mssql.webp`,
              defaultSize: { w: 1180, h: 760 }, Component: AdminConsole },
  // …23 more
}
```

A production build yields one small `index-*.js` for the shell plus one chunk per app — the biggest (Admin Console with Chart.js) only loads when an authorised admin opens it.

### 4. Typed Zustand store with `persist`

A single typed store drives both the shell and every app. Settings, windowing state, the recycle bin, telemetry session id, mobile/tablet breakpoint, and the context menu all live in the same predictable place; `persist` mirrors the slices that should survive a refresh into `localStorage`. ([v2/src/store/osStore.ts](v2/src/store/osStore.ts))

### 5. Hybrid dev: one command boots PHP + Vite

`npm run dev` boots an Apache‑shaped PHP server **and** Vite in parallel, with a tiny PHP front controller that routes `/v2/*` traffic to Vite. That way the SPA hot‑reloads against the real PHP API on `localhost:8765` with no proxy gymnastics. ([dev-server.php](dev-server.php))

```jsonc
// v2/package.json
"scripts": {
  "dev":     "concurrently --kill-others-on-fail --names \"PHP,VITE\" \"npm:dev:php\" \"npm:dev:vite\"",
  "dev:vite": "vite",
  "dev:php":  "php -S localhost:8765 -t .. ../dev-server.php"
}
```

In production, Apache reverses the role — `.htaccess` rewrites `/v2/*` straight onto `v2/dist/`, and falls back to `v2/dist/index.html` for client‑side routes:

```apache
RewriteCond %{DOCUMENT_ROOT}/v2/dist/$1 -f [OR]
RewriteCond %{DOCUMENT_ROOT}/v2/dist/$1 -d
RewriteRule ^v2/(.+)$ v2/dist/$1 [L]
RewriteRule ^v2(/.*)?$ v2/dist/index.html [L]
```

---

## CI/CD

A single GitHub Actions workflow handles both tracks ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):

```
Push to main
   │
   ▼
┌──────────────────────────────────────────────────┐
│  1. Read deploy-config.json                       │
│  2. Auto‑detect project type (node-build / php)   │
│  3. Setup Node (only if v2/package.json exists)   │
│  4. v2: npm ci → npm run build → v2/dist          │
│  5. SSH into Hostinger, snapshot current release  │
│  6. rsync repo → release dir (excludes secrets    │
│     and dev‑only files via deploy-config.json)    │
│  7. Health‑check the live URL                     │
│  8. Keep last N releases for rollback             │
└──────────────────────────────────────────────────┘
```

Secrets live in GitHub Actions Secrets only — no `.env` is ever rsync'd. A separate [rollback workflow](.github/workflows/rollback.yml) flips the live directory back to a previous snapshot in seconds.

---

## Testing

- **`npm run test`** — 118 Vitest specs across 10 files cover the store, the windowing hooks (drag/resize), the calculator engine, the paint flood‑fill, the terminal commands, the filesystem model, the clock hook, and the app registry contract.
- **`npm run e2e`** — Playwright drives the shell end‑to‑end (boot → login → open apps → minimise/restore).
- **`actionlint`** — every CI workflow is linted on push.

```
 Test Files  10 passed (10)
      Tests  118 passed (118)
```

---

## Local development

```bash
# 1. PHP + MySQL prerequisites (or XAMPP/Laragon/MAMP)
cp .env.example .env       # fill in any keys you have

# 2. v1 (PHP/Alpine) only
php -S localhost:8000

# 3. v2 (React) — boots both tiers
cd v2
npm install
npm run dev                # PHP at :8765, Vite at :5173, v2 mounted under /v2/
```

The site degrades gracefully if optional services (Google APIs, OAuth, SMTP) aren't configured — features that need them simply hide themselves.

---

## Repository layout

```
.
├── api/                       # JSON endpoints (admin auth, stats, logs, contact)
├── assets/                    # Images, CSS, vanilla JS modules used by v1
├── partials/                  # v1 PHP partials (shell, taskbar, start-menu, apps/*)
├── data/portfolio.json        # Single source of truth for CV-derived settings
├── v2/                        # Parallel React build (Vite-based)
│   ├── src/apps/              # 25 windowed apps, each its own module + tests
│   ├── src/shell/             # Taskbar, StartMenu, ContextMenu, etc.
│   ├── src/store/osStore.ts   # Zustand store
│   ├── src/windowing/         # Drag + resize hooks (tested)
│   └── e2e/                   # Playwright specs
├── .github/workflows/         # deploy.yml + rollback.yml
├── .htaccess                  # SPA + PHP rewrites, deny rules for sensitive files
├── bootstrap.php              # Helpers: session, paths, admin guard
├── config.php                 # .env loader + structured config
├── dev-server.php             # Front controller used by `php -S` in dev
└── index.php                  # v1 entry point
```

---

## Notes & gotchas (the kind of thing that bites in production)

- **Dev URL decoding** — `dev-server.php` `rawurldecode`s the request path before existence checks; without it `fl%20studio.webp` produced a phantom 404 on the bundled icon.
- **Snap targets vs Win11 chrome** — window resize uses an 8‑directional invisible border (~6–8 px) and adaptive cursor capture, integrated with the snap‑preview overlay. This is the single subtlest piece of the UI and lives in [`v2/src/windowing/useResize.ts`](v2/src/windowing/useResize.ts) with its own test suite.
- **Recycle bin restore** — items seeded into the static filesystem can be sent to the bin and restored back to their original path. The store keeps a `restoredSeeds` set so seeded items survive a refresh.
- **CV stays private** — the printable CV is hosted only on the production server. It is gitignored and is not part of the public repo.

---

## License

MIT. Use as much or as little of this as you like — it's here to be read.

## Contact

DeVanté Johnson-Rose · Applications Support Engineer & Full-Stack Developer
**<https://devante.johnson-rose.co.uk>**
