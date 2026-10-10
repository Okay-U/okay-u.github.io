// Agent work styles. Each style weighs the same numbers differently and speaks in its own voice.
// Scores are in C per deck slot: surplus = value a card brings beyond its cost (gear discounted, see engine).
// score(m, ctx) ranks candidates to add (higher first); keep(row, ctx) ranks deck cards (lowest = first cut).
import { NEED } from './engine.js';

const pct = (x) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;
const f2 = (x) => (x === null || x === undefined ? '–' : x.toFixed(2));
const c1 = (x) => `${x >= 0 ? '+' : ''}${x.toFixed(1)} C`;
const dependency = (c) => (c.model?.wt || []).filter(([, kind]) => kind === 'if_any').length;
const answers = (c) => (c.model?.r || []).some((r) => ['removal', 'interaction', 'draw', 'cantrip'].includes(r));
const helped = (m) => m.helps.slice(0, 3).map((h) => h.name).join(', ');
// Efficiency first, size second: a 1-cost card at 2.00 beats an 8-cost card at 1.30 for a deck slot.
const core = (ratio, surplus) => (ratio === null || ratio === undefined ? -3 : (ratio - 1) * 3 + 0.2 * (surplus ?? 0));
const curve = (m) => NEED.curve(m.card, m.metrics);
const body = (m) => NEED.structure(m.card, m.metrics);

export const STYLES = [
  {
    id: 'auditor', name: 'The Auditor', blurb: "Prices strictly by Riot's ledger. Flags every card the designers charged too much for.",
    score: (m) => (m.ledger === null ? -9 : core(m.rank.ledger, m.ledgerSurplus)) + 0.5 * NEED.role(m.card, m.metrics) + 0.4 * curve(m) + body(m),
    keep: (r) => (r.ledger === null ? 0 : core(r.ledger, r.ledgerV - r.card.C)),
    headline: (a) => {
      const l = a.metrics.ledger;
      if (l === null) return ['Nothing priced yet.', 'Add cards and run me again.'];
      const v = l >= 1.05 ? 'Over budget, in your favour.' : l >= 0.95 ? 'Priced at par.' : 'Under budget.';
      return [v, `By the designers' own ledger the average card returns ${f2(l)} C of value per C spent. Par is 1.00; the ledger ignores combos on purpose.`];
    },
    buyWhy: (m) => `Ledger ${f2(m.ledger)}${m.status === 'p' ? ' (lower bound)' : ''}, ${c1((m.ledgerV ?? 0) - m.card.C)} over its cost. ${m.card.model?.n || ''}`.trim(),
    sellWhy: (r) => `Ledger ${f2(r.ledger)}: the designers booked ${c1(r.ledgerV - r.card.C)} against its cost.`,
  },
  {
    id: 'engineer', name: 'The Engineer', blurb: 'Builds engines. Values each card by what its partners in this deck make it worth.',
    score: (m) => core(m.rank.deck, m.surplus) + 1.2 * m.given + 0.8 * NEED.role(m.card, m.metrics) + 0.9 * curve(m) + body(m),
    keep: (r) => core(r.deckAmber, r.surplus) + 0.8 * (r.givenOut || 0),
    headline: (a) => {
      const g = a.metrics.inDeck - (a.metrics.practical ?? 0);
      return [g > 0.08 ? 'The engine is running.' : g > 0.02 ? 'Parts are talking to each other.' : 'Mostly loose parts.',
        `In this deck the average card is worth ${f2(a.metrics.inDeck)} per cost, ${pct(g)} from synergy alone. ${a.pairs.length} working links found.`];
    },
    buyWhy: (m) => (m.helps.length
      ? `Feeds ${helped(m)} (${c1(m.given)} to them) and is worth ${f2(m.deckAmber)} per cost here.`
      : `Worth ${f2(m.deckAmber)} per cost in this deck${m.own > 0.2 ? `, ${c1(m.own)} from partners already in the list` : ''}.`),
    sellWhy: (r) => (r.bonus < -0.3 ? `Its payoff has little to feed on here (${c1(r.bonus)}).`
      : r.bonus > 0.2 ? `Partners add ${c1(r.bonus)}, still ${c1(r.surplus ?? 0)} against its cost.`
      : Math.abs(r.surplus ?? 0) < 0.05 ? 'At par: nothing in this list raises it.' : `No partner raises it; ${c1(r.surplus ?? 0)} against its cost.`),
  },
  {
    id: 'coach', name: 'The Coach', blurb: 'Curve, early plays and roles first. A deck that does something every turn.',
    score: (m) => core(m.rank.practical, m.practicalSurplus) + 2.2 * NEED.role(m.card, m.metrics) + 2.6 * curve(m) + 0.4 * m.given + 1.2 * body(m),
    keep: (r, ctx) => core(r.deckAmber, r.surplus) - 1.5 * Math.max(0, -NEED.curve(r.card, ctx.metrics)) + 0.6 * (r.roleCount || 0),
    headline: (a) => {
      const early = a.metrics.roles.early_body;
      const e = a.metrics.avgEnergy;
      return [e <= 3.2 && early >= 6 ? 'Good shape for a tempo plan.' : e > 3.8 ? 'Top heavy.' : 'Playable curve, gaps to fill.',
        `Average energy ${e.toFixed(1)}, ${early} cheap units, ${a.metrics.roles.removal} removal, ${a.metrics.roles.draw} card draw.`];
    },
    buyWhy: (m) => {
      const need = NEED.roleNames.filter((k) => (m.card.model?.r || []).includes(k) && (m.metrics.roles[k] || 0) < NEED.ROLE_TARGETS[k]);
      return `${need.length ? `Fills ${need.join(' and ').replace('_', ' ')}. ` : ''}${m.card.E}-energy slot, ${c1(m.practicalSurplus)} over its cost in practice.`;
    },
    sellWhy: (r, ctx) => `${r.card.E}-energy slot is ${NEED.curve(r.card, ctx.metrics) < 0 ? 'crowded' : 'thin, but this card is weak'}; ${c1(r.surplus ?? 0)} against its cost here.`,
  },
  {
    id: 'grinder', name: 'The Grinder', blurb: 'Tournament consistency: interaction, card flow, few conditions, full playsets.',
    score: (m) => core(m.rank.practical, m.practicalSurplus) + 1.6 * NEED.role(m.card, m.metrics) + 1.4 * curve(m) - 0.7 * dependency(m.card) + (answers(m.card) ? 1.2 : 0) + body(m),
    keep: (r) => 0.6 * core(r.deckAmber, r.surplus) + 0.4 * core(r.practical, r.practicalSurplus) - 0.6 * dependency(r.card) + (r.n >= 3 ? 0.4 : r.n === 1 ? -0.5 : 0) + (answers(r.card) ? 0.8 : 0),
    headline: (a) => {
      const inter = a.metrics.roles.removal + a.metrics.roles.interaction;
      return [inter >= 9 ? 'Ready for a long event.' : inter >= 6 ? 'Solid, a little light on answers.' : 'Too few answers for a field.',
        `${inter} cards that answer the opponent, ${a.metrics.roles.draw} that draw, ${a.metrics.unscored} the ledger cannot price.`];
    },
    buyWhy: (m) => `${c1(m.practicalSurplus)} over cost in practice${dependency(m.card) ? '' : ', no conditions to meet'}. Roles: ${(m.card.model?.r || []).join(', ').replace(/_/g, ' ')}.`,
    sellWhy: (r) => (r.n === 1 ? 'Single copy: you will rarely see it.' : dependency(r.card) ? 'Needs conditions to pay off; inconsistent in a long event.' : `Only ${c1(r.practicalSurplus ?? 0)} over cost.`),
  },
  {
    id: 'brewer', name: 'The Brewer', blurb: 'Hunts hidden gems: cards the ledger underrates that this deck makes great.',
    score: (m) => 3 * (m.deckV - (m.ledgerV ?? m.practicalV)) / m.card.C * (m.card.type === 'Gear' ? 0.6 : 1) + 0.8 * m.given + 0.5 * core(m.rank.deck, m.surplus) + 0.6 * curve(m) + body(m),
    keep: (r) => (r.deckV === null ? 0 : 3 * (r.deckV - (r.ledgerV ?? r.practicalV ?? 0)) / r.card.C + 0.5 * core(r.deckAmber, r.surplus)),
    headline: (a) => {
      const best = [...a.rows].filter((r) => r.deckV !== null && r.ledgerV !== null).sort((x, y) => (y.deckV - y.ledgerV) - (x.deckV - x.ledgerV))[0];
      const booked = best && best.ledger !== null ? `booked at ${f2(best.ledger)} by the ledger` : 'left unpriced by the ledger';
      return ['Here is what nobody prices right.',
        best ? `${best.card.name} is ${booked} and plays at ${f2(best.deckAmber)} in this list.` : 'Add a few cards and I will find the sleepers.'];
    },
    buyWhy: (m) => `${m.ledger === null ? 'Unpriced by the ledger' : `Ledger ${f2(m.ledger)}`}, worth ${f2(m.deckAmber)} here (${c1(m.deckV - (m.ledgerV ?? m.practicalV))} the ledger misses)${m.helps.length ? `, lifts ${m.helps[0].name}` : ''}.`,
    sellWhy: (r) => `Honest card, but the ledger already prices it fully; a sleeper would do more here.`,
  },
];

export const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[1];
