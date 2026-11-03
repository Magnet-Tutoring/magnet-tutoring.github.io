# Deploying Magnet Tutoring to Render

This guide moves the site from GitHub Pages to a single [Render](https://render.com)
Web Service that serves the existing static pages **and** the new API + admin
dashboard, backed by a managed Postgres database.

> **This document does not deploy anything and does not change DNS.** Every step
> below is performed by the site owner. The repository only *provides* the
> deployment artifacts (`render.yaml` and this file). Nothing here contacts
> Render or your domain registrar on its own.

## What you'll end up with

- One Render **Web Service** running `npm start` (`node server/index.js`).
- One Render **Postgres** database, wired to the service via `DATABASE_URL`.
- `magnettutoring.com` pointed at Render instead of GitHub Pages.

## Prerequisites

- A Render account with access to this Git repository.
- Owner access to the DNS for `magnettutoring.com` (wherever you bought it).
- The admin email address you want to use for the dashboard.

## 1. Create the Web Service

You can either use the Blueprint (`render.yaml`) or configure the service by hand.

**Option A — Blueprint (recommended).** In Render, choose **New > Blueprint**,
point it at this repository, and Render reads `render.yaml`. It will create the
web service and the Postgres database together and wire `DATABASE_URL` for you.

**Option B — Manual.** In Render, choose **New > Web Service** and connect this
repository, then set:

- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Health Check Path:** `/`

The server listens on the port Render provides via the `PORT` environment
variable (handled automatically in `server/index.js`).

## 2. Attach a Render Postgres and copy its URL

If you used the Blueprint, the database `magnet-tutoring-db` is already created
and linked. If you configured the service manually:

1. Choose **New > Postgres** and create a database.
2. Open the database and copy its **Internal Database URL** (the internal URL
   keeps traffic inside Render's network).
3. Paste that value into the web service's `DATABASE_URL` environment variable
   (next step).

The schema is applied automatically at startup (`server/db/migrate.js`, which is
idempotent). You can also run it manually with `npm run migrate`, and seed the
admin with `npm run seed:admin` once `ADMIN_EMAIL` is set.

## 3. Set environment variables

On the web service's **Environment** tab, set:

| Variable         | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `DATABASE_URL`   | The internal Postgres URL from step 2.                       |
| `SESSION_SECRET` | A long random string. (The Blueprint generates one for you.) |
| `ADMIN_EMAIL`    | The email that should have admin/dashboard access.           |
| `NODE_ENV`       | `production`                                                 |

Setting `NODE_ENV=production` turns on secure cookies and hides error stack
traces. **Do not commit real secret values to the repository** — set them only
in the Render dashboard.

Deploy the service and confirm it boots: visiting the Render-provided
`*.onrender.com` URL should load the home page, and `/admin` should prompt for
the admin login.

## 4. Repoint `magnettutoring.com` DNS to Render (owner action)

Once the Render URL works, move the custom domain:

1. In the Render web service, open **Settings > Custom Domains** and add
   `magnettutoring.com` (and `www.magnettutoring.com` if you use it). Render
   shows the DNS records it needs.
2. At your DNS provider, **replace the existing GitHub Pages records** with the
   records Render gave you:
   - For the apex `magnettutoring.com`, use Render's `A`/`ALIAS` target in place
     of the GitHub Pages `A` records (`185.199.108.153` and friends).
   - For `www`, point the `CNAME` at the Render target instead of
     `<user>.github.io`.
3. Wait for DNS to propagate and for Render to issue the TLS certificate.

**You (the owner) perform this DNS change.** This repository does not and cannot
change your DNS.

## 5. Remove/ignore the `CNAME` file after moving

The repo's `CNAME` file (contents: `magnettutoring.com`) is what tells GitHub
Pages to claim the domain. Once DNS points at Render:

1. Delete the `CNAME` file from the repository (or stop deploying this repo to
   GitHub Pages) so GitHub Pages no longer asserts ownership of the domain.
2. Optionally disable GitHub Pages for the repository in its settings.

Leaving both GitHub Pages and Render pointed at the same domain causes conflicts,
so retire the GitHub Pages side once Render is serving traffic.

## 6. Turn on the dynamic features (CRITICAL — the backend is not "on" until you do this)

Deploying the backend and repointing DNS are **not** enough on their own.
`js/config.js` ships with `BACKEND_ENABLED: false`, and that flag is what the
frontend reads. **Until you flip it, the deployed Render server still serves the
STATIC experience:** account pages show "coming soon", the booking form uses its
Formspree/mailto path, and the browser makes **no `/api` calls**. The backend
being live does not by itself switch on accounts, database-backed bookings, or
the admin dashboard — **only the flag does.**

Once the backend is live on Render and DNS points at it (steps 1–5 complete and
verified via the `*.onrender.com` URL):

1. In `js/config.js`, change `BACKEND_ENABLED: false` to `BACKEND_ENABLED: true`.
2. Commit that change and let Render redeploy (or trigger a manual deploy).
3. Verify on the live domain: account registration/login works, bookings go
   through `/api`, and `/admin` serves the dashboard for the `ADMIN_EMAIL` user.

If you ever need to fall back to the static experience (e.g. the backend is
down), set `BACKEND_ENABLED` back to `false` and redeploy — the site keeps
working as a static site with the Formspree/mailto booking path.

## CSRF / cookie strategy

The app is same-origin: the static pages, the API (`/api/*`), and the admin
dashboard (`/admin`) are all served by the one Render service. Session cookies
are `httpOnly`, `secure` in production, and `sameSite=lax`. On top of that, the
server rejects state-changing requests (`POST`/`PUT`/`PATCH`/`DELETE`) to
`/api` and `/admin` whose `Origin` host does not match the request `Host`.
Because everything is same-origin, legitimate browser requests pass this check
while cross-site form posts are blocked — this `sameSite=lax` + Origin check is
the CSRF strategy, so no separate CSRF token is required.

## Secrets hygiene

`.env` and `node_modules/` are gitignored; `.env.example` is tracked and lists
the variables to set. Never commit real secrets — configure them in the Render
dashboard as described above.
