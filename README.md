# Fengzhuo Zhang — Academic Website

This is a dependency-free static academic website for Fengzhuo Zhang. It uses a responsive editorial layout and can be hosted on GitHub Pages or any ordinary static web server.

## Included files

- `index.html` — biography, selected publications, news, and education
- `research.html` — research themes and representative papers
- `publications.html` — full publication list from the CV
- `teaching.html` — teaching experience and external talks
- `service.html` — academic service and honors
- `style.css` — responsive site styling
- `photo.pic.jpg` — profile portrait
- `assets/og-card.png` — social sharing preview image
- `.nojekyll` — direct GitHub Pages serving

## Preview locally

From this directory, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Add a CV

The site intentionally omits a CV link because no CV PDF is currently present in this folder. To add one, place the public PDF in `files/Fengzhuo_Zhang_CV.pdf`, then add a CV link to the navigation or homepage quick links.

## Add professional profile links

The CV did not list Google Scholar, GitHub, LinkedIn, ORCID, or a personal-domain URL, so the generated site does not invent them. Add verified links to the `quick-links` block in `index.html` when available.

Example:

```html
<a href="YOUR_GOOGLE_SCHOLAR_URL">Google Scholar</a>
<a href="YOUR_GITHUB_URL">GitHub</a>
```

## Publish with GitHub Pages

1. Create a repository named `<username>.github.io`.
2. Copy the contents of this folder into the repository root.
3. Commit and push to the `main` branch.
4. In GitHub, open **Settings → Pages**.
5. Select **Deploy from a branch**, `main`, and `/(root)`.

## Content choices

- The phone number was intentionally removed from both the public HTML pages and the website-safe CV copy. The original uploaded CV was not modified.
- Publication titles, authors, venues, links, teaching records, talks, awards, and service entries were transcribed from the supplied CV.
- Research-theme descriptions summarize the topics represented by those publication titles; edit them to match your preferred research-statement language.
