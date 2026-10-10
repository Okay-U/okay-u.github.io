// Deck valuation engine. Three layers per card, all in cost units C (1 energy = 1 C, 1 power = 2 C):
//   ledger    the designers' price (AMBER, Chen & Lee 2026): (V0 + k * delta) / C
//   practical ledger value + what the ledger books at a discount or at zero (Riftcount model, per card)
//   in-deck   practical value re-priced by the partners actually in this deck
// Synergy uses provider density: a payoff that wants tag T gains value with the number of T providers.
import { inDomains, copiesOf } from '../rules.js';
import { isSignatureFor } from '../data.js';

const DECK = 40;
const SEEN_BY_MIDGAME = 8;    // cards drawn by the turn a one-off condition matters
const ON_BOARD = 0.18;        // share of a provider count that is on the board at once
const LEGEND_WEIGHT = 8;      // a legend providing a tag every turn counts like 8 cards
const GEAR_WEIGHT = 0.7;      // gear values rest on a guessed number of uses (paper, Sec. III-B); rank them with care
const REGIONS = new Set(['Ionia', 'Noxus', 'Bilgewater', 'Demacia', 'Shurima', 'Bandle City', 'Shadow Isles', 'Mount Targon',
  'Piltover', 'Freljord', 'Zaun', 'The Void', 'Ixtal', 'Icathia']);

const KW = [
  [/\[Hidden\]/, 'hidden'], [/\[Deathknell\]/, 'deathknell'], [/\[Equip\]|^Equip |\[Quick-Draw\]/m, 'equipment'],
  [/\[Empower/, 'empower'], [/\[Deploy\]/, 'deploy_gear'], [/\[Ganking\]/, 'conquer'], [/\[Assault/, 'conquer'],
  [/\[Tank\]|\[Shield/, 'hold'], [/\[Hunt/, 'xp'], [/\[Vision\]|\[Predict/, 'vision'], [/\[Repeat\]/, 'spell_extra'],
  [/\[Flow\]/, 'play_from_trash'], [/\[Accelerate\]/, 'ready_unit'],
];
const ALIAS = { deathknell_unit: 'deathknell', spell_cast: 'spell', spells: 'spell', units: 'unit', gears: 'gear',
  equip: 'equipment', token: 'token_unit', tokens: 'token_unit', exhausted: 'exhausted_units', runes: 'rune_count',
  removal_spell: 'removal', kill: 'enemy_death', damage: 'enemy_death', cheap: 'legion', showoff: 'show_off' };
const tagOf = (t) => ALIAS[t] || t;

/** Tags a card provides automatically from its type, cost, keywords and tribe/region tags. */
export function autoProvides(c) {
  const out = [];
  if (c.type === 'Spell') out.push(['spell', 1]);
  if (c.type === 'Unit') out.push(['unit', 1], ['units_here', 1], ['exhausted_units', 0.5]); // moving exhausts a unit
  if (/\[Temporary\]/.test(c.text)) out.push(['temporary', 1], ['friendly_death', 0.6]);
  if (/When you play me/i.test(c.text)) out.push(['onplay', 1]);
  if (c.type === 'Gear') out.push(['gear', 1]);
  if (c.C > 0 && c.C <= 2) out.push(['legion', 1]);
  if (c.E >= 7) out.push(['show_off', 1]);
  if (c.type === 'Spell' && c.C >= 5) out.push(['big_spell', 1]);
  if (c.P >= 2) out.push(['power2', 1]);
  if (c.type === 'Unit' && (c.might || 0) >= 5) out.push(['mighty', 1]);
  for (const [re, t] of KW) if (re.test(c.text)) out.push([t, 1]);
  for (const t of c.tags) {
    if (REGIONS.has(t)) out.push([`region:${t}`, 1]);
    else if (c.type !== 'Legend' && t !== c.champ && t !== 'Equipment' && t !== 'Device') out.push([`tribe:${t}`, 1]);
  }
  return out;
}

export function providesOf(c) {
  const m = c.model;
  const list = [...autoProvides(c), ...((m?.pv) || []).map(([t, n]) => [tagOf(t), Number(n) || 0])];
  const merged = new Map();
  for (const [t, n] of list) merged.set(t, Math.max(merged.get(t) || 0, n)); // auto and tagged often overlap
  return merged;
}

export const wantsOf = (c) => ((c.model?.wt) || []).map(([tag, kind, value, cap, note]) =>
  ({ tag: tagOf(tag), kind, value: Number(value) || 0, cap: cap ? Number(cap) : null, note: note || '' }));

/** Ledger and practical layers, deck-independent. */
export function baseValue(c) {
  const m = c.model;
  if (!m || !c.C) return { ledger: null, ledgerV: null, practicalV: null, practical: null, status: m?.S || 'n', parts: [] };
  const V0 = m.V ?? 0;
  const kd = (m.K || 0) * (m.D || 0);
  const booked = V0 + kd;
  const all = (m.P || []).map(([label, value, natural]) => ({ label, value: Number(value) || 0, natural: !!natural }));
  // a realistic firing rate for the card's own trigger replaces the ledger's half activation when it is higher
  const natural = all.filter((p) => p.natural).reduce((a, p) => a + p.value, 0);
  const parts = all.filter((p) => !p.natural);
  if (natural > kd) parts.unshift({ label: `own trigger fires more than the ledger's half activation (${natural.toFixed(2)} vs ${kd.toFixed(2)} C)`, value: natural - kd });
  if (m.st) parts.push({ label: 'staple: structural strength beyond its parts', value: m.st });
  const practicalV = booked + parts.reduce((a, p) => a + p.value, 0);
  return { ledger: m.S === 'd' ? null : m.L, ledgerV: booked, practicalV, practical: practicalV / c.C, status: m.S, parts, naturalV: Math.max(natural, kd) };
}

// Typical providers per 40-card deck for each tag, from the whole card pool. The designers book a repeatable
// trigger at half an activation; we read that half as "a typical deck". A deck twice as dense fires it twice as often.
let BASE = new Map();
const TYPICAL_K = 0.5;
const MAX_K = 1.5;
const POINT_CAP = 6;
const SYNERGY_CAP = 1.5;      // per cost: a combo can at most add 1.5 to a card's ratio          // a point is 11.5 C on the designers' sheet, but not a linear in-game resource
export function setPool(cards) {
  const sum = new Map();
  let n = 0;
  for (const c of cards) {
    if (!['Unit', 'Spell', 'Gear'].includes(c.type) || c.token || !c.C) continue;
    n++;
    for (const [t, k] of providesOf(c)) sum.set(t, (sum.get(t) || 0) + k);
  }
  BASE = new Map([...sum].map(([t, s]) => [t, Math.max(2, (DECK * s) / Math.max(n, 1))]));
}
const typical = (tag) => BASE.get(tag) || 2;

const realise = {
  per_event: (P, cap, value, tag) => Math.min(MAX_K, TYPICAL_K * (P / typical(tag))),
  if_any: (P) => 1 - (1 - Math.min(P, DECK) / DECK) ** SEEN_BY_MIDGAME,
  per_count: (P, cap) => Math.min(cap || 3, P * ON_BOARD),
  cost_reduction: (P, cap, value) => Math.min(cap || value * 3, value * P * ON_BOARD) / Math.max(value, 0.01),
};

/** Provider totals for the deck: tag -> { total, by: Map(cardId -> weight) }. */
export function providerTable(entries, legend, battlefields) {
  const table = new Map();
  const put = (tag, id, w) => {
    if (!table.has(tag)) table.set(tag, { total: 0, by: new Map() });
    const t = table.get(tag);
    t.total += w;
    t.by.set(id, (t.by.get(id) || 0) + w);
  };
  for (const { card, n } of entries) for (const [tag, k] of providesOf(card)) put(tag, card.id, k * n);
  if (legend) for (const [tag, k] of providesOf(legend)) if (!tag.startsWith('region:')) put(tag, legend.id, k * LEGEND_WEIGHT);
  for (const b of battlefields) for (const [tag, k] of providesOf(b)) put(tag, b.id, k * 2);
  return table;
}

/** Synergy bonus for one card given providers. Returns { bonus, links[] } with per-provider credit. */
export function synergy(card, n, table) {
  const own = providesOf(card);
  const wants = wantsOf(card).sort((a, b) => b.value - a.value);
  const b0 = baseValue(card);
  let booked = (card.model?.D || 0) > 0 ? (card.model.K || 0.5) : 0;
  let natural = b0.naturalV || 0; // own trigger already priced in practical: the first per-event payoff starts from there
  let bonus = 0;
  const links = [];
  const detail = [];
  for (const w of wants) {
    const t = table.get(w.tag);
    const ownShare = (own.get(w.tag) || 0) * Math.max(0, n - 1) / Math.max(n, 1); // other copies count, this one does not
    const fromOthers = t ? t.total - (own.get(w.tag) || 0) * n : 0;
    const P = Math.max(0, fromOthers + ownShare);
    const fn = realise[w.kind] || realise.if_any;
    const value = Math.min(w.value, POINT_CAP);
    const realised = fn(P, w.cap, value, w.tag);
    let base = 0;
    if (w.kind === 'per_event' && (booked || natural)) {
      base = Math.min(MAX_K, Math.max(booked, natural / Math.max(value, 0.01)));
      booked = 0; natural = 0;
    }
    const gain = value * (realised - base);
    bonus += gain;
    detail.push({ tag: w.tag, kind: w.kind, have: P, typical: w.kind === 'per_event' ? typical(w.tag) : null, gain, note: w.note });
    if (t && fromOthers > 0) {
      for (const [pid, wgt] of t.by) {
        if (pid === card.id) continue;
        links.push({ from: pid, to: card.id, tag: w.tag, value: gain * (wgt / t.total), note: w.note });
      }
    }
    if (!t || fromOthers <= 0) links.push({ from: null, to: card.id, tag: w.tag, value: gain, note: w.note, missing: true });
  }
  // keep one card's swing readable: at most +1.5 per cost from partners, at most half its value lost
  const b = b0;
  const hi = SYNERGY_CAP * (card.C || 1), lo = -0.5 * Math.max(b.practicalV || 0, 1);
  const capped = Math.max(lo, Math.min(hi, bonus));
  if (capped !== bonus && bonus) { const f = capped / bonus; links.forEach((l) => { l.value *= f; }); detail.forEach((d) => { d.gain *= f; }); }
  return { bonus: capped, links, detail };
}

function deckEntries(deck, idx) {
  const out = [];
  const champ = deck.champion ? idx.byId.get(deck.champion) : null;
  if (champ) out.push({ card: champ, n: 1 + (deck.main[champ.id] || 0), champion: true });
  for (const [id, n] of Object.entries(deck.main)) {
    if (champ && id === champ.id) continue;
    const c = idx.byId.get(id);
    if (c) out.push({ card: c, n });
  }
  return out;
}

const ROLE_TARGETS = { removal: 6, interaction: 3, draw: 4, early_body: 8, finisher: 2, engine: 3 };
const SATURATE = { ramp: 4, removal: 12, draw: 9, protection: 6, combat_trick: 8 };  // past this, more of the same helps little
const UNIT_TARGET = 20;   // units (with the champion) a deck needs to conquer and hold battlefields
const CURVE_TARGET = { 0: 0, 1: 4, 2: 9, 3: 8, 4: 7, 5: 5, 6: 4, 7: 3 };
const bucket = (c) => Math.min(7, c.E);
const roleSet = (c) => new Set([...(c.model?.r || []), ...(c.model?.r?.includes('cantrip') ? ['draw'] : [])]);

/** Full analysis of the current deck. */
export function analyze(deck, idx) {
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  const bfs = deck.bf.map((id) => idx.byId.get(id)).filter(Boolean);
  const entries = deckEntries(deck, idx);
  const table = providerTable(entries, legend, bfs);
  const rows = entries.map(({ card, n, champion }) => {
    const b = baseValue(card);
    const s = synergy(card, n, table);
    const deckV = b.practicalV === null ? null : b.practicalV + s.bonus;
    const gw = card.type === 'Gear' ? GEAR_WEIGHT : 1;
    return { card, n, champion: !!champion, ...b, bonus: s.bonus, links: s.links, detail: s.detail, deckV, deckAmber: deckV === null ? null : deckV / card.C,
      surplus: deckV === null ? null : (deckV - card.C) * gw, practicalSurplus: b.practicalV === null ? null : (b.practicalV - card.C) * gw };
  });
  const legendFit = legend ? synergy(legend, 1, table) : null;

  const weigh = (key) => {
    const xs = rows.filter((r) => r[key] !== null && r[key] !== undefined);
    const n = xs.reduce((a, r) => a + r.n, 0);
    return n ? xs.reduce((a, r) => a + r[key] * r.n, 0) / n : null;
  };
  const curve = {};
  const power = {};
  const roles = Object.fromEntries(Object.keys(ROLE_TARGETS).map((k) => [k, 0]));
  for (const r of rows) {
    curve[bucket(r.card)] = (curve[bucket(r.card)] || 0) + r.n;
    power[Math.min(r.card.P, 3)] = (power[Math.min(r.card.P, 3)] || 0) + r.n;
    const rs = roleSet(r.card);
    if (r.card.type === 'Unit' && r.card.C <= 2) rs.add('early_body');
    for (const k of Object.keys(roles)) if (rs.has(k)) roles[k] += r.n;
  }
  const pairs = new Map();
  for (const r of rows) for (const l of r.links) {
    if (!l.from || l.value <= 0.05) continue;
    const key = `${l.from}>${l.to}`;
    const p = pairs.get(key) || { from: l.from, to: l.to, value: 0, tags: new Set(), notes: new Set() };
    p.value += l.value; p.tags.add(l.tag); if (l.note) p.notes.add(l.note);
    pairs.set(key, p);
  }
  const misfits = rows.filter((r) => r.bonus < -0.4).sort((a, b) => a.bonus - b.bonus);
  const metrics = {
    ledger: weigh('ledger'), practical: weigh('practical'), inDeck: weigh('deckAmber'),
    synergyTotal: rows.reduce((a, r) => a + Math.max(0, r.bonus) * r.n, 0),
    unscored: rows.filter((r) => r.deckAmber === null).reduce((a, r) => a + r.n, 0),
    count: rows.reduce((a, r) => a + r.n, 0),
    avgEnergy: rows.length ? rows.reduce((a, r) => a + r.card.E * r.n, 0) / Math.max(1, rows.reduce((a, r) => a + r.n, 0)) : 0,
    curve, power, roles,
    units: rows.filter((r) => r.card.type === 'Unit').reduce((a, r) => a + r.n, 0),
    roleAll: rows.reduce((acc, r) => { for (const k of roleSet(r.card)) acc[k] = (acc[k] || 0) + r.n; return acc; }, {}),
  };
  return { legend, rows, table, pairs: [...pairs.values()].sort((a, b) => b.value - a.value), misfits, metrics, legendFit };
}

/** Value a candidate would bring: its own in-deck value plus what it adds to cards already in the deck. */
export function marginal(card, analysis, deck) {
  const n = copiesOf(deck, card.id) + 1;
  const b = baseValue(card);
  if (b.practicalV === null) return null;
  const own = synergy(card, n, analysis.table);
  let given = 0;
  const helps = [];
  const prov = providesOf(card);
  for (const r of analysis.rows) {
    for (const w of wantsOf(r.card)) {
      const k = prov.get(w.tag);
      if (!k) continue;
      const t = analysis.table.get(w.tag);
      const P = t ? t.total : 0;
      const fn = realise[w.kind] || realise.if_any;
      const value = Math.min(w.value, POINT_CAP);
      const d = value * (fn(P + k, w.cap, value, w.tag) - fn(P, w.cap, value, w.tag)) * r.n;
      if (d > 0.02) { given += d; helps.push({ id: r.card.id, tag: w.tag, value: d }); }
    }
  }
  const deckV = b.practicalV + own.bonus;
  const gw = card.type === 'Gear' ? GEAR_WEIGHT : 1;
  const ratioW = (x) => (x === null || x === undefined ? x : card.type === 'Gear' ? 1 + (x - 1) * GEAR_WEIGHT : x);
  return { card, ...b, own: own.bonus, given, helps: helps.filter((h) => h.value > 0.25).sort((a, b2) => b2.value - a.value), deckV, deckAmber: deckV / card.C,
    rank: { ledger: ratioW(b.ledger), practical: ratioW(b.practical), deck: ratioW(deckV / card.C) },
    surplus: (deckV - card.C) * gw, practicalSurplus: (b.practicalV - card.C) * gw, ledgerSurplus: ((b.ledgerV ?? b.practicalV) - card.C) * gw };
}

/** Cards that may legally go into this deck. */
export function candidatePool(deck, idx) {
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  if (!legend) return [];
  return idx.cards.filter((c) => ['Unit', 'Spell', 'Gear'].includes(c.type) && !c.token && !c.banned && c.C > 0
    && inDomains(c, legend) && copiesOf(deck, c.id) < 3
    && (c.supertype !== 'Signature' || isSignatureFor(c, legend)));
}

export const NEED = {
  role(card, metrics) {
    const rs = roleSet(card);
    if (card.type === 'Unit' && card.C <= 2) rs.add('early_body');
    let s = 0;
    for (const [k, target] of Object.entries(ROLE_TARGETS)) if (rs.has(k)) s += Math.max(0, target - (metrics.roles[k] || 0)) / target;
    for (const [k, cap] of Object.entries(SATURATE)) if (rs.has(k) && (metrics.roleAll?.[k] || 0) >= cap) s -= 0.6 * ((metrics.roleAll[k] - cap) / cap + 0.5);
    return s;
  },
  /** Units are the body of the deck: reward units while short of the target, discourage everything else then. */
  structure(card, metrics) {
    const short = Math.max(0, UNIT_TARGET - (metrics.units || 0)) / UNIT_TARGET;
    if (card.type === 'Unit') return 1.6 * short;
    return short > 0.35 ? -0.8 * short : 0;
  },
  curve(card, metrics) {
    const b = bucket(card);
    const have = metrics.curve[b] || 0;
    const want = CURVE_TARGET[b] ?? 3;
    const topEnd = card.E > 8 ? 0.25 * (card.E - 8) : 0; // a 12-energy card is not a 7-energy card
    return Math.max(-1.5, (want - have) / Math.max(want, 1) - topEnd);
  },
  roleNames: Object.keys(ROLE_TARGETS),
  ROLE_TARGETS, CURVE_TARGET,
};
