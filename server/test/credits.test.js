'use strict';

// Unit tests for the pure credit-math module. No database required.

const test = require('node:test');
const assert = require('node:assert');

const {
  BUNDLE_PRIVATE_HOURS,
  privateHoursForSession,
  balanceFromLedger,
  isGroup,
} = require('../lib/credits');

const { validateBooking } = require('../lib/validate');

test('a bundle grants +4 private-hour-equivalents', () => {
  assert.strictEqual(BUNDLE_PRIVATE_HOURS, 4);
});

test('privateHoursForSession: private sessions deduct full hours', () => {
  const priv = 'Private (one-on-one)';
  assert.strictEqual(privateHoursForSession({ sessionType: priv, length: '1 hour' }), 1.0);
  assert.strictEqual(privateHoursForSession({ sessionType: priv, length: '45 minutes' }), 0.75);
  assert.strictEqual(privateHoursForSession({ sessionType: priv, length: '30 minutes' }), 0.5);
});

test('privateHoursForSession: group sessions count half', () => {
  const grp = 'Group (up to 4 students)';
  assert.strictEqual(privateHoursForSession({ sessionType: grp, length: '1 hour' }), 0.5);
  assert.strictEqual(privateHoursForSession({ sessionType: grp, length: '45 minutes' }), 0.375);
  assert.strictEqual(privateHoursForSession({ sessionType: grp, length: '30 minutes' }), 0.25);
});

test('privateHoursForSession: unknown / Not sure yet returns 0', () => {
  assert.strictEqual(privateHoursForSession({ sessionType: 'Private (one-on-one)', length: 'Not sure yet' }), 0);
  assert.strictEqual(privateHoursForSession({ sessionType: 'Private (one-on-one)', length: 'whatever' }), 0);
  assert.strictEqual(privateHoursForSession({}), 0);
  assert.strictEqual(privateHoursForSession(), 0);
});

test('isGroup matches the Group session type only', () => {
  assert.strictEqual(isGroup('Group (up to 4 students)'), true);
  assert.strictEqual(isGroup('group'), true);
  assert.strictEqual(isGroup('Private (one-on-one)'), false);
  assert.strictEqual(isGroup(undefined), false);
});

test('balanceFromLedger sums a grant, a deduction, and an adjust', () => {
  // +4 bundle, then a completed 1h private (-1.0) => 3.0
  const afterDeduction = balanceFromLedger([
    { delta_private_hour_equiv: 4 },
    { delta_private_hour_equiv: -1.0 },
  ]);
  assert.strictEqual(afterDeduction, 3.0);

  // Add a +0.5 adjustment => 3.5
  const afterAdjust = balanceFromLedger([
    { delta_private_hour_equiv: 4 },
    { delta_private_hour_equiv: -1.0 },
    { delta_private_hour_equiv: 0.5 },
  ]);
  assert.strictEqual(afterAdjust, 3.5);
});

test('balanceFromLedger tolerates string deltas and empty/garbage input', () => {
  assert.strictEqual(balanceFromLedger([{ delta_private_hour_equiv: '4' }, { delta_private_hour_equiv: '-0.75' }]), 3.25);
  assert.strictEqual(balanceFromLedger([]), 0);
  assert.strictEqual(balanceFromLedger(), 0);
  assert.strictEqual(balanceFromLedger([{}, null, { delta_private_hour_equiv: 'nope' }]), 0);
});

test('validateBooking rejects missing required fields', () => {
  const { ok, errors } = validateBooking({});
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /guardian name/i.test(e)));
  assert.ok(errors.some((e) => /guardian contact/i.test(e)));
  assert.ok(errors.some((e) => /grade/i.test(e)));
});

test('validateBooking accepts a well-formed booking', () => {
  const { ok, value } = validateBooking({
    guardian_name: '  Sam Rivera ',
    guardian_contact: 'sam@example.com',
    student_grade: '7',
    session_type: 'Private (one-on-one)',
    length: '1 hour',
  });
  assert.strictEqual(ok, true);
  assert.strictEqual(value.guardian_name, 'Sam Rivera');
});
