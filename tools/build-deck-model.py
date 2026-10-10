#!/usr/bin/env python3
"""Build deck/data/model.json for the deckbuilder from the AMBER ledger and the synergy tags.

Inputs:
  amber/amber.json        per-card ledger values (Chen & Lee 2026 model v6, CC BY 4.0; built in the Riftcount repo)
  tools/deck-tags.json    per-card synergy tags, roles and practical-value adjustments (Riftcount model)
Output:
  deck/data/model.json    compact per-card model keyed by collector number

Usage: python3 tools/build-deck-model.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
KINDS = {'per_event', 'per_count', 'if_any', 'cost_reduction'}
STATUS = {'full': 'f', 'partial': 'p', 'deferred': 'd'}
# Practical entries that restate a unit's own repeatable trigger at a realistic rate. The ledger already books that
# trigger at half an activation, so the engine takes the larger of the two instead of adding them.
NATURAL = re.compile(r'natural|normal (moves?|attacks?|defen[cs]es?)|per game|ledger books? 0|~[\d.]+ triggers?', re.I)


def num(x: Any, nd: int = 3) -> float | None:
    try:
        return round(float(x), nd)
    except (TypeError, ValueError):
        return None


def tag(t: Any) -> str:
    return str(t or '').strip().lower().replace(' ', '_') if not str(t).startswith(('tribe:', 'region:')) else str(t).strip()


def compact(card: dict[str, Any], tags: dict[str, Any] | None) -> dict[str, Any]:
    m: dict[str, Any] = {}
    if card:
        m.update(L=num(card.get('amber')), V=num(card.get('V0')), D=num(card.get('delta')) or 0, K=num(card.get('k')) or 0,
                 S=STATUS.get(card.get('status'), 'd'), C=card.get('C'))
    if tags:
        has_trigger = bool(card) and (num(card.get('delta')) or 0) > 0
        m['P'] = [[str(p.get('label', ''))[:140], num(p.get('value'), 2)] + ([1] if has_trigger and NATURAL.search(str(p.get('label', ''))) else [])
                  for p in tags.get('practical') or [] if num(p.get('value'), 2) is not None]
        st = num(tags.get('staple'), 2)
        if st:
            m['st'] = max(-1.0, min(2.0, st))
        m['pv'] = [[tag(p.get('tag')), num(p.get('n'), 2) or 0] for p in tags.get('provides') or [] if p.get('tag')]
        m['wt'] = [[tag(w.get('tag')), w.get('kind'), num(w.get('value'), 2) or 0, num(w.get('cap'), 2), str(w.get('note') or '')[:90]]
                   for w in tags.get('wants') or [] if w.get('tag') and w.get('kind') in KINDS]
        m['r'] = [str(r) for r in tags.get('roles') or []][:4]
        if tags.get('note'):
            m['n'] = str(tags['note'])[:220]
    return m


def selfcheck(model: dict[str, Any]) -> None:
    crab = model['cards'].get('UNL-053')
    assert crab and crab['L'] is not None and crab.get('P'), 'Scuttle Crab must carry ledger and practical values'
    practical = (crab['V'] + crab['K'] * crab['D'] + sum(v for _, v in crab['P']) + crab.get('st', 0)) / crab['C']
    assert practical > 1.2, f'Scuttle Crab practical value too low: {practical:.2f}'


def main() -> None:
    amber = {c['id']: c for c in json.loads((ROOT / 'amber' / 'amber.json').read_text())['cards']}
    tags = {t['id']: t for t in json.loads((ROOT / 'tools' / 'deck-tags.json').read_text())}
    ids = sorted(set(amber) | set(tags))
    model = {'meta': {'ledger': 'Chen & Lee 2026, frozen model v6 (CC BY 4.0)', 'tags': 'Riftcount synergy model v1', 'cards': len(ids)},
             'cards': {i: compact(amber.get(i), tags.get(i)) for i in ids}}
    selfcheck(model)
    out = ROOT / 'deck' / 'data' / 'model.json'
    out.write_text(json.dumps(model, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'wrote {out.relative_to(ROOT)}: {len(ids)} cards, {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
