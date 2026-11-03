'use strict';

// Bookings + family account API. Mounted under /api. All SQL is parameterized
// with $1 placeholders. Bookings may be created by a guest (user_id null) or a
// logged-in family (user_id from the session — never from the request body).

const express = require('express');
const { query } = require('../db/pool');
const { validateBooking } = require('../lib/validate');
const { requireAuth } = require('../lib/auth');
const { balanceFromLedger } = require('../lib/credits');

const router = express.Router();

// Shape returned to clients. Mirrors the DB columns we are happy to expose.
function safeBooking(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    guardian_name: row.guardian_name,
    guardian_contact: row.guardian_contact,
    student_name: row.student_name,
    student_grade: row.student_grade,
    subject: row.subject,
    session_type: row.session_type,
    length: row.length,
    preferred_times: row.preferred_times,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
  };
}

// Map the frontend form field names to the validator's API field names.
// Accept either the frontend names (guardianName, _replyto/guardianContact,
// student, grade, times) OR the already-mapped snake_case names.
function fromFrontend(body = {}) {
  return {
    guardian_name: body.guardian_name ?? body.guardianName,
    guardian_contact: body.guardian_contact ?? body.guardianContact ?? body._replyto,
    student_name: body.student_name ?? body.student,
    student_grade: body.student_grade ?? body.grade,
    subject: body.subject,
    session_type: body.session_type ?? body.sessionType,
    length: body.length,
    preferred_times: body.preferred_times ?? body.times,
    notes: body.notes,
  };
}

// POST /bookings — guest OR logged-in. status always starts at 'requested';
// a client-supplied status is ignored.
router.post('/bookings', async (req, res, next) => {
  try {
    const mapped = fromFrontend(req.body);
    const { ok, errors, value } = validateBooking(mapped);
    if (!ok) {
      return res.status(400).json({ error: errors[0], errors });
    }

    const userId = req.session && req.session.userId ? req.session.userId : null;

    const inserted = await query(
      `INSERT INTO bookings
         (user_id, guardian_name, guardian_contact, student_name, student_grade,
          subject, session_type, length, preferred_times, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested')
       RETURNING id, user_id, guardian_name, guardian_contact, student_name,
                 student_grade, subject, session_type, length, preferred_times,
                 notes, status, created_at`,
      [
        userId,
        value.guardian_name,
        value.guardian_contact,
        value.student_name,
        value.student_grade,
        value.subject,
        value.session_type,
        value.length,
        value.preferred_times,
        value.notes,
      ]
    );

    return res.status(201).json({ booking: safeBooking(inserted.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

// GET /bookings — the logged-in family's bookings, newest first.
router.get('/bookings', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, guardian_name, guardian_contact, student_name,
              student_grade, subject, session_type, length, preferred_times,
              notes, status, created_at
         FROM bookings
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.session.userId]
    );
    return res.status(200).json({ bookings: result.rows.map(safeBooking) });
  } catch (err) {
    return next(err);
  }
});

// GET /account — { bookings, balance } for the logged-in family.
router.get('/account', requireAuth, async (req, res, next) => {
  try {
    const bookingsResult = await query(
      `SELECT id, user_id, guardian_name, guardian_contact, student_name,
              student_grade, subject, session_type, length, preferred_times,
              notes, status, created_at
         FROM bookings
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [req.session.userId]
    );
    const creditsResult = await query(
      'SELECT delta_private_hour_equiv FROM credits WHERE user_id = $1',
      [req.session.userId]
    );
    return res.status(200).json({
      bookings: bookingsResult.rows.map(safeBooking),
      balance: balanceFromLedger(creditsResult.rows),
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
