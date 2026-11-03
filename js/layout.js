/*
 * layout.js — injects the shared header (nav + dark-mode toggle) and footer.
 * Loaded with `defer`. No JSON / user data flows through this file.
 *
 * Shared contract with theme.js:
 *   - The dark-mode toggle button is CREATED here with id "theme-toggle".
 *   - theme.js finds it by that id (#theme-toggle) and wires the click behavior.
 *   Keep the id consistent between the two files.
 */
(function () {
  'use strict';

  // Nav links in required order.
  var NAV_LINKS = [
    { page: 'home', href: 'index.html', label: 'Home' },
    { page: 'about', href: 'about.html', label: 'About' },
    { page: 'subjects', href: 'subjects.html', label: 'Subjects' },
    { page: 'pricing', href: 'pricing.html', label: 'Pricing' },
    { page: 'tutors', href: 'tutors.html', label: 'Tutors' },
    { page: 'book', href: 'book.html', label: 'Book' },
    { page: 'reviews', href: 'reviews.html', label: 'Reviews' },
    { page: 'faq', href: 'faq.html', label: 'FAQ' },
    { page: 'account', href: 'account.html', label: 'Account' }
  ];

  var CLUB_EMAIL = 'tutoringmagnet@gmail.com';

  function buildHeader() {
    var currentPage = document.body.dataset.page || '';

    var header = document.createElement('div');
    header.className = 'site-header';

    var inner = document.createElement('div');
    inner.className = 'container header-inner';

    // Brand / home link (logo mark + wordmark)
    var brand = document.createElement('a');
    brand.className = 'brand';
    brand.href = 'index.html';

    var brandLogo = document.createElement('img');
    brandLogo.src = 'assets/logo.png';
    brandLogo.alt = '';            // decorative: the wordmark beside it names the site
    brandLogo.setAttribute('aria-hidden', 'true');
    brandLogo.setAttribute('fetchpriority', 'high');
    brandLogo.setAttribute('decoding', 'async');
    brandLogo.width = 40;
    brandLogo.height = 40;
    // Fade the logo in once it loads (opacity only — the 36x36 box is fixed in
    // CSS, so there is no layout shift). .img-fade starts transparent;
    // .is-loaded fades it in. If it's already cached/complete, mark immediately.
    brandLogo.className = 'brand-logo img-fade';
    var markLogoLoaded = function () {
      brandLogo.classList.add('is-loaded');
    };
    if (brandLogo.complete && brandLogo.naturalWidth > 0) {
      markLogoLoaded();
    } else {
      brandLogo.addEventListener('load', markLogoLoaded);
      // Safety: if the logo errors, still reveal the (empty) box so nothing
      // stays stuck invisible — the alt is empty/decorative anyway.
      brandLogo.addEventListener('error', markLogoLoaded);
    }

    var brandText = document.createElement('span');
    brandText.className = 'brand-text';
    brandText.textContent = 'Magnet Tutoring';

    brand.appendChild(brandLogo);
    brand.appendChild(brandText);

    // Hidden easter egg: 5 quick clicks on the logo launch a mini-game.
    // The logo is a link to home, so a click would normally navigate away before
    // a burst can be counted. We therefore cancel navigation on EVERY click and
    // count them: 5 within ~1.5s launches the game; otherwise, when the window
    // lapses, a normal click falls through to navigating home.
    var eggClicks = 0;
    var eggTimer = null;
    brand.addEventListener('click', function (e) {
      e.preventDefault(); // we control navigation ourselves below
      eggClicks += 1;

      if (eggClicks >= 5) {
        if (eggTimer) { clearTimeout(eggTimer); eggTimer = null; }
        eggClicks = 0;
        if (window.MagnetGame && typeof window.MagnetGame.launch === 'function') {
          window.MagnetGame.launch();
        }
        return;
      }

      // Restart the burst window. If no further clicks arrive in time, treat it
      // as an ordinary logo click and go home (single click still works).
      if (eggTimer) { clearTimeout(eggTimer); }
      eggTimer = setTimeout(function () {
        eggClicks = 0;
        eggTimer = null;
        window.location.href = brand.getAttribute('href') || 'index.html';
      }, 400);
    });

    // Nav wrapper
    var nav = document.createElement('nav');
    nav.className = 'nav';
    nav.setAttribute('aria-label', 'Primary');

    // Hamburger toggle (mobile)
    var navToggle = document.createElement('button');
    navToggle.type = 'button';
    navToggle.className = 'nav-toggle';
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-controls', 'primary-nav');
    navToggle.setAttribute('aria-label', 'Menu');
    navToggle.textContent = '\u2630'; // hamburger glyph

    // Nav list
    var list = document.createElement('ul');
    list.className = 'nav-list';
    list.id = 'primary-nav';

    NAV_LINKS.forEach(function (link) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.label;
      if (link.page === currentPage) {
        a.setAttribute('aria-current', 'page');
      }
      li.appendChild(a);
      list.appendChild(li);
    });

    // Dark-mode toggle button (wired by theme.js via #theme-toggle)
    var themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.id = 'theme-toggle';
    themeToggle.className = 'theme-toggle';

    nav.appendChild(navToggle);
    nav.appendChild(list);
    nav.appendChild(themeToggle);

    inner.appendChild(brand);
    inner.appendChild(nav);
    header.appendChild(inner);

    // Wire the hamburger: toggle the nav open/closed (click + keyboard).
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    return header;
  }

  function buildFooter() {
    var footer = document.createElement('div');
    footer.className = 'site-footer';

    // Prominent Sign Up call-to-action, present on every page via the footer.
    var ctaWrap = document.createElement('div');
    ctaWrap.className = 'container footer-cta';

    var ctaText = document.createElement('p');
    ctaText.textContent = 'Ready to get started? Book a session with one of our tutors.';

    var ctaBtn = document.createElement('a');
    ctaBtn.className = 'btn btn-primary';
    ctaBtn.href = 'book.html';
    ctaBtn.textContent = 'Book a Session';

    ctaWrap.appendChild(ctaText);
    ctaWrap.appendChild(ctaBtn);

    var inner = document.createElement('div');
    inner.className = 'container footer-inner';

    var copy = document.createElement('p');
    copy.style.margin = '0';
    copy.textContent = '\u00A9 Magnet Tutoring';

    var links = document.createElement('p');
    links.style.margin = '0';

    // Club email address.
    var email = document.createElement('a');
    email.href = 'mailto:' + CLUB_EMAIL;
    email.textContent = CLUB_EMAIL;

    var phone = document.createElement('a');
    phone.href = 'tel:+19293745741';
    phone.textContent = '(929) 374-5741';

    var book = document.createElement('a');
    book.href = 'book.html';
    book.textContent = 'Book a Session';

    links.appendChild(email);
    links.appendChild(document.createTextNode(' \u00B7 '));
    links.appendChild(phone);
    links.appendChild(document.createTextNode(' \u00B7 '));
    links.appendChild(book);

    inner.appendChild(copy);
    inner.appendChild(links);

    // Independence disclaimer: our tutors study in the Wheeler Magnet program,
    // but the business itself is independent and not affiliated with the school.
    var disclaimer = document.createElement('p');
    disclaimer.className = 'footer-disclaimer';
    disclaimer.textContent = 'Magnet Tutoring is an independent, student-run service. Our tutors are students in Wheeler\u2019s Magnet program, but Magnet Tutoring is not affiliated with, sponsored by, or endorsed by Wheeler High School or the Cobb County School District.';

    footer.appendChild(ctaWrap);
    footer.appendChild(inner);
    footer.appendChild(disclaimer);

    return footer;
  }

  function init() {
    var headerMount = document.getElementById('site-header');
    if (headerMount) {
      headerMount.appendChild(buildHeader());
    }
    var footerMount = document.getElementById('site-footer');
    if (footerMount) {
      footerMount.appendChild(buildFooter());
    }

    // Signal that layout is ready so theme.js can wire the toggle button.
    document.dispatchEvent(new CustomEvent('layout:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
