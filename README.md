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

## GitHub Pages

The public site is deployed from the `main` branch of the
`FengzhuoZhang/FengzhuoZhang.github.io` repository and is available at
<https://fengzhuozhang.github.io/>.

Cookie-free visitation statistics are collected by a dedicated Cloudflare Worker
and stored in D1. The password-protected reporting dashboard is available at
<https://fengzhuo-site-analytics.fengzhuozhang.workers.dev/analytics>.

The public pages load `visit-analytics.js`, which respects Global Privacy Control
and Do Not Track. The Worker stores a page path, date, coarse location, and a
daily secret-keyed visitor hash; it never stores raw IP addresses and deletes
detailed records after 180 days. Worker source and schema are in `cloudflare/`.
The three Worker secrets are configured in Cloudflare and are not committed.

## Content choices

- The phone number was intentionally removed from both the public HTML pages and the website-safe CV copy. The original uploaded CV was not modified.
- Publication titles, authors, venues, links, teaching records, talks, awards, and service entries were transcribed from the supplied CV.
- Research-theme descriptions summarize the topics represented by those publication titles; edit them to match your preferred research-statement language.
