'use strict';

// Pure credit-math module — no DB, no I/O. ALL credit arithmetic lives here so
// routes never do math inline. Values are "private-hour-equivalents": one
// bundle grants +4 of them, one private hour costs 1.0, and a group session
// counts half a private session.

// 1 bundle = +4 private-hour-equivalents.
const BUNDLE_PRIVATE_HOURS = 4;

// Base deduction by session length (private one-on-one).
const LENGTH_HOURS = {
  '1 hour': 1.0,
  '45 minutes': 0.75,
  '30 minutes': 0.5,
};

// Round to 2 decimals, returning a Number (avoids float dust like 0.375000001).
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// A session_type is "group" when it starts with "Group" (matches the frontend
// value "Group (up to 4 students)"). Everything else is treated as private.
function isGroup(sessionType) {
  return typeof sessionType === 'string' && /^group/i.test(sessionType.trim());
}

// Private-hour-equivalent to DEDUCT for a completed session. Unknown length
// (including 'Not sure yet') returns 0 so an admin enters the value manually.
function privateHoursForSession({ sessionType, length } = {}) {
  const base = LENGTH_HOURS[length];
  if (base === undefined) {
    return 0;
  }
  return isGroup(sessionType) ? base * 0.5 : base;
}

// Balance = sum of delta_private_hour_equiv across the ledger rows, rounded to
// 2 decimals. Tolerates string/numeric values and missing/garbage rows.
function balanceFromLedger(rows = []) {
  const total = (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    const delta = Number(row && row.delta_private_hour_equiv);
    return sum + (Number.isFinite(delta) ? delta : 0);
  }, 0);
  return round2(total);
}

module.exports = {
  BUNDLE_PRIVATE_HOURS,
  privateHoursForSession,
  balanceFromLedger,
  isGroup,
};
