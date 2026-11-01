# Magnet Tutoring

A static website for a student-run tutoring service — one-on-one and small-group tutoring
by top Wheeler Magnet students, held at the local library. It is built with plain HTML, CSS,
and vanilla JavaScript: **no framework, no bundler, and no build step.** The files in this
folder are exactly what gets served. You edit them, test locally, and deploy them as-is.

Pages: Home (`index.html`), About (`about.html`), Subjects (`subjects.html`),
Pricing (`pricing.html`), Tutors (`tutors.html`), Book (`book.html`),
Reviews (`reviews.html`), FAQ (`faq.html`), plus a `404.html`.

Shared header, footer, and navigation are injected by `js/layout.js`; the dark-mode toggle
lives in `js/theme.js`; subjects, tutors, reviews, and pricing are rendered from JSON by
`js/render.js`; scroll reveals live in `js/reveal.js`.

All links and asset references use **relative paths** (no leading `/`) so the site works
both at a domain root and under a GitHub Pages project subpath like `/REPO-NAME/`.

## Editing the content data

Day-to-day content lives in JSON files in `data/`. Edit them in any text editor and keep
the JSON valid (matching brackets, commas between items, double quotes around all keys and
string values). Data is always rendered as plain text, never as HTML.

### `data/subjects.json`

An array `[ ... ]` of subject objects.

| Field      | Type             | Notes                                                                        |
|------------|------------------|------------------------------------------------------------------------------|
| `name`     | string           | The subject name (e.g. `Algebra I & II`).                                    |
| `category` | string           | The grouping (e.g. `Math`, `Science`, `English`, `World Languages`, `Computer Science`). Drives the colored category icon. |
| `levels`   | array (optional) | Optional level strings (e.g. `["Honors", "AP"]`). Omit if none.              |
| `topics`   | array (optional) | Optional topic strings; when present, the Subjects page shows them in an expandable card. |

The Home page shows the first 6 subjects (`#subjects-preview`); the Subjects page shows all
of them (`#subjects-grid`) with a live search box (`#subject-search`).

### `data/tutors.json`

An array of tutor objects powering the Tutors page (`#tutors-grid`).

| Field          | Type   | Notes                                                                        |
|----------------|--------|------------------------------------------------------------------------------|
| `name`         | string | Full name. Also used as the photo's `alt` text.                              |
| `grade`        | string | The tutor's grade (e.g. `Grade 11`).                                         |
| `achievements` | string | Optional short line of achievements shown under the name.                    |
| `bio`          | string | Short bio (plain text).                                                       |
| `photo`        | string | Image **filename** inside `assets/tutors/` (e.g. `AM.webp`), not a full path. |

Photos live in `assets/tutors/`. Use a **square** image (current set is 800×800) saved as
**WebP** and kept **under 200 KB** each so the page stays fast. If a photo is missing, the
card falls back to an initials avatar derived from the name.

### `data/reviews.json`

An array of review objects powering the Reviews page (`#reviews-list`); the Home page also
shows a few static featured reviews.

| Field      | Type             | Notes                                                                 |
|------------|------------------|-----------------------------------------------------------------------|
| `quote`    | string           | The testimonial text.                                                 |
| `name`     | string           | Who said it (e.g. `Parent of a 9th grader`).                          |
| `role`     | string (optional)| Optional extra context line.                                          |
| `rating`   | number (optional)| 1–5; rendered as star characters.                                     |
| `featured` | boolean (optional)| Featured reviews sort first.                                         |
| `date`     | string (optional)| `YYYY-MM-DD`; newer sorts first within the same featured group.       |

### `data/pricing.json` (read this before editing prices)

This one file drives the three blocks on the Pricing page (`#pricing-blocks`). It is a
single **object** with three keys: `private`, `group`, and `bundle`.

- **`private`** and **`group`** each have a `label`, an optional `note`, and a `tiers` array.
  Each tier is `{ "label": "...", "price": "..." }` (for example, `1 hour` / `$20`). The
  `group` block's `note` (`"Price is per person."`) and its label (`Group (up to 4 students)`)
  are what communicate that group pricing is **per person, up to 4** — keep both accurate.

- **`bundle`** is deliberately **not** a number of hours of one thing. It is a **mixable
  credit**: worth 4 private hours *or* up to 8 group hours, where **1 private hour = 2 group
  hours**. It carries:
  - `price` — e.g. `$70`.
  - `description` — the full explanation of the credit and the 1-private = 2-group rule.
  - `examples` — an array of **worked examples** (e.g. `"2 private hours + 4 group hours"`).
    Always keep at least one worked example, and never describe the bundle as simply
    "4 hours" of anything — that loses the mix-and-match meaning.

Example shape:

```json
{
  "private": {
    "label": "Private (one-on-one)",
    "perPerson": true,
    "tiers": [
      { "label": "1 hour", "price": "$20" },
      { "label": "30 min", "price": "$10" }
    ]
  },
  "group": {
    "label": "Group (up to 4 students)",
    "perPerson": true,
    "note": "Price is per person.",
    "tiers": [
      { "label": "1 hour", "price": "$10" },
      { "label": "30 min", "price": "$5" }
    ]
  },
  "bundle": {
    "label": "Bundle",
    "price": "$70",
    "description": "A flexible credit worth 4 private hours or up to 8 group hours — 1 private hour equals 2 group hours, so you can mix and match.",
    "examples": [
      "4 private hours",
      "8 group hours",
      "2 private hours + 4 group hours"
    ]
  }
}
```

## Testing locally

The pages load their data with `fetch()` against the JSON files in `data/`. Browsers block
`fetch()` for pages opened directly from disk via a `file://` URL (it counts as a
cross-origin / opaque request), so **double-clicking `index.html` will leave the subjects,
tutors, reviews, and pricing empty and show console errors.** Serve the folder over HTTP
instead.

Start a simple local server from the project root:

```bash
# from the project root. On macOS use python3 (python may not exist).
cd "/path/to/Magnet Tutoring"
python3 -m http.server 8000
```

Then open <http://localhost:8000> and click through the pages. Stop the server with
`Ctrl+C`.

While testing, confirm: the shared header/footer appear, the active nav link is marked, the
dark-mode toggle flips and persists across reload and navigation, subjects/tutors/reviews/
pricing render from JSON, the subject search filters live, the subject cards and the FAQ
accordion expand, `book.html` loads **no** booking iframe until you click "Load booking", and
`404.html` links home. There should be zero console errors.

## How booking works

The Book page (`book.html`) uses **email-based booking** — no backend and no third-party
embed. Two forms are on the page:

1. **Request a session** — collects name, email, student/grade, subject, session type
   (private or group), length, and preferred times. On submit, JavaScript builds a
   prefilled `mailto:` message and opens the visitor's email app addressed to the club
   inbox. They just press send and it lands in your email.
2. **Buy the $70 bundle** — a separate form with its own prefilled email (subject line
   "Bundle purchase request"), so bundle requests stay distinct from session bookings.

The club email is set once as `CLUB_EMAIL` in the inline script at the bottom of
`book.html` (and in `js/layout.js` for the footer).

If you ever want direct submissions (no "press send" step, works without an email app, and
optionally logs to a spreadsheet), swap the `mailto` handler for a free form service like
Formspree or a Google Form.

## Deploying to GitHub Pages

Every link uses relative paths, so the site works even when served from a project subpath
like `/REPO-NAME/`.

1. Create a GitHub repository and push this folder to it.
2. In the repository, go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`**, then save.
5. Your site will be published at `https://USERNAME.github.io/REPO-NAME/`.

> This README only documents the process. It does not create a repository or deploy anything.

## Still to confirm before launch

Most founder details are now filled in (schedule, policies, payment, what to bring,
check-in, tutors, email). These items remain:

- **Library branch name & address** — `about.html` and `faq.html` note that sessions are in
  a study room at the library, but the exact branch is still marked
  `TODO(founders)`. Fill it in once the library confirms (search the source for
  `TODO(founders)`).
- **Library permission** — confirm the library allows operating/meeting on-site and being
  named on a public site before publishing the branch name.
- **Logo** — `assets/logo.svg` and `assets/favicon.svg` are placeholder magnet wordmarks.
  Swap in a real logo file when ready.
- **Reviews** — `data/reviews.json` is empty, so the Reviews page shows "Reviews coming
  soon." Add real testimonials (name, role, quote, optional rating, `featured` flag) when
  you have them.
- **Custom domain (optional)** — the site is live on the GitHub Pages URL. If you add a
  custom domain later, update the `<link rel="canonical">` on each page plus `sitemap.xml`
  and `robots.txt`.

### Already configured

- **Schedule** — Saturdays 3–6 pm (`about.html`, `faq.html`).
- **Payment** — offline, cash or Apple Pay (`pricing.html`, `faq.html`).
- **Cancellation** — cancel anytime, 24h notice appreciated, no charge for misses,
  gradual rescheduling (`pricing.html`, `subjects.html`, `faq.html`).
- **What to bring** — pencil + notebook, laptop for grades 5–12 (`about.html`).
- **Check-in** — text on arrival; up to 5 min late accommodated (`about.html`, `faq.html`).
- **Club email** — `wheelytutoringclub@gmail.com` (`js/layout.js`, `book.html`, `faq.html`).
- **Booking** — email-based forms (see "How booking works" above).
