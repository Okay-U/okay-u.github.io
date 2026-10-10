// Deck construction rules (Riftbound Standard, as enforced by the Riftcount app):
// 1 legend, 1 chosen champion matching it, 40-card main deck including the champion, max 3 copies of a card,
// max 3 Signature cards of the legend's champion, cards inside the legend's domains, 3 different battlefields,
// 12 runes from the legend's domains, optional sideboard up to 10, no banned cards or tokens.
import { isChampionFor, isSignatureFor } from './data.js';

export const LIMITS = { main: 40, copies: 3, signature: 3, battlefields: 3, runes: 12, side: 10 };

export function counts(deck) {
  const main = Object.values(deck.main).reduce((a, b) => a + b, 0) + (deck.champion ? 1 : 0);
  const side = Object.values(deck.side).reduce((a, b) => a + b, 0);
  const runes = Object.values(deck.runes).reduce((a, b) => a + b, 0);
  return { main, side, runes, bf: deck.bf.length };
}

/** Copies of a card across champion, main and sideboard. */
export function copiesOf(deck, id) {
  return (deck.main[id] || 0) + (deck.side[id] || 0) + (deck.champion === id ? 1 : 0);
}

export function inDomains(card, legend) {
  if (!legend) return true;
  return card.domains.every((d) => d === 'Colorless' || legend.domains.includes(d));
}

/** Signature cards in the main deck and sideboard. */
export function signatureCount(deck, idx) {
  return [...Object.entries(deck.main), ...Object.entries(deck.side)]
    .filter(([id]) => idx.byId.get(id)?.supertype === 'Signature').reduce((a, [, n]) => a + n, 0);
}

/** Why a card cannot be added to the main deck or sideboard right now, or null. */
export function blockReason(deck, card, idx) {
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  if (card.token) return 'Tokens are created by other cards, they cannot be in a deck.';
  if (card.banned) return `${card.name} is banned in Standard.`;
  if (legend && !inDomains(card, legend)) return `${card.name} is outside ${legend.domains.join(' / ')}.`;
  if (copiesOf(deck, card.id) >= LIMITS.copies) return `Already ${LIMITS.copies} copies of ${card.name}.`;
  if (card.supertype === 'Signature') {
    if (legend && !isSignatureFor(card, legend)) return `${card.name} is a Signature card of another champion.`;
    if (signatureCount(deck, idx) >= LIMITS.signature) return `A deck holds at most ${LIMITS.signature} Signature cards.`;
  }
  return null;
}

/**
 * How many copies of `card` may go into `zone` (main, side or bench) right now, up to `want`, and why none fit.
 * `counted` copies already sit in the main deck or sideboard and only change zone, so only the sideboard size applies.
 */
export function addRoom(deck, card, zone, want, idx, counted = 0) {
  if (zone === 'bench') {
    const n = Math.min(want, LIMITS.copies - (deck.bench?.[card.id] || 0));
    return { n, why: n > 0 ? null : `The bench already holds ${LIMITS.copies} ${card.name}.` };
  }
  let n = want;
  if (!counted) {
    const why = blockReason(deck, card, idx);
    if (why) return { n: 0, why };
    n = Math.min(n, LIMITS.copies - copiesOf(deck, card.id));
    if (card.supertype === 'Signature') n = Math.min(n, LIMITS.signature - signatureCount(deck, idx));
  }
  if (zone === 'side') n = Math.min(n, LIMITS.side - counts(deck).side);
  return { n, why: n > 0 ? null : zone === 'side' ? 'The sideboard holds ten cards.' : `No room for another ${card.name}.` };
}

export function validate(deck, idx) {
  const n = counts(deck);
  const issues = [];
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  const add = (sev, text) => issues.push({ sev, text });
  if (!legend) return { n, issues: [{ sev: 'info', text: 'Pick a legend to start.' }], status: 'empty' };

  const champion = deck.champion ? idx.byId.get(deck.champion) : null;
  if (!champion) add('warn', `Choose a chosen champion (a ${legend.champ} champion unit).`);
  else if (!isChampionFor(champion, legend)) add('bad', `${champion.name} is not a ${legend.champ} champion.`);
  if (champion?.banned) add('bad', `${champion.name} is banned in Standard.`);
  if (champion && !inDomains(champion, legend)) add('bad', `${champion.name} is outside ${legend.domains.join(' / ')}.`);

  const all = [...Object.entries(deck.main), ...Object.entries(deck.side)];
  const seen = new Map();
  let sig = 0;
  for (const [id, k] of all) {
    const c = idx.byId.get(id);
    if (!c) { add('bad', `Unknown card ${id}.`); continue; }
    seen.set(c.id, (seen.get(c.id) || 0) + k);
    if (c.banned) add('bad', `${c.name} is banned in Standard.`);
    if (c.token) add('bad', `${c.name} is a token.`);
    if (!inDomains(c, legend)) add('bad', `${c.name} is outside ${legend.domains.join(' / ')}.`);
    if (c.supertype === 'Signature') {
      sig += k;
      if (!isSignatureFor(c, legend)) add('bad', `${c.name} is another champion's Signature card.`);
    }
  }
  if (champion) seen.set(champion.id, (seen.get(champion.id) || 0) + 1);
  for (const [id, k] of seen) if (k > LIMITS.copies) add('bad', `${k} copies of ${idx.byId.get(id).name}; the limit is ${LIMITS.copies}.`);
  if (sig > LIMITS.signature) add('bad', `${sig} Signature cards; the limit is ${LIMITS.signature}.`);

  if (n.main < LIMITS.main) add('warn', `Main deck ${n.main}/${LIMITS.main}.`);
  if (n.main > LIMITS.main) add('warn', `Main deck has ${n.main} cards; lists run exactly ${LIMITS.main}.`);
  if (n.side > LIMITS.side) add('bad', `Sideboard has ${n.side} cards; the limit is ${LIMITS.side}.`);
  if (n.bf < LIMITS.battlefields) add('warn', `Battlefields ${n.bf}/${LIMITS.battlefields}.`);
  if (n.bf > LIMITS.battlefields) add('bad', `${n.bf} battlefields; a deck brings ${LIMITS.battlefields}.`);
  if (new Set(deck.bf).size !== deck.bf.length) add('bad', 'Battlefields must all be different.');
  for (const id of deck.bf) {
    const b = idx.byId.get(id);
    if (b?.banned) add('bad', `${b.name} is banned in Standard.`);
  }
  if (n.runes !== LIMITS.runes) add('warn', `Runes ${n.runes}/${LIMITS.runes}.`);
  for (const d of Object.keys(deck.runes)) if (deck.runes[d] && !legend.domains.includes(d)) add('bad', `${d} runes do not match the legend.`);

  const bad = issues.some((i) => i.sev === 'bad');
  const warn = issues.some((i) => i.sev === 'warn');
  return { n, issues, status: bad ? 'illegal' : warn ? 'building' : 'legal' };
}

/**
 * Split the 12 runes across the legend's domains. Power costs need runes of the card's domain, so each domain is
 * weighted by the power its cards ask for, plus a little per card; every domain keeps at least three runes.
 */
export function autoRunes(deck, idx) {
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  if (!legend?.domains.length) return null;
  const doms = legend.domains;
  const w = Object.fromEntries(doms.map((d) => [d, 0]));
  const entries = [...Object.entries(deck.main), ...(deck.champion ? [[deck.champion, 1]] : [])];
  for (const [id, n] of entries) {
    const c = idx.byId.get(id);
    const own = c ? c.domains.filter((d) => doms.includes(d)) : [];
    for (const d of own) w[d] += (n * (c.P + 0.25)) / own.length;
  }
  const floor = doms.length > 1 ? 3 : LIMITS.runes;
  const spare = LIMITS.runes - floor * doms.length;
  const total = doms.reduce((a, d) => a + w[d], 0);
  const raw = doms.map((d) => [d, total ? (spare * w[d]) / total : spare / doms.length]);
  const out = Object.fromEntries(raw.map(([d, x]) => [d, floor + Math.floor(x)]));
  let left = LIMITS.runes - Object.values(out).reduce((a, b) => a + b, 0);
  for (const [d] of raw.sort((a, b) => (b[1] % 1) - (a[1] % 1))) { if (left-- <= 0) break; out[d] += 1; }
  return out;
}
