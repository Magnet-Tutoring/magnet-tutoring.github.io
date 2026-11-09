'use strict';

// Admin-only dashboard + API. Two routers are exported:
//   - pageRouter  -> mounted at /admin      (server-rendered HTML dashboard)
//   - apiRouter   -> mounted at /api/admin  (JSON: status change, credit grant)
// Both are gated by requireAdmin (non-admin browser GETs redirect to
// /account.html; everything else gets JSON 401/403). All SQL is parameterized.

const express = require('express');
const { query } = require('../db/pool');
const { requireAdmin } = require('../lib/auth');
const { BUNDLE_PRIVATE_HOURS, balanceFromLedger, privateHoursForSession } = require('../lib/credits');

// Statuses an admin may set (per FEAT-003).
const ADMIN_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];

const pageRouter = express.Router();
const apiRouter = express.Router();

// Minimal HTML escaping so user-supplied booking fields can't inject markup.
function esc(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Dashboard page -------------------------------------------------------

// GET /admin — list all bookings (optional ?status= filter) with per-family
// balances and controls to change status and grant/adjust credit.
pageRouter.get('/', requireAdmin, async (req, res, next) => {
  try {
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const useFilter = ADMIN_STATUSES.includes(statusFilter);

    const bookingsResult = useFilter
      ? await query(
          `SELECT id, user_id, guardian_name, guardian_contact, student_name,
                  student_grade, subject, session_type, length, preferred_times,
                  notes, status, created_at
             FROM bookings WHERE status = $1 ORDER BY created_at DESC`,
          [statusFilter]
        )
      : await query(
          `SELECT id, user_id, guardian_name, guardian_contact, student_name,
                  student_grade, subject, session_type, length, preferred_times,
                  notes, status, created_at
             FROM bookings ORDER BY created_at DESC`
        );
    const bookings = bookingsResult.rows;

    // Current balance per family referenced by these bookings.
    const userIds = [...new Set(bookings.map((b) => b.user_id).filter((id) => id != null))];
    const balances = new Map();
    if (userIds.length > 0) {
      const creditsResult = await query(
        'SELECT user_id, delta_private_hour_equiv FROM credits WHERE user_id = ANY($1)',
        [userIds]
      );
      for (const id of userIds) {
        const rows = creditsResult.rows.filter((r) => r.user_id === id);
        balances.set(id, balanceFromLedger(rows));
      }
    }

    res.status(200).type('html').send(renderDashboard({ bookings, balances, statusFilter: useFilter ? statusFilter : '' }));
  } catch (err) {
    next(err);
  }
});

function renderStatusControls(booking) {
  const options = ADMIN_STATUSES.map(
    (s) => `<option value="${esc(s)}"${s === booking.status ? ' selected' : ''}>${esc(s)}</option>`
  ).join('');
  // Native form POST with a method override so it works without JS.
  return `
    <form class="booking-form" method="post" action="/api/admin/bookings/${esc(booking.id)}?_method=PATCH">
      <div class="field">
        <label for="status-${esc(booking.id)}">Status</label>
        <select id="status-${esc(booking.id)}" name="status">${options}</select>
      </div>
      <p class="btn-row"><button class="btn btn-primary" type="submit">Update status</button></p>
    </form>`;
}

function renderCreditControls(booking) {
  if (booking.user_id == null) {
    return '<p class="field-help">Guest booking, no family account to credit.</p>';
  }
  const suggested = privateHoursForSession({
    sessionType: booking.session_type,
    length: booking.length,
  });
  return `
    <form class="booking-form" method="post" action="/api/admin/credits">
      <input type="hidden" name="userId" value="${esc(booking.user_id)}">
      <div class="field">
        <label for="delta-${esc(booking.id)}">Credit delta (private-hour-equiv)</label>
        <input id="delta-${esc(booking.id)}" name="delta" type="number" step="0.25" value="${esc(BUNDLE_PRIVATE_HOURS)}">
        <p class="field-help">Bundle grant = +${esc(BUNDLE_PRIVATE_HOURS)}. Suggested deduction for this session = -${esc(suggested)} (enter as a negative number when completing).</p>
      </div>
      <div class="field">
        <label for="reason-${esc(booking.id)}">Reason</label>
        <input id="reason-${esc(booking.id)}" name="reason" type="text" placeholder="bundle grant / session deduction">
      </div>
      <p class="btn-row"><button class="btn btn-primary" type="submit">Apply credit</button></p>
    </form>`;
}

function renderBooking(booking, balances) {
  const balance = booking.user_id != null ? balances.get(booking.user_id) : null;
  const balanceLine =
    booking.user_id != null
      ? `<p class="field-help">Family #${esc(booking.user_id)} balance: <strong>${esc(balance)}</strong> private-hour-equiv</p>`
      : '<p class="field-help">Guest booking (no account).</p>';
  return `
    <article class="form-card" style="margin-bottom:1.5rem;">
      <h3>#${esc(booking.id)}: ${esc(booking.student_name) || '(student)'} · ${esc(booking.subject) || '(subject)'}</h3>
      <p>
        Guardian: ${esc(booking.guardian_name)} (${esc(booking.guardian_contact)})<br>
        Grade: ${esc(booking.student_grade)} ·
        ${esc(booking.session_type) || '(type n/a)'} ·
        ${esc(booking.length) || '(length n/a)'}<br>
        Preferred times: ${esc(booking.preferred_times) || 'None'}<br>
        Notes: ${esc(booking.notes) || 'None'}<br>
        Status: <strong>${esc(booking.status)}</strong> · Created: ${esc(booking.created_at)}
      </p>
      ${balanceLine}
      ${renderStatusControls(booking)}
      ${renderCreditControls(booking)}
    </article>`;
}

function renderFilter(current) {
  const link = (label, value) => {
    const href = value ? `/admin?status=${encodeURIComponent(value)}` : '/admin';
    const active = current === value ? ' btn-primary' : '';
    return `<a class="btn${active}" href="${href}">${esc(label)}</a>`;
  };
  return `
    <p class="btn-row">
      ${link('All', '')}
      ${ADMIN_STATUSES.map((s) => link(s, s)).join('\n      ')}
    </p>`;
}

function renderDashboard({ bookings, balances, statusFilter }) {
  const list = bookings.length
    ? bookings.map((b) => renderBooking(b, balances)).join('\n')
    : '<p class="prose">No bookings found.</p>';
  // The EXACT inline theme script must run before the stylesheet link. Shared
  // header/footer are injected by js/layout.js into the mounts below.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Admin | Magnet Tutoring</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="assets/favicon.png" type="image/png">
  <script>
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = saved ?? (prefersDark ? 'dark' : 'light');
  </script>
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/layout.js" defer></script>
  <script src="js/theme.js" defer></script>
</head>
<body data-page="admin">
  <a class="skip-link" href="#main">Skip to content</a>
  <header id="site-header"></header>
  <main id="main">
    <section class="section">
      <div class="container">
        <h1>Admin dashboard</h1>
        <p class="section-intro">All bookings${statusFilter ? ` filtered to “${esc(statusFilter)}”` : ''}. Change status or grant/adjust family credit below.</p>
        ${renderFilter(statusFilter)}
        ${list}
      </div>
    </section>
  </main>
  <footer id="site-footer"></footer>
</body>
</html>`;
}

// --- Admin API ------------------------------------------------------------

// Parse method override so the dashboard's native POST forms can PATCH.
function resolvedMethod(req) {
  const override = (req.query && req.query._method) || (req.body && req.body._method);
  return typeof override === 'string' ? override.toUpperCase() : req.method;
}

// Shared handler for PATCH /bookings/:id (also reachable via POST + _method).
async function updateBookingStatus(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid booking id.' });
    }
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    if (!ADMIN_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status is not valid.' });
    }
    const result = await query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }
    // Browser form submissions want to land back on the dashboard.
    if (req.accepts('html') && !req.xhr) {
      return res.redirect('/admin');
    }
    return res.status(200).json({ booking: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

apiRouter.patch('/bookings/:id', requireAdmin, updateBookingStatus);
// Native HTML forms can't PATCH; accept POST + ?_method=PATCH from the dashboard.
apiRouter.post('/bookings/:id', requireAdmin, (req, res, next) => {
  if (resolvedMethod(req) === 'PATCH') {
    return updateBookingStatus(req, res, next);
  }
  return res.status(405).json({ error: 'Method not allowed.' });
});

// POST /credits — insert a ledger row. delta is a signed number; a bundle
// grant is +BUNDLE_PRIVATE_HOURS, deductions/adjustments are arbitrary.
apiRouter.post('/credits', requireAdmin, async (req, res, next) => {
  try {
    const userId = Number.parseInt(req.body.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'A valid userId is required.' });
    }
    const delta = Number(req.body.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ error: 'A non-zero numeric delta is required.' });
    }
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    // Guard the FK: the target family must exist.
    const userExists = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    const inserted = await query(
      `INSERT INTO credits (user_id, delta_private_hour_equiv, reason, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, delta_private_hour_equiv, reason, created_by, created_at`,
      [userId, delta, reason || null, req.session.userId]
    );

    // Recompute the running balance for convenience.
    const ledger = await query(
      'SELECT delta_private_hour_equiv FROM credits WHERE user_id = $1',
      [userId]
    );

    if (req.accepts('html') && !req.xhr) {
      return res.redirect('/admin');
    }
    return res.status(201).json({
      credit: inserted.rows[0],
      balance: balanceFromLedger(ledger.rows),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { pageRouter, apiRouter, ADMIN_STATUSES };
