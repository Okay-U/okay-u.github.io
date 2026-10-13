// Riot's card symbols (from the card gallery, the same set the Riftcount app bundles): domain runes, energy 0-12,
// might, exhaust, colorless, champion and the card types. Colour symbols render as images; the white ones are masks
// tinted with the text colour, so they follow the surrounding type.
import { DOMAIN_CLASS, esc } from './data.js';

const BASE = new URL('../glyphs/', import.meta.url).href;
const COLOUR = /^(energy_\d+|rune_)/;
const TYPES = ['unit', 'spell', 'gear', 'legend', 'battlefield', 'rune'];

/** One symbol as HTML; with a label it is announced, without one it is decoration. */
export function glyph(name, label = '') {
  const src = `${BASE}${name}.svg`;
  if (COLOUR.test(name)) return `<img class="g" src="${src}" alt="${esc(label)}" draggable="false">`;
  return `<i class="g m" style="--g:url('${src}')" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}></i>`;
}

/** Energy symbol carrying its own number, as on the card; above twelve the number is set as text. */
export const energyGlyph = (n, label = '') => {
  const e = Math.max(0, Math.trunc(Number(n) || 0));
  return e <= 12 ? glyph(`energy_${e}`, label) : `<b class="gnum">${e}</b>`;
};

/** Domain rune; colorless for anything outside the six domains. */
export const runeGlyph = (domain, label = '') => glyph(DOMAIN_CLASS[domain] ? `rune_${DOMAIN_CLASS[domain]}` : 'colorless', label);

/** Card type symbol, empty for unknown types. */
export const typeGlyph = (type, label = '') => (TYPES.includes(String(type).toLowerCase()) ? glyph(`type_${String(type).toLowerCase()}`, label) : '');

/** Power cost as rune symbols of the card's first domain (as printed), or the rune type symbol with a count. */
export function powerGlyphs(card) {
  const p = Math.max(0, Math.trunc(Number(card.P) || 0));
  if (!p) return '';
  return p <= 3 && DOMAIN_CLASS[card.domains[0]] ? runeGlyph(card.domains[0]).repeat(p) : `${glyph('type_rune')}<b class="gnum">${p}</b>`;
}

/** Energy, power and type of a playable card as one inline run of symbols, with a screen reader label. */
export const costGlyphs = (card) =>
  `<span class="gcost" role="img" aria-label="${esc(`${card.E} energy${card.P ? `, ${card.P} power` : ''}`)}">${energyGlyph(card.E)}${powerGlyphs(card)}</span>`;

const TOKEN = { might: 'might', exhaust: 'exhaust', rune_rainbow: 'any rune', colorless: 'colorless' };
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m;
  const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
});

/** Symbol for a `:rb_*:` token body, or null when the token is unknown. */
function tokenGlyph(t) {
  if (TOKEN[t]) return glyph(t, TOKEN[t]);
  const rune = /^rune_(fury|calm|mind|body|chaos|order)$/.exec(t);
  if (rune) return glyph(t, `${rune[1][0].toUpperCase()}${rune[1].slice(1)} rune`);
  const en = /^energy_(\d{1,2})$/.exec(t);
  if (en && +en[1] <= 12) return glyph(t, `${+en[1]} energy`);
  return null;
}

/** Escaped text with symbol tokens as glyphs and [Keywords] in bold. */
function inline(text) {
  let out = '', last = 0;
  for (const m of text.matchAll(/:rb_([a-z0-9_]+):|\[([^\]\n]{1,40})\]/g)) {
    out += esc(text.slice(last, m.index));
    out += m[1] !== undefined ? tokenGlyph(m[1]) ?? esc(m[0]) : `<b class="kw">${esc(m[2])}</b>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

/**
 * Card ability text from the gallery HTML (`text.rich`). Only paragraphs, line breaks and lists survive; every other
 * tag is dropped and all text is escaped, so the feed can never inject markup. Falls back to the plain text.
 */
export function richText(html, plain = '') {
  if (!html) return plain ? `<p>${String(plain).split('\n').map(inline).join('<br>')}</p>` : '';
  let out = '';
  // split with a capture group: odd parts are the tags, even parts the text between them
  String(html).split(/(<[^>]*>)/).forEach((part, i) => {
    if (i % 2 === 0) { out += inline(decode(part)); return; }
    const tag = part.slice(1, -1).trim().toLowerCase().replace(/\s*\/$/, '').split(/\s/)[0];
    if (['p', '/p', 'ul', '/ul', 'li', '/li'].includes(tag)) out += `<${tag}>`;
    else if (tag === 'br') out += '<br>';
  });
  return out;
}
