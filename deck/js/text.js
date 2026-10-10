// Plain-text decklists, the same format the Riftcount app reads and writes:
// Legend: / Champion: / MainDeck: / Battlefields: / Runes: / Sideboard:, each line "N Card Name, Subtitle".
import { norm, DOMAINS } from './data.js';

export function exportText(deck, idx) {
  const name = (id) => idx.byId.get(id)?.display || id;
  const out = [];
  const block = (title, lines) => { if (lines.length) out.push(`${title}:`, ...lines, ''); };
  block('Legend', deck.legend ? [`1 ${name(deck.legend)}`] : []);
  block('Champion', deck.champion ? [`1 ${name(deck.champion)}`] : []);
  block('MainDeck', Object.entries(deck.main).map(([id, n]) => `${n} ${name(id)}`));
  block('Battlefields', deck.bf.map((id) => `1 ${name(id)}`));
  block('Runes', Object.entries(deck.runes).filter(([, n]) => n > 0).map(([d, n]) => `${n} ${d} Rune`));
  block('Sideboard', Object.entries(deck.side).map(([id, n]) => `${n} ${name(id)}`));
  return out.join('\n').trim();
}

const SECTIONS = { legend: 'legend', champion: 'champion', champions: 'champion', maindeck: 'main', main: 'main',
  battlefields: 'bf', battlefield: 'bf', runes: 'runes', rune: 'runes', sideboard: 'side', sidedeck: 'side', side: 'side' };

function matchCard(name, idx, want) {
  const key = norm(name);
  const ok = (c) => !want || want(c);
  const exact = idx.byName.get(key);
  if (exact && ok(exact)) return exact;
  const pool = idx.cards.filter(ok);
  return pool.find((c) => norm(c.name) === key || norm(c.display) === key)
    || pool.find((c) => norm(c.name).startsWith(key) || key.startsWith(norm(c.name)))
    || pool.find((c) => key.length > 4 && norm(c.name).includes(key))
    || null;
}

/** Parse decklist text into a deck shape. Returns { deck, unresolved }. */
export function importText(text, idx) {
  const deck = { legend: null, champion: null, main: {}, side: {}, bf: [], runes: {} };
  const unresolved = [];
  let sec = null;
  for (const raw of String(text).split(/\r?\n/).slice(0, 300)) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.replace(/:$/, '').toLowerCase().replace(/\s+/g, '');
    if (Object.hasOwn(SECTIONS, head) && (line.endsWith(':') || !/^\d/.test(line))) { sec = SECTIONS[head]; continue; }
    const m = /^(\d+)\s*x?\s+(.+)$/i.exec(line);
    if (!m || !sec) { unresolved.push(line); continue; }
    const n = Math.min(parseInt(m[1], 10), 12);
    const nm = m[2].trim();
    if (sec === 'runes') {
      const d = DOMAINS.find((x) => norm(nm).replace(/ rune$/, '').replace(/^rune of /, '') === x.toLowerCase());
      if (d) deck.runes[d] = (deck.runes[d] || 0) + n; else unresolved.push(line);
      continue;
    }
    const want = { legend: (c) => c.type === 'Legend', champion: (c) => c.type === 'Unit', bf: (c) => c.type === 'Battlefield',
      main: (c) => ['Unit', 'Spell', 'Gear'].includes(c.type), side: (c) => ['Unit', 'Spell', 'Gear'].includes(c.type) }[sec];
    const c = matchCard(nm, idx, want);
    if (!c) { unresolved.push(line); continue; }
    if (sec === 'legend') deck.legend = c.id;
    else if (sec === 'champion') deck.champion = c.id;
    else if (sec === 'bf') { if (!deck.bf.includes(c.id)) deck.bf.push(c.id); }
    else deck[sec][c.id] = (deck[sec][c.id] || 0) + n;
  }
  // Lists that put the champion inside MainDeck: take one copy out as the chosen champion.
  if (!deck.champion && deck.legend) {
    const legend = idx.byId.get(deck.legend);
    const champ = Object.keys(deck.main).map((id) => idx.byId.get(id))
      .find((c) => c?.supertype === 'Champion' && (c.champ === legend.champ || c.tags.includes(legend.champ)));
    if (champ) { deck.champion = champ.id; deck.main[champ.id] -= 1; if (!deck.main[champ.id]) delete deck.main[champ.id]; }
  }
  return { deck, unresolved };
}
