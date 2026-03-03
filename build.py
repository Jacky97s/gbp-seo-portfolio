#!/usr/bin/env python3
"""Build script: reads data/projects.json + template.html, outputs index.html."""

import json, math, html as h

PROJECTS_FILE = "data/projects.json"
TEMPLATE_FILE = "template.html"
OUTPUT_FILE = "index.html"
PLACEHOLDER = "<!-- BUILD:PROJECTS -->"

def score_color(score):
    if score >= 80:
        return "#34A853"
    if score >= 60:
        return "#4285F4"
    if score >= 40:
        return "#F9AB00"
    return "#EA4335"


def score_ring_svg(score):
    r = 22
    circumference = 2 * math.pi * r
    offset = circumference - (score / 100) * circumference
    color = score_color(score)
    return (
        f'<div class="score-ring-wrapper">'
        f'<svg viewBox="0 0 56 56">'
        f'<circle class="score-ring-bg" cx="28" cy="28" r="{r}"/>'
        f'<circle class="score-ring-progress" cx="28" cy="28" r="{r}" stroke="{color}" '
        f'style="stroke-dasharray:{circumference:.1f};stroke-dashoffset:{offset:.1f}"/>'
        f'</svg>'
        f'<div class="score-ring-text" style="color:{color}">{score}</div>'
        f'</div>'
    )


def card_html(p):
    name = h.escape(p.get("name", ""))
    category = h.escape(p.get("category", ""))
    location = p.get("location", "")
    tags = p.get("tags", [])
    thumbnail = p.get("thumbnail", "")
    report_url = p.get("reportUrl", "")
    maps_url = p.get("mapsUrl", "")
    score = p.get("score", 0)

    if thumbnail:
        thumb = f'<img src="{h.escape(thumbnail)}" alt="{name}" style="width:100%;height:100%;object-fit:cover;">'
    else:
        thumb = (
            '<div class="card-thumb-placeholder">'
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">'
            '<rect x="3" y="3" width="18" height="18" rx="2"/>'
            '<circle cx="8.5" cy="8.5" r="1.5"/>'
            '<path d="M21 15l-5-5L5 21"/></svg>'
            '<span data-i18n="card.preview">報告預覽</span></div>'
        )

    actions = ""
    if report_url:
        actions += (
            f'<a href="{h.escape(report_url)}" target="_blank" class="btn btn-primary">'
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>'
            '<polyline points="14 2 14 8 20 8"/>'
            '<line x1="16" y1="13" x2="8" y2="13"/>'
            '<line x1="16" y1="17" x2="8" y2="17"/></svg>'
            '<span data-i18n="card.viewReport">查看報告</span></a>'
        )
    if maps_url:
        actions += (
            f'<a href="{h.escape(maps_url)}" target="_blank" rel="noopener" class="btn btn-outline">'
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            'stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>'
            '<circle cx="12" cy="10" r="3"/></svg>'
            'Maps</a>'
        )

    loc_html = ""
    if location:
        loc_html = (
            '<div class="card-location">'
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
            '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>'
            '<circle cx="12" cy="10" r="3"/></svg>'
            f'{h.escape(location)}</div>'
        )

    tags_html = "".join(f'<span class="tag">{h.escape(t)}</span>' for t in tags)

    return (
        f'<div class="project-card">'
        f'<div class="card-thumb">{thumb}</div>'
        f'<div class="card-body">'
        f'<div class="card-top">'
        f'<div class="card-info">'
        f'<div class="card-name">{name}</div>'
        f'<div class="card-category">{category}</div>'
        f'{loc_html}'
        f'</div>'
        f'{score_ring_svg(score)}'
        f'</div>'
        f'<div class="card-tags">{tags_html}</div>'
        f'<div class="card-actions">{actions}</div>'
        f'</div>'
        f'</div>'
    )


def build():
    with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
        projects = json.load(f)

    # Sort by score low → high
    projects.sort(key=lambda p: p.get("score", 0))

    count = len(projects)

    if projects:
        cards = "\n      ".join(card_html(p) for p in projects)
    else:
        cards = (
            '<div class="empty-state">'
            '<p data-i18n="empty.text">成為第一個獲得免費健檢報告的商家</p>'
            '<a href="#cta" class="btn btn-primary" style="margin-top:16px;" data-i18n="empty.cta">免費索取報告</a>'
            '</div>'
        )

    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    # Inject cards
    html = html.replace(PLACEHOLDER, cards)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Built: {count} projects")


if __name__ == "__main__":
    build()
