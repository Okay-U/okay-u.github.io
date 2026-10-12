// How the deck panel lays out the main deck: card thumbnails, rows or Moxfield-style stacks, grouping, sorting, and
// whether value bars show. The choice is a per-browser preference.
const KEY = 'riftcount.deckboard.view';
const TYPE_ORDER = ['Unit', 'Spell', 'Gear'];

export const GROUPS = [['type', 'Type'], ['energy', 'Energy'], ['domain', 'Domain'], ['none', 'No groups']];
export const SORTS = [['cost', 'Energy'], ['power', 'Power'], ['name', 'Name'], ['ledger', 'Ledger'], ['deck', 'In deck']];

export const VIEWS = [['cards', 'Cards'], ['rows', 'Rows'], ['stacks', 'Stacks']];
const DEFAULTS = { view: 'cards', group: 'type', sort: 'cost', collapsed: [], values: true };

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      view: p.view === 'list' ? 'rows' : VIEWS.some(([k]) => k === p.view) ? p.view : DEFAULTS.view,
      values: typeof p.values === 'boolean' ? p.values : DEFAULTS.values,
      group: GROUPS.some(([k]) => k === p.group) ? p.group : DEFAULTS.group,
      sort: SORTS.some(([k]) => k === p.sort) ? p.sort : DEFAULTS.sort,
      collapsed: Array.isArray(p.collapsed) ? p.collapsed.filter((x) => typeof x === 'string').slice(0, 40) : [],
    };
  } catch { return { ...DEFAULTS }; }
}

export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: preference lasts for this visit */ }
}

const groupOf = {
  type: (c) => [TYPE_ORDER.indexOf(c.type), c.type === 'Gear' ? 'Gear' : `${c.type}s`],
  energy: (c) => [Math.min(c.E, 7), c.E >= 7 ? '7+ energy' : `${c.E} energy`],
  domain: (c) => [c.domains.length > 1 ? 9 : ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'].indexOf(c.domains[0]), c.domains.join(' / ') || 'Colorless'],
  none: () => [0, 'All cards'],
};

/** Split [card, n] entries into ordered groups: [{ key, label, list: [[card, n], ...], count }]. */
export function groupEntries(entries, { group, sort }, valueOf) {
  const by = new Map();
  for (const e of entries) {
    const [rank, label] = (groupOf[group] || groupOf.type)(e[0]);
    if (!by.has(label)) by.set(label, { key: `${group}:${label}`, label, rank, list: [] });
    by.get(label).list.push(e);
  }
  const v = (c) => valueOf(c) ?? -1;
  const cmp = {
    // Energy > Power > Name, Piltover's default deck order
    cost: ([a], [b]) => a.E - b.E || a.P - b.P || a.name.localeCompare(b.name),
    power: ([a], [b]) => a.P - b.P || a.E - b.E || a.name.localeCompare(b.name),
    name: ([a], [b]) => a.name.localeCompare(b.name),
    ledger: ([a], [b]) => (b.model?.L ?? -1) - (a.model?.L ?? -1) || a.name.localeCompare(b.name),
    deck: ([a], [b]) => v(b) - v(a) || a.name.localeCompare(b.name),
  }[sort] || ((x, y) => x[0].E - y[0].E);
  return [...by.values()].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .map((g) => ({ ...g, list: g.list.sort(cmp), count: g.list.reduce((s, [, n]) => s + n, 0) }));
}
