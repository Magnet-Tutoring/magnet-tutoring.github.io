'use strict';

// Unit tests for the auth/validation helpers. No database required: these
// cover the validators, a bcrypt hash+verify round-trip, and resolveRole.

const test = require('node:test');
const assert = require('node:assert');

const { validateRegistration, validateLogin } = require('../lib/validate');
const { hashPassword, verifyPassword, resolveRole } = require('../lib/auth');

test('validateRegistration accepts a well-formed body', () => {
  const { ok, errors, value } = validateRegistration({
    name: '  Dana Lee  ',
    email: '  Dana@Example.COM ',
    password: 'supersecret',
  });
  assert.strictEqual(ok, true);
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(value.name, 'Dana Lee', 'name is trimmed');
  assert.strictEqual(value.email, 'dana@example.com', 'email is trimmed + lowercased');
});

test('validateRegistration rejects missing name', () => {
  const { ok, errors } = validateRegistration({ email: 'a@b.com', password: 'longenough' });
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /name/i.test(e)));
});

test('validateRegistration rejects a malformed email', () => {
  const { ok, errors } = validateRegistration({ name: 'A', email: 'not-an-email', password: 'longenough' });
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /email/i.test(e)));
});

test('validateRegistration rejects a short password', () => {
  const { ok, errors } = validateRegistration({ name: 'A', email: 'a@b.com', password: 'short' });
  assert.strictEqual(ok, false);
  assert.ok(errors.some((e) => /8 characters/i.test(e)));
});

test('validateRegistration does not throw on non-object / missing input', () => {
  assert.doesNotThrow(() => validateRegistration());
  const { ok } = validateRegistration({ name: 123, email: null, password: 7 });
  assert.strictEqual(ok, false);
});

test('validateLogin requires email and password', () => {
  assert.strictEqual(validateLogin({ email: 'a@b.com', password: 'x' }).ok, true);
  assert.strictEqual(validateLogin({ email: 'a@b.com' }).ok, false);
  assert.strictEqual(validateLogin({ password: 'x' }).ok, false);
  assert.strictEqual(validateLogin({ email: 'bad', password: 'x' }).ok, false);
});

test('bcrypt hash + verify round-trip', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.notStrictEqual(hash, 'correct horse battery staple', 'hash is not plaintext');
  assert.match(hash, /^\$2[aby]\$12\$/, 'bcrypt cost is 12');
  assert.strictEqual(await verifyPassword('correct horse battery staple', hash), true);
  assert.strictEqual(await verifyPassword('wrong password', hash), false);
});

test('verifyPassword returns false for a missing hash instead of throwing', async () => {
  assert.strictEqual(await verifyPassword('anything', undefined), false);
  assert.strictEqual(await verifyPassword('anything', ''), false);
});

test('resolveRole returns family when ADMIN_EMAIL is unset', () => {
  const prev = process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_EMAIL;
  try {
    assert.strictEqual(resolveRole('anyone@example.com'), 'family');
  } finally {
    if (prev !== undefined) process.env.ADMIN_EMAIL = prev;
  }
});

test('resolveRole matches ADMIN_EMAIL case-insensitively', () => {
  const prev = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = 'Owner@Example.com';
  try {
    assert.strictEqual(resolveRole('owner@example.com'), 'admin');
    assert.strictEqual(resolveRole('OWNER@EXAMPLE.COM'), 'admin');
    assert.strictEqual(resolveRole('someone@else.com'), 'family');
  } finally {
    if (prev === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = prev;
  }
});
