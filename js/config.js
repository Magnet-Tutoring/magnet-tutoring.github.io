/*
 * config.js — one small switch that controls whether the dynamic, server-backed
 * features are turned on.
 *
 * WHY THIS EXISTS
 * ---------------
 * The site runs in two modes:
 *   1. STATIC (GitHub Pages, magnettutoring.com today) — there is NO backend, so
 *      the /api/* endpoints and /admin do not exist. Account login/registration
 *      and database-backed bookings cannot work here.
 *   2. FULL (the Node/Express server in server/, e.g. deployed to Render) — the
 *      backend is present, so accounts, DB bookings, and the admin dashboard work.
 *
 * HOW TO SWITCH
 * -------------
 * - On the static site (now): keep BACKEND_ENABLED = false. Account features show
 *   a friendly "coming soon" note, the booking form uses its Formspree/email path,
 *   and no failing /api requests are made (so no console errors).
 * - After deploying the backend (see docs/DEPLOY.md): set BACKEND_ENABLED = true.
 *   Accounts, DB bookings, and the admin dashboard all come alive. Nothing else
 *   needs to change.
 *
 * Everything else on the site (all pages, subjects, pricing, tutors, reviews,
 * FAQ, dark mode, the booking FORM, the easter-egg game) works in BOTH modes.
 */
(function () {
  'use strict';
  window.MagnetConfig = {
    // FLIP THIS TO true ONCE THE BACKEND IS DEPLOYED (Render, etc.)
    BACKEND_ENABLED: false
  };
})();
