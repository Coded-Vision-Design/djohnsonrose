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
- Denial-of-service via the public origin server — please don't probe with traffic
- Anything that's already obvious from reading the source (the repo is public; that's the point)

## Hardening already in place

- Admin endpoints (`/api/admin_*.php`, `/api/database_query.php`, `/api/stats.php`) require an HMAC‑signed session cookie issued only after Google id_token verification against an email allowlist
- Sensitive files are denied at the Apache layer (`.env`, `config.php`, `bootstrap.php`, `data/cv.*`, etc.) — see [`.htaccess`](.htaccess), [`data/.htaccess`](data/.htaccess), [`partials/.htaccess`](partials/.htaccess)
- The SSMS‑styled SQL viewer is locked to an explicit table allowlist; user-supplied SQL is never executed
- Telemetry (`/api/log.php`) is fire-and-forget and gated by cookie consent in both v1 and v2
- All MySQL access uses PDO with prepared statements

Thanks for helping keep this project safe.
