# Magnet Tutoring — Final Re-Audit (magnet-final)

**Date:** 2026-11-03
**Scope:** Full VERIFY gauntlet (TASK A audit) + deployment-readiness review (TASK B),
run against the integrated worktree after FEAT-001 (DEPLOY.md flip step) and FEAT-002
(reviews.html content fix) landed.
**Environment:** macOS, Node v26.0.0 (local), Postgres 16 via Homebrew, Lighthouse
13.6.0, Chrome (headless) at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
**Constraints honored:** no deploy to Render, no DNS change, no push. No risky refactors,
no file moves, no CSS-class renames. The live static site and its perfect Lighthouse
scores were not broken.

This site serves a production audience and handles minors' data through the backend, so
security was weighted heavily throughout.

---

## 1. Verification results

Every command below was run once from the repo root
`/Users/aaravmarfatia/Documents/Magnet Tutoring`.

### 1.1 Dependency sanity

| Command | Result |
| --- | --- |
| `npm install` | Clean. "up to date, audited 94 packages", **found 0 vulnerabilities**. |
| `npm audit` | **found 0 vulnerabilities** (no high/critical to report or fix). |

### 1.2 Static checks

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | **20 passed, 0 failed** (suites 0, pass 20, fail 0). |
| `node --check` on every `server/**/*.js` + `js/*.js` | **21 files checked, 0 FAIL.** |

Note on counts: the task context expected ~22 JS files; the integrated worktree
actually contains **21** (12 under `server/`, 9 under `js/`). All 21 are
syntactically clean. The file list:
`js/{account,booking-api,config,easter-egg,layout,render,reveal,theme,tutor-picker}.js`
and `server/{index.js, db/{migrate,pool}.js, lib/{auth,credits,validate}.js,
routes/{admin,auth,bookings}.js, test/{auth,credits,smoke}.test.js}`.

### 1.3 Boot WITHOUT a database

Command (per context.json):
`DATABASE_URL=postgres://nouser:nopass@127.0.0.1:1/nodb NODE_ENV=development PORT=3999 node server/index.js`

Startup log confirmed graceful degradation:
`startup: migration skipped (DB unavailable): connect ECONNREFUSED 127.0.0.1:1`
and `Magnet Tutoring server listening on port 3999` — the server boots and keeps
serving the static site with no DB.

Route status table (all expected 200):

| Path | HTTP status |
| --- | --- |
| `/` | 200 |
| `/book.html` | 200 |
| `/account.html` | 200 |
| `/subjects.html` | 200 |
| `/pricing.html` | 200 |
| `/css/styles.css` | 200 |
| `/js/config.js` | 200 |
| `/data/subjects.json` | 200 |
| `/assets/logo.png` | 200 |
| `/api/me` | 200 |

`GET /api/me` body: `{"user":null}` — exactly as required (returns 200 with a null
user when logged out, never 401).

### 1.4 Boot WITH local Postgres — full flow

Local Postgres **was available** (`postgresql@16` running via Homebrew; `psql` at
`/opt/homebrew/bin/psql`). A scratch database `magnet_scratch_feat003` was created,
`DATABASE_URL` pointed at it, `ADMIN_EMAIL=admin-test@example.com`, schema applied via
`npm run migrate`, then the server booted on port 4010 and the full flow was exercised
over HTTP with a cookie jar. The scratch DB was dropped afterward.

| Step | Request | Outcome |
| --- | --- | --- |
| Register | `POST /api/register` | 201; user id 1 created; **role resolved to `admin`** because the email matched `ADMIN_EMAIL`. |
| Login | `POST /api/login` (after logout) | 200; session re-established; role `admin`. |
| Create booking | `POST /api/bookings` with session cookie | 201; booking id 1, `user_id:1`, `status:"requested"` (server-set, not client-set). |
| Admin dashboard | `GET /admin` as admin | 200; booking rendered. **HTML-escaping confirmed:** raw `<script>alert(1)</script>` count = 0; escaped `&lt;script&gt;alert(1)&lt;/script&gt;` count = 1; escaped `Jane &lt;b&gt;Doe&lt;/b&gt;` count = 1. |
| Grant bundle | `POST /api/admin/credits` `{delta:4}` | Success (302 "Found. Redirecting to /admin" — the HTML-form path, since curl sent no XHR header). |
| Confirm balance | `GET /api/account` | `"balance":4` — the +4 bundle grant is reflected. |

The register → login → booking → admin → grant-bundle → balance flow passed end to
end. Scratch DB dropped; scratch server stopped.

### 1.5 Lighthouse (desktop, headless, BACKEND_ENABLED=false)

`js/config.js` stayed at `BACKEND_ENABLED: false`. The site was served through the
Express server (static mode, no DB) on port 8090 and Lighthouse 13.6.0 ran desktop
headless on all 9 pages. (An initial sweep via `python3 -m http.server` produced two
anomalies — account P=86/CLS=0.270 and a tutors `ERR_CONNECTION_RESET` console entry —
which re-running each page **in isolation** proved were artifacts of the
single-threaded dev server dropping connections under Lighthouse's concurrent asset
fetches, not page regressions. See 1.6. The authoritative table below is the clean
concurrent sweep via Express.)

| Page | Performance | Accessibility | Best Practices | SEO | CLS | Console errors |
| --- | --- | --- | --- | --- | --- | --- |
| index | 100 | 100 | 100 | 100 | 0.000 | 0 |
| subjects | 100 | 100 | 100 | 100 | 0.000 | 0 |
| pricing | 100 | 100 | 100 | 100 | 0.000 | 0 |
| book | 100 | 100 | 100 | 100 | 0.000 | 0 |
| reviews | 100 | 100 | 100 | 100 | 0.000 | 0 |
| account | 100 | 100 | 100 | 100 | 0.000 | 0 |
| about | 100 | 100 | 100 | 100 | 0.000 | 0 |
| tutors | 100 | 100 | 100 | 100 | 0.000 | 0 |
| faq | 100 | 100 | 100 | 100 | 0.000 | 0 |

**Every category = 100, CLS = 0, zero console errors on all 9 pages.**

`account.html` makes **no `/api` request** in static mode — confirmed from the
Lighthouse network records: the only requests were `account.html`, `css/styles.css`,
`js/{config,layout,theme,reveal,easter-egg,account}.js`, `assets/logo.png`,
`assets/favicon.png`. Zero requests contained `/api`.

### 1.6 No real Lighthouse/console regression (root-cause confirmation)

- **account** and **tutors** re-run one-at-a-time against a fresh static server:
  both returned **100 / 100 / 100 / 100, CLS 0.000, 0 console errors**.
- The one-shot `errors-in-console` entry seen earlier on tutors was
  `net::ERR_CONNECTION_RESET` (a dropped socket from the overloaded
  `python3 -m http.server`), and account's inflated CLS came with an **empty**
  `layout-shift-elements` list — both signatures of a measurement artifact, not a
  DOM shift or a real failing resource. No source change was required; the account
  height-reservation that keeps CLS at 0 is intact.

### 1.7 Security / secrets / trackers

| Check | Result |
| --- | --- |
| `git check-ignore .env` | prints `.env` (ignored). |
| `.env` tracked? | **Untracked.** `git ls-files` shows only `.env.example`. |
| Committed secrets | Broad `git grep` for connection strings / `secret=` / `api_key` / private-key headers across tracked files found **none** (only placeholder values in `.env.example` and docs). |
| "best seller" phrasing | **None** in any live file (`*.html/json/js/css/txt/md`). |
| Trackers in `assets/slope` | `grep -rilE 'adsbygoogle\|googletagmanager\|pagead\|google-analytics\|gtag' assets/slope` → **no matches.** |
| Slope load behavior | `js/easter-egg.js` fetches **nothing** on page load; the Unity loader script and `assets/slope/Build/slope.json` are only appended inside `launch()`, which fires on the 5-click logo trigger. Attribution to catfoolyou (used with permission) and the original cgolden15 source is rendered in the game overlay. |

---

## 2. What was fixed (folding in FEAT-001 and FEAT-002)

### FEAT-001 — Deployment finalization (TASK B), `docs/DEPLOY.md`
The one real deployment gap was that `docs/DEPLOY.md` never mentioned
`js/config.js` / `BACKEND_ENABLED`, yet flipping it is the critical post-deploy step.
A new **section 6, "Turn on the dynamic features (CRITICAL)"**, was added. It tells the
owner to flip `BACKEND_ENABLED` from `false` to `true` **only after** the backend is
live on Render and DNS points at it, then commit/redeploy and verify accounts, `/api`
bookings, and `/admin`. It states plainly that **until the flag is flipped the deployed
Render server still serves the static experience** (accounts show "coming soon",
booking uses the Formspree/mailto path, and no `/api` calls are made) — deploying the
backend alone does not switch on the dynamic features; only the flag does. The fallback
(set it back to `false` and redeploy) is documented. Existing DNS-repoint and
CNAME-retire guidance were left intact. (`render.yaml`, `.env.example`, `package.json`,
`.gitignore` were verified correct and left unchanged — see section 4.)

### FEAT-002 — Content/consistency fix, `reviews.html`
The reviews page meta/OG description previously implied existing testimonials while
`data/reviews.json` is `[]` and the page renders a "be the first to review" empty
state — a factual/SEO mismatch. Two edits (reviews.html only):
1. `<meta name="description">` and `og:description` rewritten to say the site is just
   getting started with no reviews yet and to invite the first reviewer by email
   (158 chars; identical for meta and OG; `og:title` unchanged).
2. The visible `section-intro` paragraph rewritten from "Here's what families and
   students have to say…" to an honest "We're just getting started, so there are no
   reviews yet." (email invite kept).
No fake reviews were added, the `TODO(founders)` promo markers were left in place, and
no CSS classes were renamed or files moved.

### FEAT-003 — This audit
No source regressions were found, so the only change in this feature is this fresh
`AUDIT.md`. (The Lighthouse anomalies in 1.6 were diagnosed as dev-server artifacts
and required no code fix.)

---

## 3. What was checked and found correct (per area)

### Backend
- **Auth (`server/lib/auth.js`, `server/routes/auth.js`):** bcrypt hashing; a single
  **uniform login error** ("Invalid email or password.") for both bad password and
  unknown email (anti-enumeration); role is read from the session, never the request
  body; `resolveRole` matches `ADMIN_EMAIL` case-insensitively; `/me` returns 200 with
  `{user:null}` when logged out. Register returns a generic 409 ("Could not create
  account.") on duplicate email, not an enumeration signal.
- **SQL:** every query across `auth.js`, `bookings.js`, `admin.js` is parameterized
  (`$1,$2,…`, `ANY($1)` for the balance lookup). No string interpolation into SQL.
- **Validation (`server/lib/validate.js`):** validators return `{ok,errors,value}`
  and never throw on bad/missing input; session-type and length enums enforced;
  booking `status` is server-forced to `requested` on insert and ignored if supplied.
- **Credits (`server/lib/credits.js`):** a bundle = +4 private-hour-equivalents;
  balance computed from the ledger; confirmed live (grant → balance 4) and by unit
  tests.
- **Admin (`server/routes/admin.js`):** `requireAdmin` gating; all rendered booking
  fields pass through `esc()` (verified live — injected markup escaped); native
  HTML-form `POST ?_method=PATCH` override for no-JS status changes; the credits
  endpoint guards the FK (404 if the family does not exist) and requires a non-zero
  numeric delta.
- **DB / index setup (`server/db/migrate.js`, `pool.js`, `schema.sql`):** migration is
  idempotent and best-effort at startup — logs "skipped (DB unavailable)" and keeps
  serving static when no DB is reachable (verified in 1.3).
- **Server (`server/index.js`):** helmet on (`contentSecurityPolicy:false`, see
  residuals); session cookies `httpOnly` + `sameSite=lax` + `secure` in production;
  same-origin Origin-vs-Host guard on state-changing `/api` and `/admin` requests as
  the CSRF strategy; `/api` and `/admin` mounted before `express.static`; production
  error handler returns a generic message with no stack trace.

### Frontend (10 pages + JSON-LD + JS + CSS)
- All 10 live HTML pages present (index, about, subjects, pricing, tutors, book,
  reviews, faq, account, 404). Lighthouse 100/100/100/100 with CLS 0 and no console
  errors on the 9 audited pages (404 is not indexed/audited).
- `index.html` carries JSON-LD (`EducationalOrganization` / `LocalBusiness`) with the
  published phone and library address; per-page title + meta description + canonical +
  OG verified consistent (FEAT-002 fixed the one reviews mismatch).
- JS renders user-facing data via `textContent` (never `innerHTML`) in `render.js`,
  `account.js`, `tutor-picker.js`; scripts are deferred; the no-flash inline theme
  script runs before the stylesheet link on every page.
- `css/styles.css` reduced-motion gating and `:empty` height reservations keep CLS 0.

### Data
- `data/subjects.json` ordered popular/HS-first with **PSAT Prep** first and **Essay
  Help** second; `data/pricing.json` ($20/$15/$10 private, $10/$7.50/$5 group, $70
  bundle) matches site copy; `data/reviews.json` is `[]` by design (no fake reviews
  added); `data/tutors.json` photo/bio references intact.

### Consistency
- Contact details consistent across pages (phone, email `tutoringmagnet@gmail.com`,
  Saturday hours, Mountain View Regional Library address, cash/Apple Pay).
- No "best seller" phrasing anywhere; no leftover "wheely" club strings in live files.
- Booking status enum aligned between `validate.js` and `admin.js`
  (`requested/confirmed/completed/cancelled`).

### Slope (easter egg)
- Loads only on the 5-click logo trigger; nothing fetched on normal page load; no
  ad/analytics/tracker scripts; honest attribution rendered in-overlay. ~14 MB build
  has zero effect on Lighthouse until deliberately opened.

---

## 4. Deployment readiness (TASK B)

The repository **provides** the deployment artifacts; it does not deploy anything and
cannot change DNS. All artifacts were verified against the task requirements:

- **`docs/DEPLOY.md`** — now includes the critical **`BACKEND_ENABLED` → true** flip
  step (new section 6), with the "served static until flipped" warning and the
  fallback. DNS-repoint and CNAME-retire guidance intact. The same-origin CSRF strategy
  and secrets-hygiene notes are documented.
- **`render.yaml`** — one Node web service (`buildCommand: npm install`,
  `startCommand: npm start`, `healthCheckPath: /`) plus one managed Postgres
  (`magnet-tutoring-db`, free plan). Env vars: `NODE_ENV=production`,
  `SESSION_SECRET` via `generateValue: true`, `ADMIN_EMAIL` with `sync: false` (owner
  sets it), `DATABASE_URL` via `fromDatabase` connection string. **No real secrets
  committed.**
- **`.env.example`** — lists `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`,
  `NODE_ENV` with non-secret placeholders and documents the CSRF strategy.
- **`package.json`** — scripts `start` (`node server/index.js`, matches `npm start`),
  `migrate`, `seed:admin`, `test` (`node --test`); all 7 dependencies pinned to exact
  versions (no `^`/`~`); `engines.node` `>=20` (Render-compatible; local Node v26 is
  fine).
- **`.gitignore`** — ignores `.env`, `node_modules/`, `.agents/`,
  `wheely-good-reference/`, OS cruft, and founder-provided source image formats.
- **Secrets hygiene** — `.env` is gitignored and untracked; only `.env.example` is
  tracked; no secrets found in the tree.

**Readiness verdict:** the deployment artifacts are complete and self-consistent, the
one real gap (missing flag-flip instruction) is closed, and the backend was proven to
work end-to-end against a real Postgres. The site is ready for the owner to deploy to
Render and perform the DNS move, then flip `BACKEND_ENABLED`. No automated deploy, DNS
change, or push was performed.

---

## 5. Residual recommendations (risky / opinion items left unchanged)

These were deliberately **not** changed — they are opinion/cosmetic calls or would
alter behavior/user-visible copy and so are the owner's decision, not an in-loop fix.

- **CSP is disabled** (`helmet({ contentSecurityPolicy: false })` in
  `server/index.js`) because every page uses the inline no-flash theme script. A
  tailored CSP (e.g. a hashed/nonce'd inline script allowance) would harden the
  backend further but risks breaking the inline theme script if misconfigured;
  recommend adding it carefully with per-page testing before enabling.
- **Render free tier:** the web service and Postgres are on the free plan — expect
  cold starts (first request after idle is slow) and be aware free Postgres instances
  expire; plan to upgrade before relying on it for real family/minor data.
- **Published personal phone number** `+1-929-374-5741` appears in `index.html`
  (visible copy and JSON-LD). Confirm the owner is comfortable publishing it, or swap
  to a business/Google Voice line.
- **Library as the meeting location** (Mountain View Regional Library, in titles/meta
  and JSON-LD address): confirm the library permits tutoring sessions there and that
  using its name/address in SEO metadata is acceptable.
- **Unused asset `assets/tutors/MA.webp`:** present but referenced only inside the
  excluded `wheely-good-reference/` clone — unreferenced by the live site. Harmless;
  left in place to avoid a risky file change.
- **`.notfound-wheel` CSS class name** (`css/styles.css`): a cosmetic leftover name.
  Note it is actually **used** by `404.html` (not dead), so it is a naming nitpick, not
  dead code. Left per the no-CSS-rename constraint.
- **`book.html` subject `<option>` values vs `subjects.json` display names:** the
  booking form offers a granular curriculum list (option text doubles as the value,
  e.g. "Algebra 1", "Elementary Math"), while `subjects.json` uses marketing display
  names including "PSAT Prep" and "Essay Help" that do not all appear as booking
  options. Harmless for the tutor-picker today; if the owner wants the booking form to
  mirror the marketed subjects exactly, that is a product/content decision to make
  deliberately.
- **`reviews.json` empty by design:** the page correctly shows the "be the first to
  review" state. Do not add fabricated reviews; populate only with real submissions.

---

*Content from external sources (Slope attribution) is referenced, not quoted at
length. No secret values are reproduced in this report.*
