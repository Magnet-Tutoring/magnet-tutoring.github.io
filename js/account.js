/*
 * account.js — family account view for account.html.
 *
 * Loaded with `defer`. On load it asks GET /api/me whether a session exists:
 *   - logged in  -> show the "My account" view and populate it from
 *                   GET /api/account (bookings + bundle balance); wire logout.
 *   - logged out -> show the login / register forms and wire them to
 *                   POST /api/login and POST /api/register.
 *
 * All server-provided values are written with textContent only (never
 * innerHTML), so a malicious or garbled field can never inject markup.
 *
 * Only same-origin requests are made; the session cookie rides along via
 * credentials:'same-origin'. Errors are surfaced through the .form-status
 * elements, matching the rest of the site's form UX.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function show(el) {
    if (el) { el.hidden = false; }
  }

  function hide(el) {
    if (el) { el.hidden = true; }
  }

  // Set a .form-status message (text only). `kind` is 'success' | 'error' |
  // 'info'; there is no .is-info CSS rule, which harmlessly falls back.
  function setStatus(el, kind, text) {
    if (!el) { return; }
    el.className = 'form-status is-' + kind;
    el.textContent = text;
  }

  function clearStatus(el) {
    if (!el) { return; }
    el.className = 'form-status';
    el.textContent = '';
  }

  // Parse a JSON body, tolerating empty/non-JSON responses (e.g. 204).
  function readJson(res) {
    return res.text().then(function (body) {
      if (!body) { return {}; }
      try { return JSON.parse(body); } catch (e) { return {}; }
    });
  }

  function apiFetch(path, options) {
    var opts = options || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign(
      { 'Accept': 'application/json' },
      opts.body ? { 'Content-Type': 'application/json' } : {},
      opts.headers || {}
    );
    return fetch(path, opts);
  }

  // ---- views -------------------------------------------------------------

  function showAuthView() {
    hide($('account-loading'));
    hide($('my-account-view'));
    show($('auth-view'));
  }

  function showAccountView(user) {
    hide($('account-loading'));
    hide($('auth-view'));
    show($('my-account-view'));
    var nameEl = $('account-name');
    if (nameEl) {
      nameEl.textContent = (user && user.name) ? user.name : (user && user.email) || 'your account';
    }
    loadAccountData();
  }

  // Human-readable label for a booking, built from text-only pieces.
  function bookingLabel(b) {
    var parts = [];
    if (b.subject) { parts.push(String(b.subject)); }
    if (b.session_type) { parts.push(String(b.session_type)); }
    if (b.length) { parts.push(String(b.length)); }
    return parts.length ? parts.join(' · ') : 'Session request';
  }

  function renderBookings(bookings) {
    var list = $('bookings-list');
    var empty = $('bookings-empty');
    if (!list) { return; }
    while (list.firstChild) { list.removeChild(list.firstChild); }

    if (!Array.isArray(bookings) || bookings.length === 0) {
      show(empty);
      return;
    }
    hide(empty);

    var ul = document.createElement('ul');
    bookings.forEach(function (b) {
      var li = document.createElement('li');

      var title = document.createElement('strong');
      title.textContent = bookingLabel(b);
      li.appendChild(title);

      if (b.status) {
        li.appendChild(document.createTextNode(' — '));
        var status = document.createElement('span');
        status.textContent = String(b.status);
        li.appendChild(status);
      }

      if (b.student_name) {
        var student = document.createElement('div');
        student.className = 'field-help';
        student.textContent = 'Student: ' + String(b.student_name);
        li.appendChild(student);
      }

      if (b.preferred_times) {
        var times = document.createElement('div');
        times.className = 'field-help';
        times.textContent = 'Preferred times: ' + String(b.preferred_times);
        li.appendChild(times);
      }

      ul.appendChild(li);
    });
    list.appendChild(ul);
  }

  function loadAccountData() {
    var status = $('account-status');
    apiFetch('/api/account').then(function (res) {
      if (!res.ok) {
        setStatus(status, 'error', 'We could not load your account details right now. Please try again shortly.');
        return;
      }
      return readJson(res).then(function (data) {
        clearStatus(status);
        var balanceEl = $('credit-balance');
        if (balanceEl) {
          var balance = (data && typeof data.balance === 'number') ? data.balance : 0;
          balanceEl.textContent = String(balance);
        }
        renderBookings(data && data.bookings);
      });
    }).catch(function () {
      setStatus(status, 'error', 'We could not reach the server. Please try again shortly.');
    });
  }

  // ---- auth actions ------------------------------------------------------

  function wireLogin() {
    var form = $('login-form');
    var status = $('login-status');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; }
      setStatus(status, 'info', 'Signing in…');

      apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.elements.email.value.trim(),
          password: form.elements.password.value
        })
      }).then(function (res) {
        return readJson(res).then(function (data) {
          if (btn) { btn.disabled = false; }
          if (res.ok && data.user) {
            clearStatus(status);
            showAccountView(data.user);
          } else {
            setStatus(status, 'error', data.error || 'Invalid email or password.');
          }
        });
      }).catch(function () {
        if (btn) { btn.disabled = false; }
        setStatus(status, 'error', 'We could not reach the server. Please try again shortly.');
      });
    });
  }

  function wireRegister() {
    var form = $('register-form');
    var status = $('register-status');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; }
      setStatus(status, 'info', 'Creating your account…');

      apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          email: form.elements.email.value.trim(),
          password: form.elements.password.value
        })
      }).then(function (res) {
        return readJson(res).then(function (data) {
          if (btn) { btn.disabled = false; }
          if (res.ok && data.user) {
            clearStatus(status);
            showAccountView(data.user);
          } else {
            setStatus(status, 'error', data.error || 'We could not create your account.');
          }
        });
      }).catch(function () {
        if (btn) { btn.disabled = false; }
        setStatus(status, 'error', 'We could not reach the server. Please try again shortly.');
      });
    });
  }

  function wireLogout() {
    var btn = $('logout-btn');
    var status = $('account-status');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      btn.disabled = true;
      apiFetch('/api/logout', { method: 'POST' }).then(function () {
        btn.disabled = false;
        clearStatus(status);
        showAuthView();
      }).catch(function () {
        btn.disabled = false;
        setStatus(status, 'error', 'We could not sign you out. Please try again.');
      });
    });
  }

  // ---- init --------------------------------------------------------------

  // Is the server-backed feature set turned on? (see js/config.js). On the
  // static GitHub Pages site this is false, so we never hit /api/* — we just
  // show a friendly "coming soon" note and make no failing request.
  function backendEnabled() {
    return !!(window.MagnetConfig && window.MagnetConfig.BACKEND_ENABLED);
  }

  function showComingSoon() {
    hide($('account-loading'));
    hide($('auth-view'));
    hide($('my-account-view'));
    show($('account-coming-soon'));
  }

  function init() {
    if (!backendEnabled()) {
      // Static mode: no backend. Show the coming-soon note; make no API call.
      showComingSoon();
      return;
    }

    wireLogin();
    wireRegister();
    wireLogout();

    apiFetch('/api/me').then(function (res) {
      return readJson(res).then(function (data) {
        if (res.ok && data.user) {
          showAccountView(data.user);
        } else {
          showAuthView();
        }
      });
    }).catch(function () {
      // API unreachable: still let the visitor try to sign in / register.
      showAuthView();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
