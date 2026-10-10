// Card index built from the daily Riot gallery feed (/cards.json) plus the value model (data/model.json).
export const DOMAINS = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'];
export const DOMAIN_CLASS = Object.fromEntries(DOMAINS.map((d) => [d, d.toLowerCase()]));
export const SETS = { OGN: 'Origins', OGS: 'Proving Grounds', SFD: 'Spiritforged', UNL: 'Unleashed', VEN: 'Vendetta', RAD: 'Radiance' };

// Standard constructed bans, Riot rules page (updated 2026-09-18).
const BANNED = ['Called Shot', 'Ekko - Recurrent', 'Draven - Vanquisher', 'Fight or Flight', 'Scrapheap', 'Stealthy Pursuer',
  'Stacked Deck', "The Arena's Greatest", "Aspirant's Climb", 'The Dreaming Tree', 'Dreaming Tree', 'Obelisk of Power', "Reaver's Row"];

export const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/\s*[-,–]\s*/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const BANNED_N = new Set(BANNED.map(norm));
const baseName = (n) => n.replace(/\s*\((Alternate Art|Overnumbered|Signature)\)\s*$/, '').trim();
const code = (i) => i.public_code.split('/')[0].replace(/[a*]+$/, '');
const GEAR_TEXT = /\[Deploy\]|When I become exhausted|When you play this,|\bkill this\b|\bthis gear\b|(^|\n)(Exhaust|Kill this)[^\n]*:/i;

function previewType(t, might, text) {
  const equipment = text.includes('[Equip]') || text.startsWith('Equip ');
  if (might !== null && might !== undefined && !(t === 'Gear' && equipment)) return 'Unit';
  if (t === 'Gear') return t;
  return GEAR_TEXT.test(text.replace(/\([^)]*\)/g, '')) ? 'Gear' : 'Spell';
}

function rank(i) {
  const m = i.metadata || {};
  return [m.alternate_art ? 1 : 0, m.signature ? 1 : 0, m.overnumbered ? 1 : 0, i.public_code].join('|');
}

/** Turn the feed into one entry per distinct card. */
export function buildIndex(feed, model) {
  const groups = new Map();
  for (const i of feed.items) {
    const cls = i.classification || {};
    let type = cls.type;
    if (!type && i.attributes?.energy === null) continue;
    if (i.unreleased && i.attributes?.energy !== null && ['Unit', 'Spell', 'Gear', undefined, null].includes(type)) {
      type = previewType(type || null, i.attributes.might, i.text?.plain || '');
    }
    if (!type) continue;
    const key = `${baseName(i.name)}|${type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ i, type });
  }
  const cards = [];
  for (const prints of groups.values()) {
    prints.sort((a, b) => rank(a.i).localeCompare(rank(b.i)));
    const { i, type } = prints[0];
    const at = i.attributes || {};
    const cls = i.classification || {};
    const name = baseName(i.name);
    const id = code(i);
    const E = at.energy || 0, P = at.power || 0;
    const champ = name.includes(' - ') ? name.split(' - ')[0] : null;
    const m = model.cards?.[id] || null;
    cards.push({
      id, name, display: name.replace(' - ', ', '), type, supertype: cls.supertype || null,
      domains: cls.domain || [], rarity: cls.rarity, set: i.set?.set_id, setLabel: i.set?.label,
      E, P, C: E + 2 * P, might: at.might ?? null, mightBonus: at.might_bonus ?? null,
      text: i.text?.plain || '', tags: i.tags || [], champ,
      image: i.media?.image_url || '', preview: !!i.unreleased,
      codes: prints.map((p) => code(p.i)),
      banned: BANNED_N.has(norm(name)),
      token: cls.supertype === 'Token',
      landscape: type === 'Battlefield',
      model: m,
      num: i.collector_number || 0,
    });
  }
  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const c of cards) for (const k of c.codes) if (!byId.has(k)) byId.set(k, c);
  const byName = new Map();
  for (const c of cards) {
    byName.set(norm(c.name), c);
    if (!byName.has(norm(c.display))) byName.set(norm(c.display), c);
  }
  return { cards, byId, byName, modelMeta: model.meta || null };
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'default' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

export async function loadData() {
  const [feed, model] = await Promise.all([
    getJSON('/cards.json'),
    getJSON('data/model.json').catch(() => ({ cards: {} })),
  ]);
  return buildIndex(feed, model);
}

/** Image URL at a given width (Riot's image CDN resizes and serves WebP). */
export const img = (c, w = 360) => (c?.image ? `${c.image}&w=${w}&fm=webp` : '');

/** Legend's champion name, e.g. "Kai'Sa" for "Kai'Sa - Daughter of the Void". */
export const legendChampion = (legend) => legend?.champ || null;

export const isMainCard = (c) => ['Unit', 'Spell', 'Gear'].includes(c.type) && !c.token;
export const isChampionFor = (c, legend) => !!legend && c.type === 'Unit' && c.supertype === 'Champion'
  && (c.champ === legend.champ || c.tags.includes(legend.champ));
export const isSignatureFor = (c, legend) => c.supertype === 'Signature' && !!legend
  && (c.tags.includes(legend.champ) || c.name.endsWith(` - ${legend.champ}`));
