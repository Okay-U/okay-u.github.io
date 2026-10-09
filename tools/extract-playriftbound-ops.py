#!/usr/bin/env python3
"""Regenerate playriftbound-ops.json from PlayRiftbound's public JavaScript.

The events site resolves GraphQL persisted-query ids from an Apollo manifest that is
bundled as a JSON string inside one of its Next.js chunks (lazily imported, on the
events app's asset host). This script crawls the chunks from the events page, finds that
manifest and writes the ids of the operations Riftcount uses. Ids change when Riot ships
a new document for an operation; old ids keep working but return the old field set.

Usage: python3 tools/extract-playriftbound-ops.py [--build TAG]
"""
import json, re, sys, urllib.request, datetime

PAGE = "https://playriftbound.com/en-US/events/"
WANT = ["GetCompeteTournamentForRiftboundPlayer", "SubmitGameResults", "PlayerTournaments",
        "PlayerRegisteredTournamentIds", "GetCompeteRbRefreshPoller", "CompeteTournamentSearch",
        "RegisterCompetePlayer", "DeregisterCompetePlayer", "DropCompetePlayerFromTournament",
        "GetCompetePlayer", "FavoritedOrganizers", "FavoriteOrganizer", "UnfavoriteOrganizer",
        "OrganizerSummary", "GetCompeteRbRegistrant", "UpdateTournamentRegistrantCheckIn"]
UA = "Mozilla/5.0"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

def parse_manifest(js):
    i = js.find("apollo-persisted-query-manifest")
    if i < 0:
        return None
    start = js.rfind("'", 0, i) + 1
    end = js.find("')", start)
    raw = js[start:end]
    for fix in (lambda r: r, lambda r: r.replace("\\'", "'")):
        try:
            return json.loads(fix(raw).encode().decode("unicode_escape"))
        except Exception:
            pass
    return None

# The manifest module is loaded lazily (`loadManifest: () => import(...)`), so it sits in a
# chunk that only other chunks reference. Crawl from the page's chunks, following the
# `static/chunks/*.js` paths inside them, on the events app's own asset host.
html = get(PAGE)
page_chunks = set(re.findall(r'https://[a-z.]*playriftbound\.com/_next/static/chunks/[^"\\ ]+\.js', html))
if not page_chunks:
    sys.exit("no chunks referenced by the events page")
base = next(iter(sorted(page_chunks))).split("/_next/")[0] + "/_next/"
queue, seen, manifest = sorted(page_chunks), set(), None
while queue and manifest is None and len(seen) < 200:
    url = queue.pop(0)
    if url in seen:
        continue
    seen.add(url)
    try:
        js = get(url)
    except Exception:
        continue
    manifest = parse_manifest(js)
    if manifest is None:
        queue.extend(base + p for p in re.findall(r'static/chunks/[A-Za-z0-9_.\-]+\.js', js))
if not manifest:
    sys.exit("manifest not found after crawling %d chunks" % len(seen))
ops = {o["name"]: o for o in manifest["operations"]}
build = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--build=")), "unknown")
out = {"version": 1, "updated": datetime.date.today().isoformat(), "build": build,
       "endpoint": "https://playriftbound.com/api/gql",
       "operations": {k: {"id": ops[k]["id"], "kind": ops[k]["type"]} for k in WANT if k in ops}}
missing = [k for k in WANT if k not in ops]
json.dump(out, open("playriftbound-ops.json", "w"), indent=1)
print(f"wrote playriftbound-ops.json: {len(out['operations'])} operations; missing: {missing or 'none'}")
