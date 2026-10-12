# Lijian Li — academic homepage

A responsive Jekyll homepage for https://llj110.github.io/, with English / Chinese navigation, a News timeline, academic service, CCF labels, selected papers, and a searchable publication archive.

## Update content

- `_data/profile.yml`: contact information, portrait, and profile data.
- `index.html`: bilingual introduction and education / experience.
- `_data/news.yml`: newest updates first. Each item has a date, venue, complete paper title, bilingual wording, and a paper link.
- `_publications/<year>/*.md`: paper metadata, ordered authors, links, a one-sentence summary, and an optional overview figure. Set `selected: true` to show a paper on the homepage.
- `_data/service.yml`: confirmed reviewer roles; optional `years` only when verified. Keep invitations without acceptance separate from actual reviewer service.
- `_data/venues.yml`: venue names, official links, CCF classifications, and CCF source links.
- `assets/css/global.css`: page layout, colors, and responsive styles.

Use exact acceptance dates only when confirmed. A year-only News date is intentional when the acceptance month is unknown. Conference/publication dates are not automatically acceptance dates. The collection `date` field controls sorting; `pub_date` is the visible publication year. Keep preprints under `pub: arXiv` until publication is confirmed. Do not create a second entry for a preprint when the same paper is published.

## Preview and checks

With Ruby and Bundler installed:

```sh
bundle install
bundle exec jekyll serve
```

Then open http://127.0.0.1:4000/. For a production build:

```sh
bundle exec jekyll build
python scripts/check_site.py
```

The check script needs Python, Beautiful Soup, and PyYAML (`pip install beautifulsoup4 pyyaml`). It verifies paper membership and uniqueness, generated page counts, local assets, internal links, metadata, and unresolved Liquid templates.

The homepage works without JavaScript; language switching and publication search are progressive enhancements. Styles, scripts, fonts, and images load locally.

## Publish

Push the reviewed commit to the GitHub Pages publishing branch (currently `master`) of `llj110/llj110.github.io`. This site uses standard Jekyll without custom plugins. Keep `_config.yml` pointed at the public homepage. The stale template `CNAME` has been removed because it named somebody else's domain.

See [CONTENT_SOURCES.md](CONTENT_SOURCES.md) for research metadata and date provenance. The original template license is retained in `LICENSE`.
