/*
 * render.js — ES module. Fetches and renders data/subjects.json,
 * data/tutors.json, data/reviews.json, and data/pricing.json.
 *
 * SECURITY RULE: data values are NEVER assigned via innerHTML. Every piece of
 * data-derived text is set with textContent on elements created in code.
 *
 * Container ids this module looks for on the current page (renders only the
 * ones that exist):
 *   #subjects-preview    -> first 6 subjects (home)
 *   #subjects-grid       -> all subjects (subjects); paired with #subject-search
 *   #subject-search      -> live case-insensitive substring filter on name
 *   #tutors-grid         -> all tutors (tutors.html)
 *   #reviews-list        -> all reviews (reviews.html)
 *   #pricing-blocks      -> pricing tiers + bundle (pricing.html)
 *
 * fetch() of local JSON only works over http(s), not file://.
 */

// ---- helpers -------------------------------------------------------------

function clear(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function showMessage(container, className, text) {
  clear(container);
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  container.appendChild(p);
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error('Request failed: ' + res.status);
  }
  return res.json();
}

// Fetch a plain-text file (used for per-tutor bio files in data/bios/).
async function loadText(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error('Request failed: ' + res.status);
  }
  return res.text();
}

// ---- subjects ------------------------------------------------------------

// Maps a category name to a decorative color+icon class. The class only drives
// a colored icon in CSS; the category text itself is still set via textContent.
// The mapping is a controlled normalization (lowercase, strip spaces/slashes)
// of the category string — never raw innerHTML — and unknown values fall back
// to 'cat-other' so a subject is never left unstyled / showing a plain dot.
function categoryClass(name) {
  switch (String(name).toLowerCase().replace(/[\s/]+/g, '')) {
    case 'math': return 'cat-math';
    case 'science': return 'cat-science';
    case 'english': return 'cat-english';
    case 'historysocialstudies': return 'cat-history';
    case 'worldlanguages': return 'cat-languages';
    case 'computerscience': return 'cat-cs';
    case 'other': return 'cat-other';
    default: return 'cat-other';
  }
}

// Build one subject card. When `expandable` is true (the schedule grid) and the
// subject carries a non-empty topics array, the card wraps its header in a
// native <details>/<summary> that reveals a topic list; otherwise it renders a
// plain card (the home preview, or any subject with no topics). All data text
// is set via textContent — never innerHTML.
function subjectCard(subject, expandable) {
  const card = document.createElement('article');
  card.className = 'card subject-card';

  const topics = Array.isArray(subject.topics) ? subject.topics : [];

  if (expandable && topics.length) {
    const details = document.createElement('details');
    details.className = 'subject-details';

    const summary = document.createElement('summary');
    summary.className = 'subject-summary';

    const heading = document.createElement('h3');
    heading.textContent = subject.name;
    summary.appendChild(heading);

    const category = document.createElement('span');
    category.className = 'subject-category';
    category.classList.add(categoryClass(subject.category));
    category.textContent = subject.category;
    summary.appendChild(category);

    // Decorative chevron affordance; hidden from assistive tech.
    const chevron = document.createElement('span');
    chevron.className = 'subject-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    summary.appendChild(chevron);

    details.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'subject-topics';
    topics.forEach(function (topic) {
      const item = document.createElement('li');
      item.textContent = topic;
      list.appendChild(item);
    });
    details.appendChild(list);

    card.appendChild(details);
    return card;
  }

  const heading = document.createElement('h3');
  heading.textContent = subject.name;
  card.appendChild(heading);

  const category = document.createElement('p');
  category.className = 'subject-category';
  category.classList.add(categoryClass(subject.category));
  category.textContent = subject.category;
  card.appendChild(category);

  if (Array.isArray(subject.levels) && subject.levels.length) {
    const badges = document.createElement('p');
    badges.className = 'badge-row';
    subject.levels.forEach(function (level) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = level;
      badges.appendChild(badge);
    });
    card.appendChild(badges);
  }

  return card;
}

function renderSubjects(container, subjects, expandable) {
  clear(container);
  if (!subjects.length) {
    showMessage(container, 'empty-state', 'No subjects match that search — try another word.');
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid grid-2 grid-3';
  subjects.forEach(function (subject) {
    grid.appendChild(subjectCard(subject, expandable));
  });
  container.appendChild(grid);
}

async function initSubjects() {
  const preview = document.getElementById('subjects-preview');
  const grid = document.getElementById('subjects-grid');
  const search = document.getElementById('subject-search');

  if (!preview && !grid) {
    return;
  }

  let subjects;
  try {
    subjects = await loadJSON('data/subjects.json');
  } catch (e) {
    if (preview) {
      showMessage(preview, 'error-state', 'We could not load the subject list right now — please refresh in a moment.');
    }
    if (grid) {
      showMessage(grid, 'error-state', 'We could not load the subject list right now — please refresh in a moment.');
    }
    return;
  }

  if (preview) {
    // Home preview stays a simple, non-expandable teaser (first 6).
    renderSubjects(preview, subjects.slice(0, 6), false);
  }

  if (grid) {
    const apply = function () {
      const term = search ? search.value.trim().toLowerCase() : '';
      const filtered = term
        ? subjects.filter(function (s) {
            return String(s.name).toLowerCase().indexOf(term) !== -1;
          })
        : subjects;
      // Schedule grid cards are expandable where topics exist.
      renderSubjects(grid, filtered, true);
    };
    apply();
    if (search) {
      search.addEventListener('input', apply);
    }
  }
}

// ---- tutors --------------------------------------------------------------

// Derive up-to-two-letter initials from a name for the photo fallback avatar.
function initialsFor(name) {
  var parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  var first = parts[0].charAt(0);
  var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

function tutorCard(tutor, categoryByName) {
  var card = document.createElement('article');
  card.className = 'card tutor-card';

  // Photo thumbnail with an initials-avatar fallback if the image is missing.
  var thumb = document.createElement('div');
  thumb.className = 'tutor-thumb';

  var avatar = document.createElement('span');
  avatar.className = 'tutor-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = initialsFor(tutor.name);

  if (tutor.photo) {
    var img = document.createElement('img');
    img.className = 'tutor-photo';
    img.setAttribute('src', 'assets/tutors/' + tutor.photo);
    img.setAttribute('alt', tutor.name);
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.setAttribute('width', '800');
    img.setAttribute('height', '800');
    // If the photo fails to load, drop it so the initials avatar shows through.
    img.addEventListener('error', function () {
      if (img.parentNode) {
        img.parentNode.removeChild(img);
      }
    });
    thumb.appendChild(avatar);
    thumb.appendChild(img);
  } else {
    thumb.appendChild(avatar);
  }
  card.appendChild(thumb);

  var name = document.createElement('h3');
  name.className = 'tutor-name';
  name.textContent = tutor.name;
  card.appendChild(name);

  if (tutor.grade) {
    var grade = document.createElement('p');
    grade.className = 'tutor-grade';
    grade.textContent = tutor.grade;
    card.appendChild(grade);
  }

  // Show achievements (where the subject badges used to be). Only render when
  // a non-empty string is present, so tutors without achievements stay clean.
  if (typeof tutor.achievements === 'string' && tutor.achievements.trim()) {
    var achWrap = document.createElement('p');
    achWrap.className = 'tutor-achievements';

    var achLabel = document.createElement('span');
    achLabel.className = 'tutor-achievements-label';
    achLabel.textContent = 'Achievements: ';
    achWrap.appendChild(achLabel);

    var achText = document.createTextNode(tutor.achievements);
    achWrap.appendChild(achText);

    card.appendChild(achWrap);
  }

  if (tutor.bio) {
    // Render the bio as one <p> per paragraph. Paragraphs are separated by a
    // blank line (two newlines), so the per-tutor .txt files stay easy to edit.
    var paragraphs = String(tutor.bio).split(/\n\s*\n/);
    paragraphs.forEach(function (para) {
      var text = para.replace(/\s+/g, ' ').trim();
      if (!text) {
        return;
      }
      var bio = document.createElement('p');
      bio.className = 'tutor-bio';
      bio.textContent = text;
      card.appendChild(bio);
    });
  }

  return card;
}

function renderTutors(container, tutors, categoryByName) {
  clear(container);
  if (!tutors.length) {
    showMessage(container, 'empty-state', 'No tutors listed yet — check back soon!');
    return;
  }
  var grid = document.createElement('div');
  grid.className = 'grid grid-2 grid-3';
  tutors.forEach(function (tutor) {
    grid.appendChild(tutorCard(tutor, categoryByName));
  });
  container.appendChild(grid);
}

async function initTutors() {
  const grid = document.getElementById('tutors-grid');

  if (!grid) {
    return;
  }

  let tutors;
  try {
    tutors = await loadJSON('data/tutors.json');
  } catch (e) {
    showMessage(grid, 'error-state', 'We could not load the tutor list right now — please refresh in a moment.');
    return;
  }

  // Build a subject-name -> category index so each badge can be color-keyed by
  // category. If subjects.json fails to load, badges still render (as
  // cat-other) rather than breaking the tutors grid.
  var categoryByName = {};
  try {
    var subjects = await loadJSON('data/subjects.json');
    if (Array.isArray(subjects)) {
      subjects.forEach(function (s) {
        if (s && s.name) {
          categoryByName[s.name] = s.category;
        }
      });
    }
  } catch (e) {
    categoryByName = {};
  }

  // Load each tutor's bio from its own editable .txt file (data/bios/*.txt)
  // when a bioFile is given. This lets each tutor edit a plain-text file
  // without touching tutors.json. If a file is missing or fails to load, we
  // keep the inline `bio` from tutors.json as a fallback. Fetched in parallel.
  if (Array.isArray(tutors)) {
    await Promise.all(tutors.map(async function (tutor) {
      if (tutor && tutor.bioFile) {
        try {
          var text = await loadText(tutor.bioFile);
          if (text && text.trim()) {
            tutor.bio = text;
          }
        } catch (e) {
          // Keep the inline bio fallback.
        }
      }
    }));
  }

  renderTutors(grid, tutors, categoryByName);
}

// ---- reviews -------------------------------------------------------------

// Sort featured testimonials first, then newest. `date` is optional; when it
// is absent the comparison falls back to leaving the original order stable.
function sortReviews(items) {
  return items.slice().sort(function (a, b) {
    const af = a.featured ? 1 : 0;
    const bf = b.featured ? 1 : 0;
    if (af !== bf) {
      return bf - af; // featured first
    }
    return String(b.date || '').localeCompare(String(a.date || '')); // newest first
  });
}

// Build one review card. Every value is set via textContent — never innerHTML.
function reviewCard(item) {
  const card = document.createElement('article');
  card.className = 'card review-card';

  const quote = document.createElement('blockquote');
  quote.className = 'review-quote';
  quote.textContent = item.quote;
  card.appendChild(quote);

  // Optional star rating, rendered as plain text (e.g. "★★★★★").
  if (typeof item.rating === 'number' && item.rating > 0) {
    const n = Math.max(0, Math.min(5, Math.round(item.rating)));
    const rating = document.createElement('p');
    rating.className = 'review-rating';
    rating.setAttribute('aria-label', n + ' out of 5 stars');
    rating.textContent = '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);
    card.appendChild(rating);
  }

  const name = document.createElement('p');
  name.className = 'review-name';
  name.textContent = item.name;
  card.appendChild(name);

  if (item.role) {
    const role = document.createElement('p');
    role.className = 'review-role';
    role.textContent = item.role;
    card.appendChild(role);
  }

  return card;
}

function renderReviews(container, items) {
  clear(container);
  if (!items.length) {
    showMessage(container, 'empty-state', 'Reviews coming soon.');
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid grid-2 grid-3';
  items.forEach(function (item) {
    grid.appendChild(reviewCard(item));
  });
  container.appendChild(grid);
}

async function initReviews() {
  const list = document.getElementById('reviews-list');

  if (!list) {
    return;
  }

  let reviews;
  try {
    reviews = await loadJSON('data/reviews.json');
  } catch (e) {
    showMessage(list, 'error-state', 'We could not load the reviews right now — please refresh in a moment.');
    return;
  }

  renderReviews(list, sortReviews(reviews));
}

// ---- pricing -------------------------------------------------------------

// Render one rate tier as a row of label + price. All text via textContent.
function pricingTierRow(tier) {
  const row = document.createElement('li');
  row.className = 'pricing-tier';

  const label = document.createElement('span');
  label.className = 'pricing-tier-label';
  label.textContent = tier.label;
  row.appendChild(label);

  const price = document.createElement('span');
  price.className = 'pricing-tier-price';
  price.textContent = tier.price;
  row.appendChild(price);

  return row;
}

// Build a card for a rate block (private / group): label, tiers, optional note.
function pricingBlockCard(block) {
  const card = document.createElement('article');
  card.className = 'card pricing-block';

  const heading = document.createElement('h3');
  heading.textContent = block.label;
  card.appendChild(heading);

  const tiers = Array.isArray(block.tiers) ? block.tiers : [];
  if (tiers.length) {
    const list = document.createElement('ul');
    list.className = 'pricing-tiers';
    tiers.forEach(function (tier) {
      list.appendChild(pricingTierRow(tier));
    });
    card.appendChild(list);
  }

  if (block.note) {
    const note = document.createElement('p');
    note.className = 'pricing-note';
    note.textContent = block.note;
    card.appendChild(note);
  }

  return card;
}

// Build the bundle card: label, price, description, and worked examples list.
function pricingBundleCard(bundle) {
  const card = document.createElement('article');
  card.className = 'card pricing-block pricing-bundle';

  const heading = document.createElement('h3');
  heading.textContent = bundle.label;
  card.appendChild(heading);

  if (bundle.price) {
    const price = document.createElement('p');
    price.className = 'pricing-bundle-price';
    price.textContent = bundle.price;
    card.appendChild(price);
  }

  if (bundle.description) {
    const desc = document.createElement('p');
    desc.className = 'pricing-bundle-desc';
    desc.textContent = bundle.description;
    card.appendChild(desc);
  }

  const examples = Array.isArray(bundle.examples) ? bundle.examples : [];
  if (examples.length) {
    const list = document.createElement('ul');
    list.className = 'pricing-examples';
    examples.forEach(function (example) {
      const item = document.createElement('li');
      item.textContent = example;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  return card;
}

function renderPricing(container, data) {
  clear(container);
  const grid = document.createElement('div');
  grid.className = 'grid grid-2 grid-3';

  if (data && data.private) {
    grid.appendChild(pricingBlockCard(data.private));
  }
  if (data && data.group) {
    grid.appendChild(pricingBlockCard(data.group));
  }
  if (data && data.bundle) {
    grid.appendChild(pricingBundleCard(data.bundle));
  }

  container.appendChild(grid);
}

async function initPricing() {
  const blocks = document.getElementById('pricing-blocks');

  if (!blocks) {
    return;
  }

  let pricing;
  try {
    pricing = await loadJSON('data/pricing.json');
  } catch (e) {
    showMessage(blocks, 'error-state', 'We could not load pricing right now — please refresh in a moment.');
    return;
  }

  renderPricing(blocks, pricing);
}

// ---- boot ----------------------------------------------------------------

function boot() {
  initSubjects();
  initTutors();
  initReviews();
  initPricing();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
