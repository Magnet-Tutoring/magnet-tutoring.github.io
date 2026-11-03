# Editing Guide — Magnet Tutoring

This is the plain-language guide to changing anything on the site. You don't need to
know how to code. Every change is just editing a file, then saving/committing it —
GitHub rebuilds the live site at **https://magnettutoring.com/** automatically within a
minute or two.

> **Tip:** The easiest way to edit is on GitHub itself. Open the repo, click the file you
> want, click the pencil ✏️ ("Edit this file"), make your change, and click
> "Commit changes." That's it.

---

## The stuff you'll change most often (no HTML needed)

These live in the `data/` folder and update the site automatically — you never touch page layout.

| What you want to change | File to edit | Notes |
|--------------------------|--------------|-------|
| **A tutor's bio** | `data/bios/<name>.txt` | Plain text. Leave a **blank line** between paragraphs. One file per tutor. |
| **A tutor's name, grade, subjects, achievements, or photo** | `data/tutors.json` | Keep the quotes and commas. `photo` is a filename in `assets/tutors/`. |
| **Subjects offered (and their topics)** | `data/subjects.json` | Each subject has a `name`, `category`, and `topics` list. |
| **Prices / the bundle** | `data/pricing.json` | Keep the structure; change the `price` / `length` values. |
| **Reviews / testimonials** | `data/reviews.json` | Add objects with `name`, `role`, `quote`, optional `rating`, `featured`. Empty list = "Reviews coming soon." |

### How to edit a tutor bio (most common request)
1. Open `data/bios/` and click the tutor's file, e.g. `data/bios/adam-ozon.txt`.
2. Edit the words. Put a blank line between paragraphs.
3. Commit. Done — their card updates on the next rebuild.

### How to add a review
Open `data/reviews.json` and add an entry inside the `[ ]`:
```json
{
  "name": "A. Parent",
  "role": "Parent of a 7th grader",
  "quote": "Our tutor was patient and kind.",
  "rating": 5,
  "featured": true
}
```
Separate multiple reviews with commas. **Only post real reviews with the person's permission.**

---

## Page wording (headings, paragraphs, buttons, FAQ answers)

This text lives directly in the page's `.html` file. Open the file, find the words, change
them, commit. Here's where each page's text is:

| Page | File | What's in it |
|------|------|--------------|
| Home | `index.html` | Hero tagline, trust badges, "How it works" steps, pricing teaser |
| About | `about.html` | Mission, how a session works, schedule, where we meet |
| Subjects | `subjects.html` | Intro, session expectations, cancellation note |
| Pricing | `pricing.html` | "How payment works," cancellation policy, bundle example |
| Tutors | `tutors.html` | Intro line (the tutor cards themselves come from `data/tutors.json`) |
| Book | `book.html` | Form labels, privacy note, bundle section |
| FAQ | `faq.html` | Every question and answer (each is a `<summary>` + `<p>`) |
| 404 | `404.html` | The "page not found" message |

The shared **header, footer, navigation, and the contact email** are built in
`js/layout.js` — edit `CLUB_EMAIL` there to change the email site-wide.

---

## Common specific edits

- **Change the contact email:** `js/layout.js` (the `CLUB_EMAIL` line). It also appears in
  `book.html` and `faq.html` — update all three.
- **Change the schedule (currently Saturdays 3–6 pm):** search the project for "Saturdays"
  (it's in `about.html` and `faq.html`).
- **Change the library address:** search for "Sandy Plains" (in `about.html`, `faq.html`,
  and the structured data in `index.html`).
- **Swap a tutor photo:** add a square WebP (under 200 KB) to `assets/tutors/`, then set that
  tutor's `photo` field in `data/tutors.json` to the new filename. If reusing a filename,
  rename it (e.g. `AS-v2.webp`) so browsers don't show the cached old photo.
- **Connect / change the booking form:** the Formspree form ID is in `book.html`
  (`action="https://formspree.io/f/..."`). Submissions go to the email on that Formspree form.
- **Change the logo:** replace `assets/logo.png` (header), `assets/favicon.png` (tab), and
  `assets/og-cover.png` (social share). Keep them optimized.

---

## Rules that keep the site fast and correct

- **Don't break JSON.** In `.json` files, keep the quotes, colons, commas, and brackets. If
  the site content disappears, you probably have a typo — a missing comma or quote. Paste the
  file into a JSON validator to find it.
- **Images:** use square WebP photos under 200 KB for tutors so the site stays fast.
- **Only true claims.** Tutor achievements, "top students," and any reviews must be truthful.
- **Minors:** keep the booking form's guardian fields and privacy note.

---

## Testing locally (optional)

The site uses `fetch()` for the data files, which fails if you just double-click an HTML file.
To preview locally, run a tiny server from the project folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in your browser.

---

## Still to confirm (not website code)

- The library permits paid tutoring on-site and being named publicly.
- Using the Wheeler Magnet program name is acceptable (the footer carries an
  "independent / not affiliated" disclaimer either way).

<!-- signing enabled 2026-11-02 -->
