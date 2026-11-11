#!/usr/bin/env python3
"""Self-check for build-cards.py's DotGG handling, offline. Run from the repo root:
python3 tools/check-build-cards.py"""
import importlib.util
import json
import pathlib

spec = importlib.util.spec_from_file_location("build_cards", pathlib.Path(__file__).with_name("build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)

KNOWN = {"domain": {"Fury", "Chaos", "Mind"}, "type": {"Unit", "Spell", "Gear"}}
LAST = ("last feed", {"domain": ["Fury"], "type": "Spell"})


def card(domain, type_):
    return {"public_code": "RAD-001/100", "name": "Test", "classification": {"domain": domain, "type": type_}}


# DotGG wins where it disagrees with Riot (Radiance, 2026-10).
c = card(["Chaos"], "Gear")
assert bc.correct(c, [("DotGG", {"domain": ["Fury"], "type": "Spell"})], KNOWN) == 0
assert c["classification"] == {"domain": ["Fury"], "type": "Spell"}

# The same domains in another order are no correction.
c = card(["Mind", "Fury"], "Unit")
bc.correct(c, [("DotGG", {"domain": ["Fury", "Mind"], "type": "Unit"})], KNOWN)
assert c["classification"]["domain"] == ["Mind", "Fury"]

# Values Riot never uses are refused (a changed DotGG format); the last feed's correction stays.
c = card(["Chaos"], "Gear")
assert bc.correct(c, [("DotGG", {"domain": "Fury", "type": "S"}), LAST], KNOWN) == 2
assert c["classification"] == {"domain": ["Fury"], "type": "Spell"}
c = card(["Chaos"], "Gear")
assert bc.correct(c, [("DotGG", {"domain": ["Fury", "Radiant"], "type": None}), LAST], KNOWN) == 1
assert c["classification"] == {"domain": ["Fury"], "type": "Spell"}

# No DotGG row (an outage, a card DotGG lacks): the last feed's values stay.
c = card(["Chaos"], "Gear")
bc.correct(c, [LAST], KNOWN)
assert c["classification"] == {"domain": ["Fury"], "type": "Spell"}

# A new card with neither source keeps Riot's values.
c = card(["Chaos"], "Gear")
bc.correct(c, [], KNOWN)
assert c["classification"] == {"domain": ["Chaos"], "type": "Gear"}

# A malformed DotGG answer counts as unavailable instead of stopping the run.
bc.fetch = lambda url: json.dumps({"names": ["id", "type"], "data": [["OGN-001", 5]]})
assert bc.fetch_dotgg() is None
bc.fetch = lambda url: json.dumps({"names": ["id", "color", "type"], "data": [["OGN-001", ["Fury"], ["Unit"]], None]})
assert bc.fetch_dotgg() is None

print("build-cards checks passed")
