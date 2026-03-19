#!/usr/bin/env python3
"""
Google Maps 評論收集器 — 供 gbp-seo-analyzer skill 呼叫
透過 SerpAPI 抓取 Google Maps 評論，突破 Places API 5 則上限。

用法:
  python3 scripts/scrape-reviews.py --place-id "ChIJ..." --sort newest --limit 50
  python3 scripts/scrape-reviews.py --place-id "ChIJ..." --sort all --limit 50

排序: relevant | newest | highest | lowest | all (全部四種各取 limit 筆)
輸出: JSON 到 stdout

環境變數:
  SERP_API_KEY — SerpAPI key (必要)
"""

import argparse
import json
import os
import sys
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path

SORT_OPTIONS = {
    "relevant": "qualityScore",
    "newest": "newestFirst",
    "highest": "ratingHigh",
    "lowest": "ratingLow",
}


def load_env():
    """Load .env from project root."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def fetch_reviews_page(place_id: str, sort_by: str, api_key: str, next_token: str = None) -> dict:
    """Fetch one page of reviews from SerpAPI.

    SerpAPI 限制：第一頁固定 8 則（不可帶 num），後續頁可帶 num=20（最大值）。
    """
    url = (
        f"https://serpapi.com/search.json?"
        f"engine=google_maps_reviews&place_id={place_id}"
        f"&sort_by={sort_by}&hl=zh-TW&api_key={api_key}"
    )
    if next_token:
        url += f"&next_page_token={next_token}&num=20"

    result = subprocess.run(
        ["curl", "-s", "-k", url],
        capture_output=True, text=True, timeout=30
    )
    return json.loads(result.stdout)


def collect_reviews(place_id: str, sort: str, limit: int, api_key: str) -> dict:
    """Collect reviews for one sort type, paginating as needed.

    Page sizes: page1=8, page2+=20. For limit=50: 8+20+20+2 = 4 calls.
    """
    serp_sort = SORT_OPTIONS[sort]
    reviews = []
    next_token = None
    pages = 0
    # page1=8, page2+=20 → (limit-8)/20 + 2 pages with buffer
    max_pages = max(2, ((limit - 8) // 20) + 3)

    while len(reviews) < limit and pages < max_pages:
        data = fetch_reviews_page(place_id, serp_sort, api_key, next_token)

        if "error" in data:
            return {"error": data["error"], "reviews": reviews}

        page_reviews = data.get("reviews", [])
        if not page_reviews:
            break

        reviews.extend(page_reviews)
        pages += 1

        pag = data.get("serpapi_pagination", {})
        next_token = pag.get("next_page_token")
        if not next_token:
            break

    # Trim to limit
    reviews = reviews[:limit]

    # Extract place info from first response
    place_info = data.get("place_info", {})

    return {
        "sort": sort,
        "place_info": {
            "title": place_info.get("title", ""),
            "rating": place_info.get("rating"),
            "total_reviews": place_info.get("reviews"),
            "address": place_info.get("address", ""),
        },
        "fetched_count": len(reviews),
        "pages_fetched": pages,
        "reviews": [normalize_review(r) for r in reviews],
    }


def normalize_review(r: dict) -> dict:
    """Normalize SerpAPI review to a clean format."""
    user = r.get("user", {})
    return {
        "author": user.get("name", ""),
        "rating": r.get("rating"),
        "date": r.get("date", ""),
        "iso_date": r.get("iso_date", ""),
        "text": r.get("snippet") or r.get("extracted_snippet", {}).get("original", ""),
        "response": r.get("response", {}).get("snippet") if r.get("response") else None,
        "response_date": r.get("response", {}).get("date") if r.get("response") else None,
        "is_local_guide": user.get("local_guide", False),
        "reviewer_reviews": user.get("reviews"),
        "reviewer_photos": user.get("photos"),
        "likes": r.get("likes", 0),
        "photo_count": len(r.get("images", [])),
    }


def compute_stats(all_reviews: list) -> dict:
    """Compute aggregate statistics from all collected reviews."""
    if not all_reviews:
        return {}

    ratings = [r["rating"] for r in all_reviews if r.get("rating")]
    dist = Counter(ratings)

    has_text = sum(1 for r in all_reviews if r.get("text"))
    has_response = sum(1 for r in all_reviews if r.get("response"))
    local_guides = sum(1 for r in all_reviews if r.get("is_local_guide"))
    has_photos = sum(1 for r in all_reviews if r.get("photo_count", 0) > 0)

    return {
        "total_collected": len(all_reviews),
        "avg_rating": round(sum(ratings) / len(ratings), 2) if ratings else None,
        "rating_distribution": {str(k): v for k, v in sorted(dist.items())},
        "with_text": has_text,
        "with_text_pct": round(has_text / len(all_reviews) * 100, 1),
        "with_response": has_response,
        "response_rate_pct": round(has_response / len(all_reviews) * 100, 1) if all_reviews else 0,
        "local_guides": local_guides,
        "local_guide_pct": round(local_guides / len(all_reviews) * 100, 1),
        "with_photos": has_photos,
    }


def main():
    parser = argparse.ArgumentParser(description="Collect Google Maps reviews via SerpAPI")
    parser.add_argument("--place-id", required=True, help="Google Place ID")
    parser.add_argument("--sort", choices=["relevant", "newest", "highest", "lowest", "all"], default="all")
    parser.add_argument("--limit", type=int, default=50, help="Max reviews per sort type (default: 50)")

    args = parser.parse_args()

    load_env()
    api_key = os.environ.get("SERP_API_KEY", "")
    if not api_key:
        print(json.dumps({"error": "SERP_API_KEY not found in .env or environment"}))
        sys.exit(1)

    sorts = list(SORT_OPTIONS.keys()) if args.sort == "all" else [args.sort]
    results = {}
    all_reviews = []

    for sort in sorts:
        data = collect_reviews(args.place_id, sort, args.limit, api_key)
        results[sort] = data
        all_reviews.extend(data.get("reviews", []))
        # Print progress to stderr
        print(f"  [{sort}] {data.get('fetched_count', 0)} reviews collected", file=sys.stderr)

    # Deduplicate by author + date
    seen = set()
    unique_reviews = []
    for r in all_reviews:
        key = (r["author"], r["date"])
        if key not in seen:
            seen.add(key)
            unique_reviews.append(r)

    output = {
        "meta": {
            "place_id": args.place_id,
            "sorts_requested": sorts,
            "limit_per_sort": args.limit,
            "scraped_at": datetime.now().isoformat(),
            "serp_api_pages_total": sum(r.get("pages_fetched", 0) for r in results.values()),
        },
        "place_info": next((r.get("place_info") for r in results.values() if r.get("place_info")), {}),
        "stats": compute_stats(unique_reviews),
        "by_sort": results,
        "all_unique_reviews": unique_reviews,
    }

    json.dump(output, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
