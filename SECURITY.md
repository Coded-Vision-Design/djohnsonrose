# Security policy

## Reporting a vulnerability

If you discover a security issue in this codebase, **please do not open a public GitHub issue**.

Email **<devante@johnson-rose.co.uk>** with:

- A short description of the problem
- The file(s) or endpoint(s) involved
- A proof of concept if you have one
- Whether you'd like to be credited in the fix

I'll acknowledge receipt within 5 working days and aim to ship a fix within 30 days for anything exploitable. Coordinated disclosure is appreciated.

## What's in scope

- The PHP API under `/api/` and the admin auth flow
- The React build under `/v2/` (including the admin console)
- The Apache `.htaccess` rewrites and deny rules
- The GitHub Actions deployment pipeline

## What's out of scope

- Issues that require local-only credentials (e.g. a Hostinger SSH key)
- Third-party services (Google APIs, Hostinger, Cloudflare)
- Denial of service against the public origin server: please don't probe it with traffic
- Anything that's already obvious from reading the source (the repo is public; that's the point)

## Hardening already in place

- Admin data (`/api/stats.php`) requires an HMAC-signed session cookie, issued by `/api/admin_auth.php` only after Google id_token verification against an email allowlist (compared without regard to case). Sign-in is limited to 5 attempts per 15 minutes per IP address. Signing out (`POST /api/admin_logout.php`, from this site only) revokes every earlier cookie for that admin, not just the one in the browser
- Server code and configuration are denied at the Apache layer: `.env` and other dotfiles, `config.php`, `bootstrap.php`, `router.php`, `dev-server.php`, package manifests, and everything in `lib/`, `partials/` and `pages/`. See [`.htaccess`](.htaccess), [`lib/.htaccess`](lib/.htaccess), [`partials/.htaccess`](partials/.htaccess) and [`pages/.htaccess`](pages/.htaccess)
- `/data/` is denied by default ([`data/.htaccess`](data/.htaccess)), except the files the apps load in the browser, which are public on purpose:
  - `data/cv.pdf` and `data/cv.php`: the CV, including its contact details
  - `data/portfolio.json` and `data/client_wins.json`: portfolio content
  - `data/references.enc.json`: references, encrypted with a passphrase
  - the video clips (`.mp4`, `.webm`), which the root `.htaccess` allows anywhere
- Telemetry (`/api/log.php`) is gated by cookie consent in both builds. It accepts only same-origin POSTs of up to 8 KB, is rate limited per IP address, stores a shortened IP address and no location, and deletes records after 90 days. The details are on the site's [privacy notice](https://devante.johnson-rose.co.uk/privacy)
- The SSMS-styled SQL viewer (`/api/cv_data.php`) serves a fixed set of tables flattened from `data/portfolio.json`; visitor SQL is never run on the server
- All MySQL access uses PDO with prepared statements. Tables are created by `php lib/migrate.php`, never by a request
- Unknown URLs return a real 404

Thanks for helping keep this project safe.
