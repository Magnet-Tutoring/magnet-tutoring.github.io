'use strict';

// Auth router: register / login / logout / me. All SQL is parameterized with
// $1 placeholders. The login path returns a single uniform error so it does
// not reveal whether an email exists (anti-enumeration).

const express = require('express');
const { query } = require('../db/pool');
const { validateRegistration, validateLogin } = require('../lib/validate');
const { hashPassword, verifyPassword, resolveRole } = require('../lib/auth');

const router = express.Router();

// Shape sent to the client — never includes the password hash.
function safeUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// POST /register — create an account and start a session.
router.post('/register', async (req, res, next) => {
  try {
    const { ok, errors, value } = validateRegistration(req.body);
    if (!ok) {
      return res.status(400).json({ error: errors[0], errors });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [value.email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Could not create account.' });
    }

    const passwordHash = await hashPassword(value.password);
    const role = resolveRole(value.email);
    const inserted = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [value.name, value.email, passwordHash, role]
    );
    const user = inserted.rows[0];

    req.session.userId = user.id;
    req.session.role = user.role;
    return res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    return next(err);
  }
});

// POST /login — uniform 401 on any failure (bad password OR unknown email).
router.post('/login', async (req, res, next) => {
  try {
    const { ok, value } = validateLogin(req.body);
    const UNIFORM = 'Invalid email or password.';
    if (!ok) {
      return res.status(401).json({ error: UNIFORM });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [value.email]
    );
    const row = result.rows[0];
    const valid = row ? await verifyPassword(value.password, row.password_hash) : false;
    if (!row || !valid) {
      return res.status(401).json({ error: UNIFORM });
    }

    // Promote to admin on login if ADMIN_EMAIL now matches (covers the
    // "admin on first login" case where they registered before being named).
    let role = row.role;
    const resolved = resolveRole(row.email);
    if (resolved === 'admin' && role !== 'admin') {
      await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', row.id]);
      role = 'admin';
    }

    req.session.userId = row.id;
    req.session.role = role;
    return res.status(200).json({ user: safeUser({ ...row, role }) });
  } catch (err) {
    return next(err);
  }
});

// POST /logout — destroy the session and clear the cookie.
router.post('/logout', (req, res, next) => {
  if (!req.session) {
    return res.status(204).end();
  }
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('connect.sid');
    return res.status(204).end();
  });
});

// GET /me — the logged-in user or { user: null } (never 401) so the frontend
// can feature-detect without treating logged-out as an error.
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({ user: null });
    }
    const result = await query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.session.userId]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(200).json({ user: null });
    }
    return res.status(200).json({ user: safeUser(row) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
