'use strict';

// Applies server/db/schema.sql against the configured database (idempotent).
// With --seed-admin, promotes the ADMIN_EMAIL user to role 'admin' if that
// user already exists (no-op if they have not registered yet).
//
// Can be run directly (`npm run migrate` / `npm run seed:admin`) or imported
// and invoked as migrate() from server startup.

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool, query } = require('./pool');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

async function applySchema() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await query(sql);
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('seed-admin: ADMIN_EMAIL not set, skipping.');
    return;
  }
  const result = await query(
    "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id",
    [adminEmail]
  );
  if (result.rowCount > 0) {
    console.log(`seed-admin: promoted ${adminEmail} to admin.`);
  } else {
    console.log(`seed-admin: no user found for ADMIN_EMAIL (will apply once they register).`);
  }
}

// Runs the migration. Resolves on success; rejects on failure.
async function migrate({ seedAdmin: doSeed = false } = {}) {
  await applySchema();
  if (doSeed) {
    await seedAdmin();
  }
}

async function main() {
  const doSeed = process.argv.includes('--seed-admin');
  try {
    await migrate({ seedAdmin: doSeed });
    console.log('migrate: schema applied successfully.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    // Never print the connection password.
    console.error('migrate: failed:', err.message);
    try {
      await pool.end();
    } catch {
      /* ignore pool teardown errors */
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrate };
