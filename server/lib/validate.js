'use strict';

// Hand-rolled validators. Each returns { ok, errors, value } and NEVER throws
// on bad input — callers inspect `ok`/`errors`. `value` holds the trimmed,
// sanitized fields so routes can use the cleaned data directly.

// Deliberately simple email shape check (not full RFC 5322): one @, non-empty
// local and domain parts, a dot in the domain, no whitespace.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SESSION_TYPES = ['Private (one-on-one)', 'Group (up to 4 students)'];
const LENGTHS = ['30 minutes', '45 minutes', '1 hour', 'Not sure yet'];
// Must match the admin status vocabulary in server/routes/admin.js
// (ADMIN_STATUSES), which is the only place a booking status is set.
const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled'];

// Coerce to a trimmed string; non-strings (undefined/null/number) become ''.
function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateRegistration(body = {}) {
  const errors = [];
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) {
    errors.push('Name is required.');
  }
  if (!email) {
    errors.push('Email is required.');
  } else if (!EMAIL_RE.test(email)) {
    errors.push('Email is not valid.');
  }
  if (!password) {
    errors.push('Password is required.');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  return { ok: errors.length === 0, errors, value: { name, email, password } };
}

function validateLogin(body = {}) {
  const errors = [];
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    errors.push('Email is required.');
  } else if (!EMAIL_RE.test(email)) {
    errors.push('Email is not valid.');
  }
  if (!password) {
    errors.push('Password is required.');
  }

  return { ok: errors.length === 0, errors, value: { email, password } };
}

// Booking validator (consumed by FEAT-003). Accepts the API field names and
// enforces the required fields plus the session_type / length / status enums.
function validateBooking(body = {}) {
  const errors = [];
  const value = {
    guardian_name: str(body.guardian_name),
    guardian_contact: str(body.guardian_contact),
    student_name: str(body.student_name),
    student_grade: str(body.student_grade),
    subject: str(body.subject),
    session_type: str(body.session_type),
    length: str(body.length),
    preferred_times: str(body.preferred_times),
    notes: str(body.notes),
    status: str(body.status),
  };

  if (!value.guardian_name) {
    errors.push('Guardian name is required.');
  }
  if (!value.guardian_contact) {
    errors.push('Guardian contact is required.');
  }
  if (!value.student_grade) {
    errors.push('Student grade is required.');
  }
  if (value.session_type && !SESSION_TYPES.includes(value.session_type)) {
    errors.push('Session type is not valid.');
  }
  if (value.length && !LENGTHS.includes(value.length)) {
    errors.push('Length is not valid.');
  }
  if (value.status && !STATUSES.includes(value.status)) {
    errors.push('Status is not valid.');
  }

  return { ok: errors.length === 0, errors, value };
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateBooking,
  EMAIL_RE,
  SESSION_TYPES,
  LENGTHS,
  STATUSES,
};
