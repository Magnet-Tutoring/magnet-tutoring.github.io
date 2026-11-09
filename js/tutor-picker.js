/*
 * tutor-picker.js — progressive enhancement for the "Preferred tutor" <select>
 * on book.html.
 *
 * WHAT IT DOES
 * ------------
 * The select (#bf-tutor) already ships with a static "No preference" default
 * plus every tutor name as an <option>, so it works with NO JavaScript and if
 * this script or data/tutors.json fails to load. This script only ENHANCES it:
 *
 *   - Fetches data/tutors.json (each tutor has a subjects[] array).
 *   - When the Subject select (#bf-subject) changes, it moves tutors who teach
 *     that subject to the top of the list and shows a hint in #bf-tutor-hint
 *     (e.g. "Aarav Marfatia and Adhidev Nithyanandan teach Algebra 1").
 *   - The hint makes clear this is a PREFERENCE, not a guaranteed assignment.
 *
 * It never removes options or blocks a choice: a student can still pick any
 * tutor for any subject. If the fetch fails, the static options stay as-is and
 * no hint is shown — the field still submits normally.
 *
 * SECURITY: all tutor/subject text is set via textContent — never innerHTML.
 *
 * Loaded with `defer` on book.html. fetch() of local JSON only works over
 * http(s), not file://; on failure we silently keep the static list.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var tutorSelect = document.getElementById('bf-tutor');
    var subjectSelect = document.getElementById('bf-subject');
    var hint = document.getElementById('bf-tutor-hint');

    if (!tutorSelect || !subjectSelect) {
      return;
    }

    if (typeof fetch !== 'function') {
      return;
    }

    fetch('data/tutors.json').then(function (res) {
      if (!res.ok) {
        throw new Error('Request failed: ' + res.status);
      }
      return res.json();
    }).then(function (tutors) {
      if (!Array.isArray(tutors) || !tutors.length) {
        return;
      }

      // name -> subjects[] lookup for quick "does tutor teach X" checks.
      var subjectsByTutor = {};
      tutors.forEach(function (t) {
        if (t && t.name && Array.isArray(t.subjects)) {
          subjectsByTutor[t.name] = t.subjects;
        }
      });

      // Snapshot the original tutor <option>s (skip the "No preference" default,
      // which has an empty value) and remember their source order so we can
      // restore a stable ordering when no subject is chosen.
      var defaultOption = null;
      var tutorOptions = [];
      Array.prototype.slice.call(tutorSelect.options).forEach(function (opt) {
        if (opt.value === '') {
          defaultOption = opt;
        } else {
          tutorOptions.push(opt);
        }
      });

      function teaches(name, subject) {
        var subs = subjectsByTutor[name];
        return !!subs && subs.indexOf(subject) !== -1;
      }

      function setHint(text) {
        if (!hint) {
          return;
        }
        while (hint.firstChild) {
          hint.removeChild(hint.firstChild);
        }
        if (text) {
          hint.appendChild(document.createTextNode(text));
        }
      }

      // Rebuild the tutor option order: teachers of `subject` first (in source
      // order), then everyone else (in source order). Preserves the current
      // selection. Never drops an option.
      function reorder(subject) {
        var selectedValue = tutorSelect.value;

        var matching = [];
        var rest = [];
        tutorOptions.forEach(function (opt) {
          if (subject && teaches(opt.value, subject)) {
            matching.push(opt);
          } else {
            rest.push(opt);
          }
        });

        // Re-append in the new order. Appending an existing node moves it.
        if (defaultOption) {
          tutorSelect.appendChild(defaultOption);
        }
        matching.concat(rest).forEach(function (opt) {
          tutorSelect.appendChild(opt);
        });

        tutorSelect.value = selectedValue;

        // Build the hint text from the matching tutors.
        if (!subject) {
          setHint('');
          return;
        }
        var names = matching.map(function (opt) {
          return opt.value;
        });
        if (!names.length) {
          setHint('No listed tutor is tagged for ' + subject + ' yet. Pick "No preference" and we\'ll match you with the best fit.');
          return;
        }
        var list;
        if (names.length === 1) {
          list = names[0];
        } else if (names.length === 2) {
          list = names[0] + ' and ' + names[1];
        } else {
          list = names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
        }
        var verb = names.length === 1 ? ' teaches ' : ' teach ';
        setHint(list + verb + subject + '. This is a preference. The final tutor depends on availability.');
      }

      subjectSelect.addEventListener('change', function () {
        var subject = subjectSelect.value || '';
        reorder(subject);
      });

      // If a subject is already selected (e.g. browser restored the form), run
      // once so the order and hint reflect it.
      if (subjectSelect.value) {
        reorder(subjectSelect.value);
      }
    }).catch(function () {
      // Keep the static tutor list; no hint. The field still works.
    });
  });
})();
