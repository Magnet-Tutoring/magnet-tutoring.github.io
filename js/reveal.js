/*
 * reveal.js — scroll-reveal via IntersectionObserver (progressive enhancement).
 * Loaded with `defer`. No JSON / user data flows through this file; it only
 * toggles CSS classes, never innerHTML.
 *
 * PROGRESSIVE-ENHANCEMENT CONTRACT (matches css/styles.css):
 *   - Elements marked [data-reveal] are fully visible by default in the CSS.
 *   - This script arms the effect ONLY when it runs AND the user has not asked
 *     for reduced motion AND IntersectionObserver is supported. Arming means
 *     adding `.reveal-ready` to <html>, which is the ONLY thing that hides the
 *     elements and primes the fade-up transition.
 *   - An IntersectionObserver then adds `.is-revealed` as each element scrolls
 *     into view, animating it to its natural (visible) state.
 *
 * Net effect: no JS, old browser, or reduced-motion -> content stays visible;
 * the animation is a pure enhancement on top of a working page.
 */
(function () {
  'use strict';

  // Respect the user's motion preference — never arm the reveal if they've
  // asked for reduced motion.
  var reduce = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    reduce = false;
  }

  // Bail out (leaving everything visible) if the platform can't support a
  // clean, observer-driven reveal.
  if (reduce || typeof IntersectionObserver === 'undefined') {
    return;
  }

  function init() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) {
      return;
    }

    // Arm the effect: this class is what the CSS keys off of to hide + prime.
    document.documentElement.classList.add('reveal-ready');

    var observer = new IntersectionObserver(function (entries, obs) {
      // Reveal entries that just entered, with a slight stagger when several
      // come in on the same tick so a row of cards cascades rather than
      // snapping in all at once. The stagger is a transition-delay only
      // (transform/opacity still do the moving), so it never affects layout.
      var incoming = entries.filter(function (entry) {
        return entry.isIntersecting;
      });
      incoming.forEach(function (entry, i) {
        var delay = Math.min(i, 5) * 60; // cap the cascade so nothing lags far behind
        entry.target.style.transitionDelay = delay + 'ms';
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    });

    targets.forEach(function (el) {
      observer.observe(el);
    });

    // Safety net: if anything is already in view on load (or the observer
    // somehow never fires), reveal it on the next frame so nothing stays hidden.
    requestAnimationFrame(function () {
      targets.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < (window.innerHeight || 0)) {
          el.classList.add('is-revealed');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
