'use strict';

// Singleton pg Pool. Uses parameterized queries only ($1, $2, ...).
// SSL is enabled for remote hosts (e.g. Render Postgres) and disabled for
// local development against localhost/127.0.0.1.

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

function isLocalHost(url) {
  if (!url) return true;
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    // If the URL cannot be parsed, assume local so we don't force SSL.
    return true;
  }
}

const pool = new Pool({
  connectionString,
  ssl: isLocalHost(connectionString) ? false : { rejectUnauthorized: false },
});

// Parameterized query helper. Never build SQL by string concatenation.
function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
