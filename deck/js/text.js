// Plain-text decklists, the same format the Riftcount app reads and writes:
// Legend: / Champion: / MainDeck: / Battlefields: / Runes: / Sideboard:, each line "N Card Name, Subtitle".
import { norm, DOMAINS } from './data.js';
import { getCodeFromDeck, getDeckFromCode } from './deckcode.js';

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

/** Lists that keep the champion inside the main deck: take one copy out as the chosen champion when only one fits. */
function pickChampion(deck, idx) {
  if (deck.champion || !deck.legend) return;
  const legend = idx.byId.get(deck.legend);
  // only when the choice is unambiguous; with two candidates the builder asks instead of guessing
  const fits = Object.keys(deck.main).map((id) => idx.byId.get(id))
    .filter((c) => c?.supertype === 'Champion' && (c.champ === legend.champ || c.tags.includes(legend.champ)));
  if (fits.length !== 1) return;
  const champ = fits[0];
  deck.champion = champ.id; deck.main[champ.id] -= 1; if (!deck.main[champ.id]) delete deck.main[champ.id];
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
  pickChampion(deck, idx);
  return { deck, unresolved };
}

// ---- deck codes (the strings Piltover Archive and other Riftbound tools share), see deckcode.js ----

/** Deck code for a deck: legend, champion, battlefields, runes and main deck in one list, plus the sideboard. */
export function exportCode(deck, idx) {
  const main = new Map();
  const put = (id, n) => { if (id && n > 0) main.set(id, (main.get(id) || 0) + n); };
  put(deck.legend, 1);
  put(deck.champion, 1);
  for (const [id, n] of Object.entries(deck.main)) put(id, n);
  for (const id of deck.bf) put(id, 1);
  const runeCard = (d) => idx.cards.find((c) => c.type === 'Rune' && c.domains[0] === d);
  for (const [d, n] of Object.entries(deck.runes)) put(runeCard(d)?.id, n);
  return getCodeFromDeck([...main].map(([cardCode, count]) => ({ cardCode, count })),
    Object.entries(deck.side).map(([cardCode, count]) => ({ cardCode, count })), deck.champion || undefined);
}

/** A pasted deck code, or a link carrying one (?code=), or null when the text is not one. */
export function findCode(text) {
  const s = String(text).trim();
  const fromLink = /[?&#]code=([A-Za-z2-7]+)/.exec(s);
  if (fromLink) return fromLink[1];
  return /^[A-Za-z2-7]{16,}$/.test(s) ? s : null;
}

/** Decode a deck code into a deck shape. Returns { deck, unresolved }; throws on a malformed code. */
export function importCode(code, idx) {
  const { mainDeck, sideboard, chosenChampion } = getDeckFromCode(code);
  const deck = { legend: null, champion: null, main: {}, side: {}, bf: [], runes: {} };
  const unresolved = [];
  // variant suffixes (a, b, s, *) name printings of the same card
  const card = (cardCode) => idx.byId.get(cardCode.replace(/(\d)[abs*]$/, '$1')) || null;
  for (const { cardCode, count } of mainDeck) {
    const c = card(cardCode);
    if (!c) { unresolved.push(`${count} ${cardCode}`); continue; }
    if (c.type === 'Legend') { if (!deck.legend) deck.legend = c.id; }
    else if (c.type === 'Battlefield') { if (!deck.bf.includes(c.id)) deck.bf.push(c.id); }
    else if (c.type === 'Rune') { const d = c.domains[0]; if (d) deck.runes[d] = (deck.runes[d] || 0) + count; }
    else deck.main[c.id] = (deck.main[c.id] || 0) + count;
  }
  for (const { cardCode, count } of sideboard) {
    const c = card(cardCode);
    if (c) deck.side[c.id] = (deck.side[c.id] || 0) + count; else unresolved.push(`${count} ${cardCode} (sideboard)`);
  }
  const champ = chosenChampion ? card(chosenChampion) : null;
  if (champ && deck.main[champ.id]) {
    deck.champion = champ.id;
    deck.main[champ.id] -= 1;
    if (!deck.main[champ.id]) delete deck.main[champ.id];
  }
  pickChampion(deck, idx);
  return { deck, unresolved };
}
