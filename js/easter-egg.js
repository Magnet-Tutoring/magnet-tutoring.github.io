/*
 * easter-egg.js — hidden mini-games launched by clicking the logo quickly.
 *
 * Triggers (wired in layout.js, which calls window.MagnetGame.launch(key)):
 *   5 quick clicks  -> 'slope'  — a Unity WebGL build in assets/slope/.
 *   10 quick clicks -> '2048'   — the MIT-licensed 2048 by Gabriele Cirulli,
 *                                 served from assets/2048/ inside an iframe.
 *
 * Both games load ONLY when launched — nothing is fetched on normal page load,
 * so they have no effect on the site's performance or Lighthouse scores until a
 * visitor deliberately opens one.
 *
 * Attribution:
 *   - Slope: WebGL build from https://github.com/catfoolyou/Slope (used with
 *     permission), original source https://github.com/cgolden15/Slope-Game.
 *     Ad/analytics scripts from the original page were removed.
 *   - 2048: https://github.com/gabrielecirulli/2048 by Gabriele Cirulli, MIT
 *     License. Credit shown on the game page and in the overlay.
 *
 * Esc or the Close button exits and tears the game down.
 */
(function () {
  'use strict';

  var active = false;

  // Shared overlay scaffold: returns { overlay, panel, stage, close, setClose }.
  function buildOverlay(label, titleText, hintText) {
    var overlay = document.createElement('div');
    overlay.className = 'eggame-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Hidden mini-game: ' + label);

    var panel = document.createElement('div');
    panel.className = 'eggame-panel';

    var header = document.createElement('div');
    header.className = 'eggame-header';

    var title = document.createElement('h2');
    title.className = 'eggame-title';
    title.textContent = titleText;

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'eggame-close btn btn-secondary';
    closeBtn.textContent = 'Close';

    header.appendChild(title);
    header.appendChild(closeBtn);

    var hint = document.createElement('p');
    hint.className = 'eggame-hint';
    hint.textContent = hintText;

    panel.appendChild(header);
    panel.appendChild(hint);
    overlay.appendChild(panel);

    var onKey, teardown;
    function close() {
      if (!active) { return; }
      active = false;
      if (onKey) { document.removeEventListener('keydown', onKey); }
      if (typeof teardown === 'function') { try { teardown(); } catch (e) { /* ignore */ } }
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }

    onKey = function (e) { if (e.key === 'Escape') { close(); } };
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });

    return {
      overlay: overlay,
      panel: panel,
      close: close,
      closeBtn: closeBtn,
      setTeardown: function (fn) { teardown = fn; }
    };
  }

  function creditLink(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  }

  // ---- Slope (5 clicks) --------------------------------------------------
  function launchSlope() {
    var ui = buildOverlay('Slope', 'Slope',
      'Use the \u2190 \u2192 arrow keys to steer the ball down the slope. It is a big download, so give it a moment to load. Press Esc to close.');

    var stage = document.createElement('div');
    stage.className = 'eggame-stage eggame-stage--slope';
    var gameContainer = document.createElement('div');
    gameContainer.id = 'gameContainer';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    stage.appendChild(gameContainer);

    var credit = document.createElement('p');
    credit.className = 'eggame-credit';
    credit.appendChild(document.createTextNode('Slope build by '));
    credit.appendChild(creditLink('https://github.com/catfoolyou/Slope', 'catfoolyou'));
    credit.appendChild(document.createTextNode(' (used with permission), original source '));
    credit.appendChild(creditLink('https://github.com/cgolden15/Slope-Game', 'cgolden15/Slope-Game'));
    credit.appendChild(document.createTextNode('.'));

    ui.panel.appendChild(stage);
    ui.panel.appendChild(credit);
    document.body.appendChild(ui.overlay);

    var gameInstance = null;
    function instantiate() {
      if (typeof window.UnityLoader === 'undefined') {
        gameContainer.textContent = 'Sorry, the game could not load.';
        return;
      }
      try {
        gameInstance = window.UnityLoader.instantiate('gameContainer', 'assets/slope/Build/slope.json');
      } catch (e) {
        gameContainer.textContent = 'Sorry, the game could not start.';
      }
    }
    if (typeof window.UnityLoader === 'undefined') {
      var loader = document.createElement('script');
      loader.src = 'assets/slope/TemplateData/unityloader41.js';
      loader.onload = instantiate;
      loader.onerror = function () { gameContainer.textContent = 'Sorry, the game could not load.'; };
      document.body.appendChild(loader);
    } else {
      instantiate();
    }

    ui.setTeardown(function () {
      try { if (gameInstance && typeof gameInstance.Quit === 'function') { gameInstance.Quit(); } } catch (e) {}
    });
    ui.closeBtn.focus();
  }

  // ---- 2048 (10 clicks) --------------------------------------------------
  function launch2048() {
    var ui = buildOverlay('2048', '2048',
      'Use your \u2190 \u2191 \u2192 \u2193 arrow keys to join the tiles and reach 2048. Press Esc to close.');

    var stage = document.createElement('div');
    stage.className = 'eggame-stage eggame-stage--2048';

    // The game runs fully self-contained in its own page, loaded in an iframe so
    // its CSS/JS never collide with the site. Same-origin, so no sandbox needed.
    var frame = document.createElement('iframe');
    frame.className = 'eggame-frame';
    frame.title = '2048 game';
    frame.setAttribute('loading', 'lazy');
    frame.src = 'assets/2048/index.html';
    stage.appendChild(frame);

    var credit = document.createElement('p');
    credit.className = 'eggame-credit';
    credit.appendChild(document.createTextNode('2048 by '));
    credit.appendChild(creditLink('https://github.com/gabrielecirulli/2048', 'Gabriele Cirulli'));
    credit.appendChild(document.createTextNode(', MIT License.'));

    ui.panel.appendChild(stage);
    ui.panel.appendChild(credit);
    document.body.appendChild(ui.overlay);
    ui.closeBtn.focus();
  }

  // ---- Snake -------------------------------------------------------------
  function launchSnake() {
    var ui = buildOverlay('Snake', 'Snake',
      'Use the arrow keys (or swipe on a phone) to steer the snake and eat the food. Press Esc to close.');

    var stage = document.createElement('div');
    stage.className = 'eggame-stage eggame-stage--snake';

    var frame = document.createElement('iframe');
    frame.className = 'eggame-frame';
    frame.title = 'Snake game';
    frame.setAttribute('loading', 'lazy');
    frame.src = 'assets/snake-game/snake/index.html';
    stage.appendChild(frame);

    var credit = document.createElement('p');
    credit.className = 'eggame-credit';
    credit.appendChild(document.createTextNode('Snake by '));
    credit.appendChild(creditLink('https://github.com/TomMalbran/games', 'Tom\u00e1s Malbr\u00e1n'));
    credit.appendChild(document.createTextNode(', MIT License.'));

    ui.panel.appendChild(stage);
    ui.panel.appendChild(credit);
    document.body.appendChild(ui.overlay);
    ui.closeBtn.focus();
  }

  function launch(key) {
    if (active) { return; }
    active = true;
    if (key === '2048') {
      launch2048();
    } else if (key === 'snake') {
      launchSnake();
    } else {
      launchSlope();
    }
  }

  // The Konami code opens this picker so either hidden game can be chosen.
  function launchPicker() {
    if (active) { return; }
    active = true;
    var ui = buildOverlay('Secret games', 'You found the secret games!',
      'Nice, you found the secret code. Pick a game to play. Press Esc to close.');

    var choices = document.createElement('div');
    choices.className = 'eggame-picker btn-row';

    var slopeBtn = document.createElement('button');
    slopeBtn.type = 'button';
    slopeBtn.className = 'btn btn-primary';
    slopeBtn.textContent = 'Play Slope';
    slopeBtn.addEventListener('click', function () {
      ui.close();         // tear down the picker
      active = false;     // allow the next game to open
      launch('slope');
    });

    var g2048Btn = document.createElement('button');
    g2048Btn.type = 'button';
    g2048Btn.className = 'btn btn-secondary';
    g2048Btn.textContent = 'Play 2048';
    g2048Btn.addEventListener('click', function () {
      ui.close();
      active = false;
      launch('2048');
    });

    var snakeBtn = document.createElement('button');
    snakeBtn.type = 'button';
    snakeBtn.className = 'btn btn-secondary';
    snakeBtn.textContent = 'Play Snake';
    snakeBtn.addEventListener('click', function () {
      ui.close();
      active = false;
      launch('snake');
    });

    choices.appendChild(slopeBtn);
    choices.appendChild(g2048Btn);
    choices.appendChild(snakeBtn);
    ui.panel.appendChild(choices);
    document.body.appendChild(ui.overlay);
    slopeBtn.focus();
  }

  // ---- Hidden trigger: ↑ ↑ ↓ ↓ ← ← → →  opens the secret-games picker.
  // Deliberate, not accidental. Ignores typing inside form fields so it never
  // fires while a visitor is filling out a form.
  function wireTriggers() {
    var konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                  'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight'];
    var pos = 0;

    function inFormField(t) {
      if (!t) { return false; }
      var tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    }

    // Advance the sequence by one direction ('ArrowUp' etc). A wrong step
    // resets (but still counts if it matches the first step). Fires the picker
    // on completion.
    function step(dir) {
      pos = (dir === konami[pos]) ? pos + 1 : (dir === konami[0] ? 1 : 0);
      if (pos === konami.length) {
        pos = 0;
        launchPicker();
      }
    }

    // Desktop: the arrow-key sequence.
    document.addEventListener('keydown', function (e) {
      if (inFormField(e.target)) { return; }
      if (e.key.indexOf('Arrow') !== 0) {
        // Any non-arrow key breaks the run (keeps it deliberate).
        pos = 0;
        return;
      }
      step(e.key);
    });

    // Mobile: the SAME sequence performed as swipes — up, up, down, down,
    // left, left, right, right. Each swipe maps to an arrow direction. We only
    // treat a touch as a swipe when it moves far enough and is clearly
    // horizontal or vertical, so normal scrolling/taps don't trigger it.
    var sx = 0, sy = 0, tracking = false;
    var SWIPE_MIN = 28; // px

    document.addEventListener('touchstart', function (e) {
      if (active) { return; } // a game is open
      if (inFormField(e.target)) { tracking = false; return; }
      if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
      tracking = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!tracking) { return; }
      tracking = false;
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) { return; }
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      var adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx < SWIPE_MIN && ady < SWIPE_MIN) { return; } // a tap, not a swipe
      var dir;
      if (ady >= adx) {
        dir = dy < 0 ? 'ArrowUp' : 'ArrowDown';
      } else {
        dir = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
      }
      step(dir);
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireTriggers);
  } else {
    wireTriggers();
  }

  window.MagnetGame = { launch: launch };
})();
