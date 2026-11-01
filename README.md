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

## Swapping in the real Google booking link

The Book page (`book.html`) uses a **facade**: no booking iframe loads on page load. A
"Load booking" button injects the Google booking `<iframe>` only when clicked, which keeps
the page fast. Until a real link exists, the card shows a labeled placeholder plus a `mailto`
fallback, and an "Open booking in a new tab" link is always present.

To connect a real Google appointment-booking link, edit **two spots** in `book.html`:

1. **The inline facade script near the bottom** — set `BOOKING_SRC` from `null` to the
   embeddable booking URL. While it stays `null`, the button just reveals the placeholder
   card instead of loading an empty iframe.
2. **The "Open booking in a new tab" link** — set the `href` on `#booking-new-tab` (currently
   a `TODO_FOUNDERS_BOOKING_LINK` placeholder) to the booking page's regular (non-embed) URL.

Optionally remove or update the placeholder text inside `#booking-card` once the real link is
live. Test in an incognito window to confirm an outside visitor can reach the booking tool.

## Deploying to GitHub Pages

Every link uses relative paths, so the site works even when served from a project subpath
like `/REPO-NAME/`.

1. Create a GitHub repository and push this folder to it.
2. In the repository, go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`**, then save.
5. Your site will be published at `https://USERNAME.github.io/REPO-NAME/`.

> This README only documents the process. It does not create a repository or deploy anything.

## TODO(founders) — fill these in before launch

Each item has a `TODO(founders)` marker in the source for easy searching:

- **Canonical domain** — every page's `<link rel="canonical">`, plus `sitemap.xml` and
  `robots.txt`, use the placeholder `https://magnettutoring.example/...`. Replace with the
  real GitHub Pages / custom domain.
- **Booking link** — `book.html` needs the real Google booking URL in `BOOKING_SRC` and the
  new-tab `href` (see the section above).
- **Where we meet** — `about.html` and `faq.html` have placeholders for the library branch,
  the meeting area inside the library, and the check-in process.
- **What to bring** — `about.html` has a placeholder for what students should bring.
- **Cancellation / no-show policy** — `pricing.html` and `faq.html` have placeholders.
- **Club email** — set to `hello@magnettutoring.example` in `js/layout.js` (`CLUB_EMAIL`),
  `book.html`, and `faq.html`. Update everywhere if it changes.
- **Tutor details and photos** — confirm each tutor's `grade`, `achievements`, and `bio` in
  `data/tutors.json`, and that the photos in `assets/tutors/` are final.
- **Reviews** — replace any placeholder reviews in `data/reviews.json` (and the static
  featured reviews on the Home page) with real testimonials when available.
