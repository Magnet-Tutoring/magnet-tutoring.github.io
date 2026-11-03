/*
 * easter-egg.js — a hidden mini-game: "Slope".
 *
 * Trigger: 5 quick clicks on the site logo (wired in layout.js, which calls
 * window.MagnetGame.launch()). The game is a Unity WebGL build located in
 * assets/slope/. It is LARGE (~14 MB), so it is loaded ONLY when launched —
 * nothing is fetched on normal page load, so the game has no effect on the
 * site's performance or Lighthouse scores until a visitor deliberately opens it.
 *
 * Attribution: the Slope WebGL build is from
 * https://github.com/catfoolyou/Slope (used with permission), which credits the
 * original source https://github.com/cgolden15/Slope-Game . All third-party ad
 * and analytics scripts that shipped in the original page were removed — only
 * the game itself is loaded here.
 *
 * Esc or the Close button exits and tears the game down.
 */
(function () {
  'use strict';

  var active = false;

  function launch() {
    if (active) { return; }
    active = true;

    // ---- Overlay + dialog ----
    var overlay = document.createElement('div');
    overlay.className = 'eggame-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Hidden mini-game: Slope');

    var panel = document.createElement('div');
    panel.className = 'eggame-panel';

    var header = document.createElement('div');
    header.className = 'eggame-header';

    var title = document.createElement('h2');
    title.className = 'eggame-title';
    title.textContent = 'Slope';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'eggame-close btn btn-secondary';
    closeBtn.textContent = 'Close';

    header.appendChild(title);
    header.appendChild(closeBtn);

    var hint = document.createElement('p');
    hint.className = 'eggame-hint';
    hint.textContent = 'Use the \u2190 \u2192 arrow keys to steer the ball down the slope. Big download \u2014 give it a moment to load. Press Esc to close.';

    // Unity renders into this container.
    var stage = document.createElement('div');
    stage.className = 'eggame-stage eggame-stage--slope';

    var gameContainer = document.createElement('div');
    gameContainer.id = 'gameContainer';
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    stage.appendChild(gameContainer);

    // Attribution line (always visible, honest credit).
    var credit = document.createElement('p');
    credit.className = 'eggame-credit';
    credit.appendChild(document.createTextNode('Slope game build by '));
    var a1 = document.createElement('a');
    a1.href = 'https://github.com/catfoolyou/Slope';
    a1.target = '_blank';
    a1.rel = 'noopener';
    a1.textContent = 'catfoolyou';
    credit.appendChild(a1);
    credit.appendChild(document.createTextNode(' (used with permission), original source '));
    var a2 = document.createElement('a');
    a2.href = 'https://github.com/cgolden15/Slope-Game';
    a2.target = '_blank';
    a2.rel = 'noopener';
    a2.textContent = 'cgolden15/Slope-Game';
    credit.appendChild(a2);
    credit.appendChild(document.createTextNode('.'));

    panel.appendChild(header);
    panel.appendChild(hint);
    panel.appendChild(stage);
    panel.appendChild(credit);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // ---- Load the Unity loader script on demand, then instantiate ----
    var gameInstance = null;

    function instantiate() {
      if (typeof window.UnityLoader === 'undefined') {
        gameContainer.textContent = 'Sorry — the game could not load.';
        return;
      }
      try {
        gameInstance = window.UnityLoader.instantiate(
          'gameContainer',
          'assets/slope/Build/slope.json'
        );
      } catch (e) {
        gameContainer.textContent = 'Sorry — the game could not start.';
      }
    }

    if (typeof window.UnityLoader === 'undefined') {
      var loader = document.createElement('script');
      loader.src = 'assets/slope/TemplateData/unityloader41.js';
      loader.onload = instantiate;
      loader.onerror = function () {
        gameContainer.textContent = 'Sorry — the game could not load.';
      };
      document.body.appendChild(loader);
    } else {
      instantiate();
    }

    // ---- Input / teardown ----
    function onKey(e) {
      if (e.key === 'Escape') { close(); }
    }
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });

    closeBtn.focus();

    function close() {
      if (!active) { return; }
      active = false;
      document.removeEventListener('keydown', onKey);
      // Best-effort teardown of the Unity instance to free memory.
      try {
        if (gameInstance && typeof gameInstance.Quit === 'function') {
          gameInstance.Quit();
        }
      } catch (e) { /* ignore */ }
      if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    }
  }

  window.MagnetGame = { launch: launch };
})();
