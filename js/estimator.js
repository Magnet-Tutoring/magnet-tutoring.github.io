/*
 * estimator.js — the free grade calculator on estimator.html. Four tools:
 *   1. Current grade from up to 10 weighted categories (blank row = 0% weight).
 *   2. Score needed on the final to reach a target grade.
 *   3. Maximum possible grade = C(1-w) + 100w (the real optimization result).
 *   4. Minimum score on remaining work to hold a target grade.
 *
 * Loaded with `defer`. Pure vanilla JS, no network, no dependencies — all
 * numbers stay in the browser. All output is written with textContent (never
 * innerHTML), so nothing a user types can inject markup.
 *
 * The math is plain weighted-average arithmetic (exactly what a gradebook uses).
 * The "maximum" is a genuine linear optimization: the final grade is strictly
 * increasing in your remaining score, so its max on [0,100] is at 100 — giving
 * C(1-w) + 100w. See the "math behind it" explainer on the page.
 */
(function () {
  'use strict';

  var CATEGORY_COUNT = 10;

  function $(id) { return document.getElementById(id); }

  // Parse a number field; returns null when blank/invalid.
  function num(el) {
    if (!el || el.value.trim() === '') { return null; }
    var n = Number(el.value);
    return isFinite(n) ? n : null;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function clear(el) {
    while (el && el.firstChild) { el.removeChild(el.firstChild); }
  }

  // Build one result line (lead sentence + optional pill) via textContent.
  function resultLead(container, text, pillText, pillClass) {
    clear(container);
    var p = document.createElement('p');
    p.className = 'estimator-lead';
    p.textContent = text;
    if (pillText) {
      p.appendChild(document.createTextNode(' '));
      var pill = document.createElement('span');
      pill.className = 'pill ' + (pillClass || 'pill-ok');
      pill.textContent = pillText;
      p.appendChild(pill);
    }
    container.appendChild(p);
    return p;
  }

  function addMsg(container, text, cls) {
    var p = document.createElement('p');
    p.className = 'estimator-msg' + (cls ? ' ' + cls : '');
    p.textContent = text;
    container.appendChild(p);
  }

  function letterGrade(g) {
    if (g >= 97) { return 'A+'; }
    if (g >= 93) { return 'A'; }
    if (g >= 90) { return 'A-'; }
    if (g >= 87) { return 'B+'; }
    if (g >= 83) { return 'B'; }
    if (g >= 80) { return 'B-'; }
    if (g >= 77) { return 'C+'; }
    if (g >= 73) { return 'C'; }
    if (g >= 70) { return 'C-'; }
    if (g >= 67) { return 'D+'; }
    if (g >= 63) { return 'D'; }
    if (g >= 60) { return 'D-'; }
    return 'F';
  }

  // ---- Tool 1: current grade from up to 10 weighted categories -----------

  var catRows = $('category-rows');

  function buildCategoryRow(index, name) {
    var id = index;

    var row = document.createElement('div');
    row.className = 'field estimator-cat-row';

    function field(labelText, cls, type, placeholder, extras) {
      var wrap = document.createElement('div');
      wrap.className = 'field';
      var label = document.createElement('label');
      var inputId = cls + '-' + id;
      label.setAttribute('for', inputId);
      label.textContent = labelText;
      var input = document.createElement('input');
      input.type = type;
      input.id = inputId;
      input.className = cls;
      input.placeholder = placeholder;
      if (type === 'number') {
        input.setAttribute('inputmode', 'decimal');
        input.step = '0.1';
        input.min = '0';
      }
      if (extras) { extras(input); }
      wrap.appendChild(label);
      wrap.appendChild(input);
      return { wrap: wrap, input: input };
    }

    var nameF = field('Category', 'cat-name', 'text', 'e.g. ' + (name || 'Category'));
    if (name) { nameF.input.value = name; }
    var weightF = field('Weight (%)', 'cat-weight', 'number', 'e.g. 40', function (i) { i.max = '100'; });
    var scoreF = field('Your average (%)', 'cat-score', 'number', 'e.g. 88', function (i) { i.max = '150'; });

    weightF.input.addEventListener('input', updateWeightNote);

    row.appendChild(nameF.wrap);
    row.appendChild(weightF.wrap);
    row.appendChild(scoreF.wrap);
    return row;
  }

  function readCategories() {
    var rows = catRows ? catRows.querySelectorAll('.estimator-cat-row') : [];
    var cats = [];
    for (var i = 0; i < rows.length; i++) {
      // Blank weight = 0% (ignored). Only count rows with a positive weight AND
      // a score entered.
      var w = num(rows[i].querySelector('.cat-weight'));
      var s = num(rows[i].querySelector('.cat-score'));
      if (w != null && w > 0 && s != null) {
        cats.push({ weight: w, score: s });
      }
    }
    return cats;
  }

  function updateWeightNote() {
    var note = $('current-weight-note');
    if (!note) { return; }
    var cats = readCategories();
    if (cats.length === 0) { note.textContent = ''; return; }
    var total = cats.reduce(function (sum, c) { return sum + c.weight; }, 0);
    var rounded = Math.round(total * 10) / 10;
    if (Math.abs(rounded - 100) < 0.05) {
      note.textContent = 'Weights add up to 100%.';
    } else {
      note.textContent = 'Weights add up to ' + rounded + '%. That\u2019s fine \u2014 ' +
        'blank rows count as 0%, and we scale the rest to compute your grade.';
    }
  }

  function calcCurrent(e) {
    e.preventDefault();
    var container = $('current-result');
    var cats = readCategories();
    if (cats.length === 0) {
      clear(container);
      addMsg(container, 'Fill in at least one row with a weight above 0 and your average score.');
      return;
    }
    var totalWeight = cats.reduce(function (s, c) { return s + c.weight; }, 0);
    var weighted = cats.reduce(function (s, c) { return s + c.weight * c.score; }, 0);
    var grade = weighted / totalWeight; // normalized so weights needn't sum to 100

    resultLead(container, 'Your current grade is about ' + round2(grade) + '%.');
    addMsg(container, 'Letter grade (typical US scale): ' + letterGrade(grade) + '.');
    addMsg(container, 'Based on ' + cats.length + ' categor' + (cats.length === 1 ? 'y' : 'ies') +
      ' totalling ' + (Math.round(totalWeight * 10) / 10) + '% weight' +
      (Math.abs(totalWeight - 100) > 0.05 ? ' (scaled to 100%).' : '.'));
  }

  // ---- Tool 2: score needed on the final ---------------------------------

  function highestPossible(current, w) {
    return round2(current * (1 - w) + 100 * w);
  }

  function calcNeeded(e) {
    e.preventDefault();
    var container = $('needed-result');
    var current = num($('cur-grade'));
    var target = num($('target-grade'));
    var weight = num($('final-weight'));

    clear(container);
    if (current == null || target == null || weight == null) {
      addMsg(container, 'Fill in your current grade, your target, and the final\u2019s weight.');
      return;
    }
    if (weight <= 0 || weight > 100) {
      addMsg(container, 'The final\u2019s weight should be between 0 and 100%.');
      return;
    }

    var w = weight / 100;
    var needed = (target - current * (1 - w)) / w;
    var roundedNeeded = round2(needed);

    if (needed <= 0) {
      resultLead(container,
        'You\u2019ve already secured it! Even a 0% on the final keeps you at or above ' +
        target + '%.', 'You\u2019re set', 'pill-ok');
    } else if (needed <= 100) {
      var pillClass = needed <= 70 ? 'pill-ok' : (needed <= 90 ? 'pill-push' : 'pill-hard');
      var pillText = needed <= 70 ? 'Very doable' : (needed <= 90 ? 'Reachable' : 'Tough but possible');
      resultLead(container,
        'You need about ' + roundedNeeded + '% on the final to finish with ' + target + '%.',
        pillText, pillClass);
    } else {
      resultLead(container,
        'Even a perfect 100% on the final would leave you below ' + target + '%. ' +
        'The highest you could reach is about ' + highestPossible(current, w) + '%.',
        'Out of reach', 'pill-hard');
      addMsg(container, 'Ask your teacher about extra credit \u2014 and we can help you lock down ' +
        'as many points as possible. Your first session is free.');
    }
  }

  // ---- Tool 3: maximum possible grade ------------------------------------

  function calcMax(e) {
    e.preventDefault();
    var container = $('max-result');
    var current = num($('max-current'));
    var remaining = num($('max-remaining'));

    clear(container);
    if (current == null || remaining == null) {
      addMsg(container, 'Fill in your current grade and the weight of your remaining work.');
      return;
    }
    if (remaining < 0 || remaining > 100) {
      addMsg(container, 'Remaining weight should be between 0 and 100%.');
      return;
    }
    var w = remaining / 100;
    var max = current * (1 - w) + 100 * w;
    var locked = current * (1 - w);

    resultLead(container, 'The highest you can still finish with is about ' + round2(max) + '% (' +
      letterGrade(max) + ').', 'Your ceiling', 'pill-ok');
    addMsg(container, 'That\u2019s ' + round2(locked) + '% already locked in from past work, plus up to ' +
      round2(100 * w) + '% from acing everything that\u2019s left.');
  }

  // ---- Tool 4: minimum to hold a target grade ----------------------------

  function calcMin(e) {
    e.preventDefault();
    var container = $('min-result');
    var current = num($('min-current'));
    var target = num($('min-target'));
    var remaining = num($('min-remaining'));

    clear(container);
    if (current == null || target == null || remaining == null) {
      addMsg(container, 'Fill in your current grade, the grade you need to keep, and the remaining weight.');
      return;
    }
    if (remaining <= 0 || remaining > 100) {
      addMsg(container, 'Remaining weight should be between 0 and 100%.');
      return;
    }
    var w = remaining / 100;
    // target = current*(1-w) + floor*w  ->  floor = (target - current*(1-w)) / w
    var floor = (target - current * (1 - w)) / w;

    if (floor <= 0) {
      resultLead(container,
        'You\u2019ve got full cushion \u2014 even a 0% on the rest keeps you at or above ' + target + '%.',
        'Lots of room', 'pill-ok');
    } else if (floor <= 100) {
      var pillClass = floor <= 60 ? 'pill-ok' : (floor <= 80 ? 'pill-push' : 'pill-hard');
      var pillText = floor <= 60 ? 'Comfortable' : (floor <= 80 ? 'Stay focused' : 'Little room to slip');
      resultLead(container,
        'You can score as low as about ' + round2(floor) + '% on the rest and still hold ' + target + '%.',
        pillText, pillClass);
    } else {
      resultLead(container,
        'Keeping ' + target + '% isn\u2019t possible from here \u2014 even a perfect 100% on the rest ' +
        'would finish at about ' + highestPossible(current, w) + '%.',
        'Out of reach', 'pill-hard');
      addMsg(container, 'Let\u2019s focus on the best grade you can still reach \u2014 we can help.');
    }
  }

  // ---- Init --------------------------------------------------------------

  function init() {
    if (catRows) {
      // 10 fixed rows; the first three are named for convenience, the rest blank.
      // A blank/zero-weight row simply counts as 0% and is ignored.
      var seeds = ['Tests', 'Homework', 'Quizzes'];
      for (var i = 1; i <= CATEGORY_COUNT; i++) {
        catRows.appendChild(buildCategoryRow(i, seeds[i - 1] || ''));
      }
    }
    var currentForm = $('current-form');
    if (currentForm) { currentForm.addEventListener('submit', calcCurrent); }
    var neededForm = $('needed-form');
    if (neededForm) { neededForm.addEventListener('submit', calcNeeded); }
    var maxForm = $('max-form');
    if (maxForm) { maxForm.addEventListener('submit', calcMax); }
    var minForm = $('min-form');
    if (minForm) { minForm.addEventListener('submit', calcMin); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
