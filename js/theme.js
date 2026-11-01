/*
 * theme.js — wires the dark-mode toggle button.
 * Loaded with `defer`.
 *
 * Shared contract with layout.js:
 *   - layout.js CREATES the toggle button with id "theme-toggle".
 *   - This file finds it by #theme-toggle and wires the behavior.
 *   The initial data-theme is already set by the inline <head> script before
 *   first paint; this file only reflects and flips that state.
 */
(function () {
  'use strict';

  function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function reflect(button) {
    var theme = currentTheme();
    var isDark = theme === 'dark';
    button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    var label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = isDark ? '\u2600\uFE0F Light' : '\u{1F319} Dark';
  }

  function wire(button) {
    if (!button || button.dataset.themeWired === 'true') {
      return;
    }
    button.dataset.themeWired = 'true';
    reflect(button);

    button.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      reflect(button);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {
        /* storage unavailable (private mode / disabled) — ignore */
      }
    });
  }

  function findAndWire() {
    wire(document.getElementById('theme-toggle'));
  }

  // The button is injected by layout.js. Wire it once layout signals ready,
  // and also attempt immediately in case layout already ran.
  document.addEventListener('layout:ready', findAndWire);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndWire);
  } else {
    findAndWire();
  }
})();
