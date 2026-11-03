/*
 * easter-egg.js — a hidden "catch the falling magnets" mini-game.
 *
 * Trigger: 5 quick clicks on the site logo (handled in layout.js, which calls
 * window.MagnetGame.launch()). Loaded with `defer`; it does nothing and renders
 * nothing until launched, so it has no effect on page performance or layout.
 *
 * Pure vanilla JS, no dependencies. Respects prefers-reduced-motion by using a
 * calmer fall speed. Fully keyboard-accessible (arrow keys + Escape to close),
 * and the game surface is dialog-role with a focus trap kept simple.
 */
(function () {
  'use strict';

  var active = false;

  function launch() {
    if (active) { return; }
    active = true;

    var reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    // ---- Overlay + dialog ----
    var overlay = document.createElement('div');
    overlay.className = 'eggame-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Hidden mini-game: catch the falling magnets');

    var panel = document.createElement('div');
    panel.className = 'eggame-panel';

    var header = document.createElement('div');
    header.className = 'eggame-header';

    var title = document.createElement('h2');
    title.className = 'eggame-title';
    title.textContent = 'Magnet Catch';

    var scoreEl = document.createElement('p');
    scoreEl.className = 'eggame-score';
    scoreEl.setAttribute('aria-live', 'polite');

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'eggame-close btn btn-secondary';
    closeBtn.textContent = 'Close';

    header.appendChild(title);
    header.appendChild(scoreEl);
    header.appendChild(closeBtn);

    var hint = document.createElement('p');
    hint.className = 'eggame-hint';
    hint.textContent = 'Move the basket with your mouse or the \u2190 \u2192 arrow keys. Catch the magnets, dodge nothing \u2014 just have fun! Press Esc to close.';

    var stage = document.createElement('div');
    stage.className = 'eggame-stage';
    stage.tabIndex = 0;

    var basket = document.createElement('div');
    basket.className = 'eggame-basket';
    basket.setAttribute('aria-hidden', 'true');
    basket.textContent = '\u{1F9FA}'; // basket emoji
    stage.appendChild(basket);

    panel.appendChild(header);
    panel.appendChild(hint);
    panel.appendChild(stage);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // ---- Game state ----
    var score = 0;
    var missed = 0;
    var running = true;
    var basketX = 0.5; // 0..1 fraction across the stage
    var items = [];    // {el, x, y, vy, caught}
    var spawnTimer = 0;
    var lastTs = 0;
    var ICONS = ['\u{1F9F2}', '\u{1F4D8}', '\u{1F4D0}', '\u2B50', '\u{1F9EE}']; // magnet, book, ruler, star, abacus

    function updateScore() {
      scoreEl.textContent = 'Score: ' + score + (missed ? '  \u00b7  Missed: ' + missed : '');
    }
    updateScore();

    function stageSize() {
      var r = stage.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }

    function placeBasket() {
      var s = stageSize();
      var bw = basket.offsetWidth || 48;
      var x = basketX * s.w - bw / 2;
      x = Math.max(0, Math.min(s.w - bw, x));
      basket.style.transform = 'translateX(' + x + 'px)';
    }

    function spawnItem() {
      var s = stageSize();
      var el = document.createElement('div');
      el.className = 'eggame-item';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = ICONS[Math.floor(Math.random() * ICONS.length)];
      stage.appendChild(el);
      var item = {
        el: el,
        x: Math.random() * 0.86 + 0.02, // fraction
        y: -0.05,
        vy: (reduce ? 0.14 : 0.28) + Math.random() * (reduce ? 0.06 : 0.16), // fraction/sec
        caught: false
      };
      el.style.left = (item.x * s.w) + 'px';
      items.push(item);
    }

    function tick(ts) {
      if (!running) { return; }
      if (!lastTs) { lastTs = ts; }
      var dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      var s = stageSize();
      spawnTimer += dt;
      var spawnEvery = reduce ? 1.1 : 0.75;
      if (spawnTimer >= spawnEvery) {
        spawnTimer = 0;
        spawnItem();
      }

      var bw = basket.offsetWidth || 48;
      var bx = basketX * s.w - bw / 2;
      bx = Math.max(0, Math.min(s.w - bw, bx));
      var basketLeft = bx;
      var basketRight = bx + bw;
      var basketTopY = 0.86; // fraction

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy * dt;
        it.el.style.top = (it.y * s.h) + 'px';

        if (!it.caught && it.y >= basketTopY && it.y <= 0.98) {
          var itemPx = it.x * s.w;
          if (itemPx >= basketLeft - 14 && itemPx <= basketRight + 14) {
            it.caught = true;
            score += 1;
            updateScore();
            it.el.classList.add('is-caught');
            (function (node) {
              setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 160);
            })(it.el);
            items.splice(i, 1);
            continue;
          }
        }
        if (it.y > 1.05) {
          if (!it.caught) { missed += 1; updateScore(); }
          if (it.el.parentNode) { it.el.parentNode.removeChild(it.el); }
          items.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(tick);
    }

    // ---- Input ----
    function onMouseMove(e) {
      var r = stage.getBoundingClientRect();
      basketX = (e.clientX - r.left) / r.width;
      basketX = Math.max(0, Math.min(1, basketX));
      placeBasket();
    }
    function onTouchMove(e) {
      if (!e.touches || !e.touches[0]) { return; }
      var r = stage.getBoundingClientRect();
      basketX = (e.touches[0].clientX - r.left) / r.width;
      basketX = Math.max(0, Math.min(1, basketX));
      placeBasket();
      e.preventDefault();
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { basketX = Math.max(0, basketX - 0.07); placeBasket(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { basketX = Math.min(1, basketX + 0.07); placeBasket(); e.preventDefault(); }
    }

    stage.addEventListener('mousemove', onMouseMove);
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });

    var raf = requestAnimationFrame(tick);

    // Place basket + focus after layout settles.
    setTimeout(function () { placeBasket(); stage.focus(); }, 0);

    function close() {
      if (!running) { return; }
      running = false;
      active = false;
      if (raf) { cancelAnimationFrame(raf); }
      stage.removeEventListener('mousemove', onMouseMove);
      stage.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }
  }

  window.MagnetGame = { launch: launch };
})();
