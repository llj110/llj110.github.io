"""Check content and generated Jekyll output. Run after jekyll build."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from collections import Counter
from bs4 import BeautifulSoup
import yaml

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"
errors = []
venues = yaml.safe_load((ROOT / "_data/venues.yml").read_text(encoding="utf-8"))
service = yaml.safe_load((ROOT / "_data/service.yml").read_text(encoding="utf-8"))
papers = []
for path in (ROOT / "_publications").rglob("*.md"):
    data = yaml.safe_load(path.read_text(encoding="utf-8").split("---", 2)[1])
    papers.append(data)
    if "Lijian Li" not in data["authors"]:
        errors.append(f"{path.name}: missing homepage owner's author credit")
    if not any(data.get("links", {}).values()):
        errors.append(f"{path.name}: no paper link")
    cover = data.get("cover")
    if cover and not (ROOT / cover).is_file():
        errors.append(f"{path.name}: missing figure {cover}")
for title, count in Counter(p["title"].casefold() for p in papers).items():
    if count > 1:
        errors.append(f"Duplicate paper: {title}")

soups = {}
for name in ("index.html", "publications.html", "404.html"):
    path = SITE / name
    if not path.is_file():
        errors.append(f"Missing generated page: {name}")
        continue
    text = path.read_text(encoding="utf-8")
    soup = soups[name] = BeautifulSoup(text, "html.parser")
    if "{{" in text or "{%" in text:
        errors.append(f"{name}: unresolved Liquid")
    ids = [tag["id"] for tag in soup.select("[id]")]
    if len(ids) != len(set(ids)):
        errors.append(f"{name}: duplicate IDs")
    canonical = soup.select_one('link[rel="canonical"]')
    if not canonical or not canonical["href"].startswith("https://llj110.github.io/"):
        errors.append(f"{name}: wrong canonical URL")
    for tag in soup.select("[src], link[href], a[href]"):
        link = tag.get("src") or tag.get("href")
        parsed = urlsplit(link)
        if parsed.scheme or parsed.netloc:
            continue
        target = SITE / unquote(parsed.path).lstrip("/") if parsed.path else path
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            errors.append(f"{name}: broken local link {link}")
            continue
        if parsed.fragment and target.suffix == ".html":
            target_soup = BeautifulSoup(target.read_text(encoding="utf-8"), "html.parser")
            if not target_soup.find(id=unquote(parsed.fragment)):
                errors.append(f"{name}: broken fragment {link}")
if "publications.html" in soups:
    rendered = soups["publications.html"].select(".publication")
    for paper in rendered:
        venue = paper.select_one(".publication-short").get_text().split()[0]
        badge = paper.select_one(".rank-badge")
        expected = venues.get(venue, {}).get("grade")
        if expected and (not badge or badge.get_text().strip() != f"CCF {expected}"):
            errors.append(f"Missing or wrong CCF grade: {venue}")
        if venue == "arXiv" and badge:
            errors.append("Preprint has a CCF badge")
    if len(rendered) != len(papers):
        errors.append("Publication archive count does not match source")
    if len(soups["publications.html"].select("#preprints .publication")) != sum(p["pub"] == "arXiv" for p in papers):
        errors.append("Preprints are not separated correctly")
if "index.html" in soups:
    soup = soups["index.html"]
    if len(soup.select(".publication")) != sum(bool(p.get("selected")) for p in papers):
        errors.append("Selected publication count does not match source")
    if len(soup.select("#service .service-group li")) != len(service):
        errors.append("Reviewer roles do not match confirmed service records")
    news = yaml.safe_load((ROOT / "_data/news.yml").read_text(encoding="utf-8"))
    if len(soup.select(".news-item")) != len(news):
        errors.append("News count does not match source")
    if "2026.09.24" not in soup.get_text():
        errors.append("NeurIPS notification date missing")
if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(papers)} papers, {sum(bool(p.get('selected')) for p in papers)} selected; pages, assets, links, metadata, News, CCF labels, and reviewer roles checked.")
