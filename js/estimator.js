/*
 * estimator.js — the free grade calculator on estimator.html. Two tools:
 *   1. Current grade from weighted categories (Tests 40% @ 88%, etc.).
 *   2. Score needed on the final to reach a target grade.
 *
 * Loaded with `defer`. Pure vanilla JS, no network, no dependencies — all
 * numbers stay in the browser. All output is written with textContent (never
 * innerHTML), so nothing a user types can inject markup.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // Parse a number field; returns null when blank/invalid.
  function num(el) {
    if (!el || el.value.trim() === '') { return null; }
    var n = Number(el.value);
    return isFinite(n) ? n : null;
  }

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

  // ---- Tool 1: current grade from weighted categories --------------------

  var catRows = $('category-rows');
  var catSeq = 0;

  function addCategoryRow(name, weight, score) {
    if (!catRows) { return; }
    catSeq += 1;
    var id = catSeq;

    var row = document.createElement('div');
    row.className = 'field estimator-cat-row';

    // Name
    var nameWrap = document.createElement('div');
    nameWrap.className = 'field';
    var nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'cat-name-' + id);
    nameLabel.textContent = 'Category';
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'cat-name-' + id;
    nameInput.className = 'cat-name';
    nameInput.placeholder = 'e.g. Tests';
    if (name) { nameInput.value = name; }
    nameWrap.appendChild(nameLabel);
    nameWrap.appendChild(nameInput);

    // Weight
    var weightWrap = document.createElement('div');
    weightWrap.className = 'field';
    var weightLabel = document.createElement('label');
    weightLabel.setAttribute('for', 'cat-weight-' + id);
    weightLabel.textContent = 'Weight (%)';
    var weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.id = 'cat-weight-' + id;
    weightInput.className = 'cat-weight';
    weightInput.min = '0';
    weightInput.max = '100';
    weightInput.step = '0.1';
    weightInput.setAttribute('inputmode', 'decimal');
    weightInput.placeholder = 'e.g. 40';
    if (weight != null) { weightInput.value = weight; }
    weightWrap.appendChild(weightLabel);
    weightWrap.appendChild(weightInput);

    // Score
    var scoreWrap = document.createElement('div');
    scoreWrap.className = 'field';
    var scoreLabel = document.createElement('label');
    scoreLabel.setAttribute('for', 'cat-score-' + id);
    scoreLabel.textContent = 'Your average (%)';
    var scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.id = 'cat-score-' + id;
    scoreInput.className = 'cat-score';
    scoreInput.min = '0';
    scoreInput.max = '150';
    scoreInput.step = '0.1';
    scoreInput.setAttribute('inputmode', 'decimal');
    scoreInput.placeholder = 'e.g. 88';
    if (score != null) { scoreInput.value = score; }
    scoreWrap.appendChild(scoreLabel);
    scoreWrap.appendChild(scoreInput);

    // Remove button
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-secondary estimator-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('aria-label', 'Remove this category');
    removeBtn.addEventListener('click', function () {
      row.parentNode.removeChild(row);
      updateWeightNote();
    });

    row.appendChild(nameWrap);
    row.appendChild(weightWrap);
    row.appendChild(scoreWrap);
    row.appendChild(removeBtn);

    weightInput.addEventListener('input', updateWeightNote);
    catRows.appendChild(row);
    updateWeightNote();
  }

  function readCategories() {
    var rows = catRows ? catRows.querySelectorAll('.estimator-cat-row') : [];
    var cats = [];
    for (var i = 0; i < rows.length; i++) {
      var w = num(rows[i].querySelector('.cat-weight'));
      var s = num(rows[i].querySelector('.cat-score'));
      if (w != null && s != null && w > 0) {
        cats.push({ weight: w, score: s });
      }
    }
    return cats;
  }

  function updateWeightNote() {
    var note = $('current-weight-note');
    if (!note) { return; }
    var cats = readCategories();
    var total = cats.reduce(function (sum, c) { return sum + c.weight; }, 0);
    if (cats.length === 0) {
      note.textContent = '';
      return;
    }
    var rounded = Math.round(total * 10) / 10;
    if (Math.abs(rounded - 100) < 0.05) {
      note.textContent = 'Weights add up to 100%. ';
    } else {
      note.textContent = 'Weights add up to ' + rounded + '%. That\u2019s fine \u2014 ' +
        'we\u2019ll scale them to compute your grade.';
    }
  }

  function calcCurrent(e) {
    e.preventDefault();
    var container = $('current-result');
    var cats = readCategories();
    if (cats.length === 0) {
      clear(container);
      addMsg(container, 'Add at least one category with a weight and your average score.');
      return;
    }
    var totalWeight = cats.reduce(function (s, c) { return s + c.weight; }, 0);
    var weighted = cats.reduce(function (s, c) { return s + c.weight * c.score; }, 0);
    var grade = weighted / totalWeight; // normalized so weights needn't sum to 100
    var rounded = Math.round(grade * 100) / 100;

    resultLead(container, 'Your current grade is about ' + rounded + '%.');
    addMsg(container, 'Letter grade (typical US scale): ' + letterGrade(grade) + '.');
    if (Math.abs(totalWeight - 100) > 0.05) {
      addMsg(container, 'Note: your weights added up to ' + (Math.round(totalWeight * 10) / 10) +
        '%, so this is scaled to a 100% total.');
    }
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

  // ---- Tool 2: score needed on the final ---------------------------------

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
    // target = current*(1-w) + needed*w  ->  needed = (target - current*(1-w)) / w
    var needed = (target - current * (1 - w)) / w;
    var roundedNeeded = Math.round(needed * 100) / 100;

    if (needed <= 0) {
      resultLead(container,
        'You\u2019ve already secured your goal! Even a 0% on the final keeps you at or above ' +
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
      addMsg(container, 'Consider talking to your teacher about extra credit \u2014 and we can ' +
        'help you lock down as many points as possible. Your first session is free.');
    }
  }

  function highestPossible(current, w) {
    return Math.round((current * (1 - w) + 100 * w) * 100) / 100;
  }

  // ---- Init --------------------------------------------------------------

  function init() {
    if (catRows) {
      // Seed with three common categories so the tool is usable immediately.
      addCategoryRow('Tests', '', '');
      addCategoryRow('Homework', '', '');
      addCategoryRow('Quizzes', '', '');
    }
    var addBtn = $('add-category');
    if (addBtn) {
      addBtn.addEventListener('click', function () { addCategoryRow('', '', ''); });
    }
    var currentForm = $('current-form');
    if (currentForm) { currentForm.addEventListener('submit', calcCurrent); }
    var neededForm = $('needed-form');
    if (neededForm) { neededForm.addEventListener('submit', calcNeeded); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
