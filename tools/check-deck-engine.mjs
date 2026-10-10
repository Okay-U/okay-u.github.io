// Self-check for the Deck Board engine: fills decks with every work style for a spread of legends and asserts
// that the results are legal and sensible. Run from the repo root: node tools/check-deck-engine.mjs
import { readFileSync } from 'node:fs';
import { buildIndex } from '../deck/js/data.js';
import { analyze, marginal, candidatePool, setPool } from '../deck/js/agent/engine.js';
import { STYLES } from '../deck/js/agent/styles.js';
import { blockReason, counts, validate, LIMITS, autoRunes } from '../deck/js/rules.js';
import { importText, exportText } from '../deck/js/text.js';

const feed = JSON.parse(readFileSync(new URL('../cards.json', import.meta.url)));
const model = JSON.parse(readFileSync(new URL('../deck/data/model.json', import.meta.url)));
const idx = buildIndex(feed, model);
setPool(idx.cards);

function fill(legend, style) {
  const champ = idx.cards.find((c) => c.type === 'Unit' && c.supertype === 'Champion' && !c.banned && (c.champ === legend.champ || c.tags.includes(legend.champ)));
  const deck = { legend: legend.id, champion: champ?.id || null, main: {}, side: {}, bf: [], runes: {} };
  for (let guard = 0; counts(deck).main < LIMITS.main && guard < 60; guard++) {
    const a = analyze(deck, idx);
    const ctx = { metrics: a.metrics };
    const best = candidatePool(deck, idx).filter((c) => !blockReason(deck, c, idx))
      .map((c) => marginal(c, a, deck)).filter(Boolean)
      .map((m) => ({ ...m, metrics: a.metrics, helps: m.helps.map((h) => ({ ...h, name: h.id })) }))
      .map((m) => ({ m, s: style.score(m, ctx) })).sort((x, y) => y.s - x.s)[0];
    if (!best) break;
    deck.main[best.m.card.id] = (deck.main[best.m.card.id] || 0) + 1;
  }
  return deck;
}

const legends = idx.cards.filter((c) => c.type === 'Legend' && !c.banned && c.domains.length === 2 && c.set !== 'RAD').slice(0, 8);
const crab = idx.byName.get('scuttle crab');
let checked = 0;
const t0 = Date.now();
for (const legend of legends) {
  for (const style of STYLES) {
    const deck = fill(legend, style);
    const a = analyze(deck, idx);
    const v = validate({ ...deck, bf: [], runes: {} }, idx);
    const bad = v.issues.filter((i) => i.sev === 'bad');
    if (counts(deck).main !== LIMITS.main) throw new Error(`${legend.name}/${style.id}: ${counts(deck).main} cards`);
    if (bad.length) throw new Error(`${legend.name}/${style.id}: ${bad.map((i) => i.text).join('; ')}`);
    if (style.id !== 'auditor' && style.id !== 'brewer' && a.metrics.units < 14) throw new Error(`${legend.name}/${style.id}: only ${a.metrics.units} units`);
    if (style.id === 'coach' && a.metrics.avgEnergy > 3.8) throw new Error(`${legend.name}/coach: avg energy ${a.metrics.avgEnergy.toFixed(2)}`);
    if (legend.domains.includes('Calm') && ['coach', 'grinder', 'engineer'].includes(style.id) && !deck.main[crab.id]) {
      throw new Error(`${legend.name}/${style.id}: Scuttle Crab missing from a Calm deck`);
    }
    const runes = autoRunes(deck, idx);
    if (Object.values(runes).reduce((a, b) => a + b, 0) !== LIMITS.runes || Object.values(runes).some((n) => n < 3)) {
      throw new Error(`${legend.name}/${style.id}: auto runes ${JSON.stringify(runes)}`);
    }
    const back = importText(exportText(deck, idx), idx).deck;
    if (back.legend !== deck.legend || counts(back).main !== counts(deck).main) throw new Error(`${legend.name}/${style.id}: export/import round trip changed the deck`);
    checked++;
  }
}
console.log(`ok: ${checked} filled decks across ${legends.length} legends and ${STYLES.length} styles in ${Date.now() - t0} ms`);
