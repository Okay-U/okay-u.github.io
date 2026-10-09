#!/usr/bin/env python3
"""Build cards.json for Riftcount from Riot's official Riftbound card gallery.

The gallery at playriftbound.com is a Next.js page that ships the whole card
list in its `__NEXT_DATA__` script tag. This script pulls it and writes the
cards in the same shape the app already decodes (the riftcodex `CardPage`
layout: name, riftbound_id, attributes, classification, text, set, media,
tags, orientation, metadata), so swapping the source needs no model change.

Standard library only. Usage: tools/build-cards.py [--locale en-us] [--out cards.json]

Not affiliated with Riot Games. Card data and images are Riot's, used under the
Riftbound Digital Tools Policy.
"""
import argparse
import html
import json
import re
import sys
import urllib.request
from datetime import datetime, timezone

GALLERY = "https://playriftbound.com/{locale}/card-gallery/"
# Riot's gallery has no flavour text; DotGG transcribes it. Best effort: a
# failed fetch keeps whatever flavour the previous cards.json carried.
FLAVOUR = "https://api.dotgg.gg/cgfw/getcards?game=riftbound&mode=indexed"
USER_AGENT = "Riftcount card feed (https://okay-u.github.io)"
MIN_CARDS = 1000  # fewer than this means the page changed; keep the old file

SET_ORDER = ["OGN", "OGS", "SFD", "UNL", "VEN", "RAD"]
# Riot previews a set's cards weeks before release; the policy wants them
# labelled until then. A set missing here counts as unreleased.
RELEASE_DATES = {"OGN": "2025-10-31", "OGS": "2025-10-31", "SFD": "2026-02-13",
                 "UNL": "2026-05-08", "VEN": "2026-07-31", "RAD": "2026-10-23"}

TOKENS = {
    "might": "Might", "exhaust": "Exhaust", "rune_rainbow": "Any Rune",
    "rune_fury": "Fury Rune", "rune_calm": "Calm Rune", "rune_mind": "Mind Rune",
    "rune_body": "Body Rune", "rune_order": "Order Rune", "rune_chaos": "Chaos Rune",
}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8")


def next_data(page):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', page, re.S)
    if not m:
        sys.exit("no __NEXT_DATA__ in gallery page")
    return json.loads(m.group(1))


def find_cards(node):
    """First list whose entries carry a publicCode, wherever Riot put it."""
    if isinstance(node, list):
        if node and isinstance(node[0], dict) and "publicCode" in node[0]:
            return node
        for v in node:
            r = find_cards(v)
            if r:
                return r
    elif isinstance(node, dict):
        for v in node.values():
            r = find_cards(v)
            if r:
                return r
    return None


def token_text(match):
    key = match.group(1)
    if key.startswith("energy_"):
        return key.split("_", 1)[1] + " Energy"
    return TOKENS.get(key, key)


def plain_text(rich):
    t = re.sub(r"<br\s*/?>", "\n", rich)
    t = re.sub(r"</p>\s*<p>", "\n", t)
    t = re.sub(r"<li>", "\n• ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    t = re.sub(r":(?=:rb_)", ": + ", t.replace("::rb_", ": + :rb_"))  # adjacent symbols
    t = re.sub(r":rb_([a-z0-9_]+):", token_text, t)
    return re.sub(r"\n{2,}", "\n", t).strip()


def rich_text(card):
    parts = [card[k]["richText"]["body"] for k in ("text", "effect") if k in card]
    return "".join(parts) or None


def value_id(card, key):
    v = card.get(key, {}).get("value", {}).get("id")
    return int(v) if isinstance(v, (int, str)) and str(v).lstrip("-+").isdigit() else None


def convert(card, now):
    rid = card["id"]                           # e.g. ogn-205a-298, sfd-235-star-221
    code = card["publicCode"]                  # e.g. OGN-205a/298, SFD-235*/221, VEN-R04
    printed_total = int(code.split("/")[1].rstrip("*")) if "/" in code else None
    collector = card.get("collectorNumber")
    middle = rid.split("-", 1)[1].rsplit("-", 1)[0] if rid.count("-") >= 2 else ""
    signature = middle.endswith("-star") or "*" in code
    alt_art = bool(re.search(r"\d[a-z]$", middle))
    overnumbered = (printed_total is not None and isinstance(collector, int)
                    and collector > printed_total and not alt_art and not signature)

    types = [t["label"] for t in card["cardType"].get("type", [])]
    supers = [t["label"] for t in card["cardType"].get("superType", [])]
    tags = card.get("tags", {}).get("tags") or []

    # Riftcodex-style display name: "Champion - Subtitle (Variant)". Riot names a
    # legend by its subtitle only and keeps the champion in the last tag.
    name = card["name"]
    if card.get("subtitle"):
        name += " - " + card["subtitle"]
    elif types == ["Legend"] and tags:
        name = tags[-1] + " - " + name
    for flag, suffix in ((alt_art, "Alternate Art"), (signature, "Signature"), (overnumbered, "Overnumbered")):
        if flag:
            name += " (" + suffix + ")"
            break
    clean = re.sub(r"[^A-Za-z0-9 ]+", "", name.replace(" - ", " "))
    clean = re.sub(r"\s+", " ", clean).strip()

    rich = rich_text(card)
    image = card.get("cardImage", {})
    riftbound_id = rid.replace("-star-", "*-")  # riftcodex spelling, so old ids map 1:1

    return {
        "id": rid,
        "name": name,
        "riftbound_id": riftbound_id,
        "public_code": code,
        "collector_number": collector,
        "attributes": {
            "energy": value_id(card, "energy"),
            "might": value_id(card, "might"),
            "power": value_id(card, "power"),
            "might_bonus": value_id(card, "mightBonus"),
        },
        "classification": {
            "type": types[0] if types else None,
            "supertype": supers[0] if supers else None,
            "rarity": card["rarity"]["value"]["label"],
            "domain": [v["label"] for v in card["domain"].get("values", [])],
        },
        "text": {"rich": rich, "plain": plain_text(rich) if rich else None, "flavour": None},
        "set": {"set_id": card["set"]["value"]["id"], "label": card["set"]["value"]["label"]},
        "media": {
            "image_url": image.get("url"),
            "artist": ", ".join(v["label"] for v in card.get("illustrator", {}).get("values", [])) or None,
            "accessibility_text": image.get("accessibilityText"),
        },
        "tags": tags or None,
        "orientation": card.get("orientation"),
        "metadata": {
            "clean_name": clean,
            "updated_on": now,
            "alternate_art": alt_art,
            "overnumbered": overnumbered,
            "signature": signature,
        },
        "new": any(f.get("id") == "new" for f in card.get("flags", [])),
        "unreleased": RELEASE_DATES.get(card["set"]["value"]["id"], "9999") > now[:10],
    }


def base_code(code):
    """'OGN-205a/298', 'SFD-235*/221', 'RAD-038-P2' -> 'OGN-205', 'SFD-235', 'RAD-038'."""
    m = re.match(r"([A-Z]+)-(\d+)", code)
    return m.group(1) + "-" + m.group(2) if m else None


def fetch_flavour():
    try:
        doc = json.loads(fetch(FLAVOUR))
        names = doc["names"]
        rows = (dict(zip(names, r)) for r in doc["data"])
    except Exception as e:  # noqa: BLE001 - any failure just keeps the old text
        print("flavour source unavailable: %s" % e, file=sys.stderr)
        return None
    out = {}
    for r in rows:
        key = base_code(r.get("id") or "")
        text = html.unescape(re.sub(r"<[^>]+>", "", r.get("flavor") or "")).strip()
        if key and text and key not in out:   # first row = base printing, promos follow
            out[key] = text
    return out


def sort_key(c):
    set_id = c["set"]["set_id"]
    rank = SET_ORDER.index(set_id) if set_id in SET_ORDER else len(SET_ORDER)
    return (rank, set_id, c["collector_number"] or 0, c["id"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--locale", default="en-us")
    ap.add_argument("--out", default="cards.json")
    args = ap.parse_args()

    raw = find_cards(next_data(fetch(GALLERY.format(locale=args.locale))))
    if not raw or len(raw) < MIN_CARDS:
        sys.exit("gallery returned %s cards, expected at least %d" % (len(raw or []), MIN_CARDS))

    # Riot's data has shipped the same row twice (UNL-089, 2026-10); identical
    # copies collapse, differing ones are a real problem.
    by_id = {}
    for c in raw:
        if by_id.setdefault(c["id"], c) != c:
            sys.exit("conflicting rows for id %s" % c["id"])

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cards = sorted((convert(c, now) for c in by_id.values()), key=sort_key)

    # Keep updated_on stable when nothing about a card changed, so the daily
    # run only produces a commit when Riot actually published something.
    try:
        with open(args.out) as f:
            previous = {c["id"]: c for c in json.load(f)["items"]}
    except (OSError, ValueError, KeyError):
        previous = {}
    flavour = fetch_flavour()
    for c in cards:
        old = previous.get(c["id"])
        if flavour is not None:
            c["text"]["flavour"] = flavour.get(base_code(c["public_code"]))
        elif old:
            c["text"]["flavour"] = old["text"].get("flavour")
        if old:
            probe = dict(c, metadata=dict(c["metadata"], updated_on=old["metadata"]["updated_on"]))
            if probe == old:
                c["metadata"]["updated_on"] = old["metadata"]["updated_on"]

    doc = {
        "version": 1,
        "source": GALLERY.format(locale=args.locale),
        "disclaimer": "Card data and images (c) Riot Games, used under the Riftbound Digital Tools Policy. Not affiliated with Riot Games.",
        "total": len(cards), "page": 1, "size": len(cards),
        "sets": sorted({(c["set"]["set_id"], c["set"]["label"]) for c in cards}, key=lambda s: sort_key({"set": {"set_id": s[0]}, "collector_number": 0, "id": ""})),
        "items": cards,
    }
    doc["sets"] = [{"set_id": s, "label": l} for s, l in doc["sets"]]
    with open(args.out, "w") as f:
        json.dump(doc, f, ensure_ascii=False, indent=0, separators=(",", ":"))
        f.write("\n")
    sets = {}
    for c in cards:
        sets[c["set"]["set_id"]] = sets.get(c["set"]["set_id"], 0) + 1
    print("wrote %s: %d cards %s" % (args.out, len(cards), sets))


if __name__ == "__main__":
    main()
