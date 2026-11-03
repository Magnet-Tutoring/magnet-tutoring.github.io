'use strict';

// Auth helpers: password hashing/verification, role resolution, and the
// requireAuth/requireAdmin route guards. Roles and identity come from the
// server-side session only — never from client-supplied input. We never log
// passwords or full session cookies.

const bcrypt = require('bcrypt');

// Security requirement for minors' data: bcrypt cost must be >= 12.
const BCRYPT_COST = 12;

function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}

function verifyPassword(plain, hash) {
  // bcrypt.compare rejects only on malformed input; a bad/empty hash simply
  // yields false. Guard against a missing hash so we return false, not throw.
  if (typeof hash !== 'string' || hash.length === 0) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(plain, hash);
}

// 'admin' when the email matches ADMIN_EMAIL (case-insensitive), else 'family'.
function resolveRole(email) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || typeof email !== 'string' || !email) {
    return 'family';
  }
  return email.toLowerCase() === adminEmail.toLowerCase() ? 'admin' : 'family';
}

// 401 JSON if there is no authenticated session.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return next();
}

// Admin-only. Trusts only the role stored in the session at login. For browser
// GET navigations, redirect to the account page instead of returning JSON.
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.redirect('/account.html');
    }
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.session.role !== 'admin') {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.redirect('/account.html');
    }
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  resolveRole,
  requireAuth,
  requireAdmin,
  BCRYPT_COST,
};
