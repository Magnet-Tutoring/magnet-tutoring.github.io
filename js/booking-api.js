/*
 * booking-api.js — API-first submit for the booking form.
 *
 * Loaded with `defer` on book.html. It does NOT attach its own submit handler
 * and it does NOT replace the page's existing Formspree/mailto flow. Instead it
 * exposes a single helper, window.MagnetBookingApi.trySubmit(form), that the
 * page's inline wireForm script calls BEFORE its Formspree/mailto path:
 *
 *   - It POSTs the mapped booking fields to /api/bookings as JSON.
 *   - On a 2xx response it resolves `true` (the API stored the booking), so the
 *     inline script shows its normal success copy and resets the form.
 *   - On any non-OK response, thrown error, or unreachable server it resolves
 *     `false`, and the inline script falls back to the existing Formspree/mailto
 *     behaviour with the same success/error UX.
 *
 * Only the session-request form is wired to the API. The $70 bundle form stays
 * on Formspree/mailto (bundles are recorded manually by an admin), so it never
 * calls this helper.
 *
 * No user data leaves the page except to the same-origin API here (or, on
 * fallback, to Formspree / the visitor's own email client as before).
 */
(function () {
  'use strict';

  // Read a single named field from the form, trimmed. Missing -> ''.
  function fieldValue(form, name) {
    var el = form.elements[name];
    return el && typeof el.value === 'string' ? el.value.trim() : '';
  }

  // The selected radio value for a group of inputs (e.g. sessionType).
  function picked(form, name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  // Map the book.html form fields to the API's accepted names. The server
  // accepts the frontend names directly, but we send explicit keys so the
  // contract is clear and the email field maps to guardian_contact.
  function payloadFromForm(form) {
    return {
      guardianName: fieldValue(form, 'guardianName'),
      guardianContact: fieldValue(form, 'guardianContact') || fieldValue(form, '_replyto'),
      student: fieldValue(form, 'student'),
      grade: fieldValue(form, 'grade'),
      subject: fieldValue(form, 'subject'),
      sessionType: picked(form, 'sessionType'),
      length: fieldValue(form, 'length'),
      times: fieldValue(form, 'times'),
      notes: fieldValue(form, 'notes')
    };
  }

  // Try the API first. Resolves true only when the booking was stored (2xx);
  // resolves false on any non-OK status, network error, or exception so the
  // caller can fall back to Formspree/mailto. Never rejects.
  function trySubmit(form) {
    if (!form || typeof fetch !== 'function') {
      return Promise.resolve(false);
    }
    return fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      // Same-origin so the session cookie rides along for logged-in families.
      credentials: 'same-origin',
      body: JSON.stringify(payloadFromForm(form))
    }).then(function (res) {
      return res && res.ok === true;
    }).catch(function () {
      return false;
    });
  }

  window.MagnetBookingApi = { trySubmit: trySubmit };
})();
