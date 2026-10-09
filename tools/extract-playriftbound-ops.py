#!/usr/bin/env python3
"""Regenerate playriftbound-ops.json from PlayRiftbound's public JavaScript.

The events site resolves GraphQL persisted-query ids from an Apollo manifest that is
bundled as a JSON string inside one of its Next.js chunks. This script downloads the
chunks referenced by the events page, finds that manifest and writes the ids of the
operations Riftcount uses. Run after Riot deploys a new build (ids change with it).

Usage: python3 tools/extract-playriftbound-ops.py [--build TAG]
"""
import json, re, sys, urllib.request, datetime

PAGE = "https://playriftbound.com/en-US/events/"
WANT = ["GetCompeteTournamentForRiftboundPlayer", "SubmitGameResults", "PlayerTournaments",
        "PlayerRegisteredTournamentIds", "GetCompeteRbRefreshPoller", "CompeteTournamentSearch",
        "RegisterCompetePlayer", "DeregisterCompetePlayer", "DropCompetePlayerFromTournament",
        "GetCompetePlayer", "FavoritedOrganizers", "GetCompeteRbRegistrant",
        "UpdateTournamentRegistrantCheckIn"]
UA = "Mozilla/5.0"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")

html = get(PAGE)
chunks = sorted(set(re.findall(r'https://[a-z.]*playriftbound\.com/_next/static/chunks/[^"\\ ]+\.js', html)))
manifest = None
for url in chunks:
    js = get(url)
    i = js.find("apollo-persisted-query-manifest")
    if i < 0:
        continue
    start = js.rfind("JSON.parse('", 0, i) + len("JSON.parse('")
    end = js.find("')", start)
    raw = js[start:end]
    try:
        manifest = json.loads(raw.encode().decode("unicode_escape"))
    except Exception:
        manifest = json.loads(raw.replace("\\'", "'").encode().decode("unicode_escape"))
    break
if not manifest:
    sys.exit("manifest not found in chunks referenced by the events page; it may be lazy-loaded now")
ops = {o["name"]: o for o in manifest["operations"]}
build = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--build=")), "unknown")
out = {"version": 1, "updated": datetime.date.today().isoformat(), "build": build,
       "endpoint": "https://playriftbound.com/api/gql",
       "operations": {k: {"id": ops[k]["id"], "kind": ops[k]["type"]} for k in WANT if k in ops}}
missing = [k for k in WANT if k not in ops]
json.dump(out, open("playriftbound-ops.json", "w"), indent=1)
print(f"wrote playriftbound-ops.json: {len(out['operations'])} operations; missing: {missing or 'none'}")
