// Riftbound deck codes: the shareable strings Piltover Archive and other Riftbound tools read and write.
//
// Ported to plain JavaScript from RiftboundDeckCodes 1.5.0 (format 1, versions 1-6),
// https://github.com/Piltover-Archive/RiftboundDeckCodes, Copyright 2025 PiltoverArchive,
// itself adapted from Riot Games' LoRDeckCodes. Licensed under the Apache License, Version 2.0
// (http://www.apache.org/licenses/LICENSE-2.0); distributed on an "AS IS" BASIS, WITHOUT WARRANTIES
// OR CONDITIONS OF ANY KIND. Changes: TypeScript types and the class wrapper removed, logic unchanged.

const FORMAT = 1;
const VERSION = 6;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const SET_MAP = { OGN: 0, OGS: 1, ARC: 2, SFD: 3, UNL: 4, VEN: 5, RAD: 6 };
const VARIANT_MAP = { '': 0, a: 1, s: 2, '*': 2, b: 3 };
const SET_BY_ID = Object.fromEntries(Object.entries(SET_MAP).map(([k, v]) => [v, k]));

function base32Encode(bytes) {
  let out = '', buf = 0, bits = 0;
  for (const b of bytes) {
    buf = (buf << 8) | b; bits += 8;
    while (bits >= 5) { bits -= 5; out += B32[(buf >> bits) & 31]; }
  }
  if (bits > 0) out += B32[(buf << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const out = [];
  let buf = 0, bits = 0;
  for (const ch of str) {
    const v = B32.indexOf(ch.toUpperCase());
    if (v < 0) throw new Error(`Invalid character in deck code: '${ch}'`);
    buf = (buf << 5) | v; bits += 5;
    while (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); }
  }
  return out;
}

function varint(value) {
  if (value === 0) return [0];
  const out = [];
  while (value !== 0) {
    let b = value & 127;
    value >>>= 7;
    if (value !== 0) b |= 128;
    out.push(b);
  }
  return out;
}

/** Byte reader with the LoR varint convention (least significant 7-bit group first). */
function reader(bytes) {
  let i = 0;
  return {
    byte() { if (i >= bytes.length) throw new Error(`Index out of bounds: ${i}`); return bytes[i++]; },
    varint() {
      let result = 0, shift = 0;
      while (i < bytes.length) {
        const b = bytes[i++];
        result |= (b & 127) << shift;
        if ((b & 128) !== 128) return result;
        shift += 7;
      }
      throw new Error('Byte array did not contain valid varints.');
    },
  };
}

function parseCardCode(code) {
  const parts = String(code).split('-');
  const m = parts.length === 2 && parts[0] ? /^((?:R|SP)?\d+)([a-z*]?)$/.exec(parts[1] || '') : null;
  if (!m) throw new Error(`Invalid card code format: ${code}. Expected format: SET-NUMBERvariant`);
  return { set: parts[0], number: m[1], variant: m[2] };
}

function resolveVariant(v, signed, label) {
  if (v === 2) return signed;
  const code = Object.keys(VARIANT_MAP).find((k) => VARIANT_MAP[k] === v);
  if (code === undefined) throw new Error(`Unknown variant code${label ? ` in ${label}` : ''}: ${v}`);
  return code;
}

function setCode(id, label) {
  const s = SET_BY_ID[id];
  if (!s) throw new Error(`Unknown set code${label ? ` in ${label}` : ''}: ${id}`);
  return s;
}

function groupBySetAndVariant(cards) {
  const groups = new Map();
  for (const c of cards) {
    const { set, number, variant } = parseCardCode(c.cardCode);
    const key = `${set}-${variant}`;
    if (!groups.has(key)) {
      if (SET_MAP[set] === undefined) throw new Error(`Unknown set: ${set}. Valid sets: ${Object.keys(SET_MAP).join(', ')}`);
      if (VARIANT_MAP[variant] === undefined) throw new Error(`Unknown variant: '${variant}'.`);
      groups.set(key, { set: SET_MAP[set], variant: VARIANT_MAP[variant], numbers: [] });
    }
    groups.get(key).numbers.push(number);
  }
  return [...groups.values()].sort((a, b) => a.set - b.set || a.variant - b.variant)
    .map((g) => ({ ...g, numbers: g.numbers.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) }));
}

/** Card number with its prefix flag byte (0x00 normal, 0x01 rune "R", 0x02 special "SP") when the deck is flagged. */
function numberBytes(number, flagged) {
  if (!flagged) return varint(parseInt(number, 10));
  if (number.startsWith('SP')) return [2, ...varint(parseInt(number.slice(2), 10))];
  if (number.startsWith('R')) return [1, ...varint(parseInt(number.slice(1), 10))];
  return [0, ...varint(parseInt(number, 10))];
}

function readNumber(r, flagged, label) {
  if (!flagged) return String(r.varint()).padStart(3, '0');
  const flag = r.byte();
  const n = r.varint();
  if (flag === 2) return `SP${n}`;
  if (flag === 1) return `R${String(n).padStart(2, '0')}`;
  if (flag === 0) return String(n).padStart(3, '0');
  throw new Error(`Unknown number-prefix flag${label ? ` in ${label}` : ''}: ${flag}`);
}

function encodeSection(deck, maxCount, version) {
  const out = [];
  for (let count = maxCount; count >= 1; count--) {
    const groups = groupBySetAndVariant(deck.filter((c) => c.count === count));
    out.push(...varint(groups.length));
    for (const g of groups) {
      out.push(...varint(g.numbers.length), g.set, g.variant);
      // v4 always writes the flag byte; SP numbers never reach this path (they force v5)
      for (const n of g.numbers) out.push(...(version >= 4 ? numberBytes(n, true) : varint(parseInt(n, 10))));
    }
  }
  return out;
}

function decodeSection(r, maxCount, signed, version) {
  const deck = [];
  for (let count = maxCount; count >= 1; count--) {
    const groups = r.varint();
    for (let i = 0; i < groups; i++) {
      const n = r.varint();
      const set = setCode(r.byte());
      const variant = resolveVariant(r.byte(), signed);
      for (let j = 0; j < n; j++) {
        let num;
        if (version >= 4) {
          const isRune = r.byte();
          const v = r.varint();
          num = isRune === 1 ? `R${String(v).padStart(2, '0')}` : String(v).padStart(3, '0');
        } else num = String(r.varint()).padStart(3, '0');
        deck.push({ cardCode: `${set}-${num}${variant}`, count });
      }
    }
  }
  return deck;
}

function encodeSparse(deck, flagged) {
  const out = [];
  const counts = [...new Set(deck.filter((c) => c.count >= 1).map((c) => c.count))].sort((a, b) => b - a);
  out.push(...varint(counts.length));
  for (const count of counts) {
    const groups = groupBySetAndVariant(deck.filter((c) => c.count === count));
    out.push(...varint(count), ...varint(groups.length));
    for (const g of groups) {
      out.push(...varint(g.numbers.length), g.set, g.variant);
      for (const n of g.numbers) out.push(...numberBytes(n, flagged));
    }
  }
  return out;
}

function decodeSparse(r, signed, flagged) {
  const deck = [];
  const counts = r.varint();
  for (let i = 0; i < counts; i++) {
    const count = r.varint();
    const groups = r.varint();
    for (let g = 0; g < groups; g++) {
      const n = r.varint();
      const set = setCode(r.byte());
      const variant = resolveVariant(r.byte(), signed);
      for (let j = 0; j < n; j++) deck.push({ cardCode: `${set}-${readNumber(r, flagged)}${variant}`, count });
    }
  }
  return deck;
}

function encodeRef(code, flagged, label) {
  const { set, number, variant } = parseCardCode(code);
  if (SET_MAP[set] === undefined) throw new Error(`Unknown set in ${label}: ${set}`);
  if (VARIANT_MAP[variant] === undefined) throw new Error(`Unknown variant in ${label}: '${variant}'`);
  return [SET_MAP[set], VARIANT_MAP[variant], ...numberBytes(number, flagged)];
}

function decodeRef(r, flagged, signed, label) {
  const set = r.byte();
  const variant = r.byte();
  const num = readNumber(r, flagged, label);
  return `${setCode(set, label)}-${num}${resolveVariant(variant, signed, label)}`;
}

/**
 * Encode a deck. mainDeck / sideboard are [{ cardCode, count }]; the starting legend, battlefields and runes ride
 * in mainDeck as ordinary cards. chosenChampion is a card code; additionalLegends a list of card codes.
 */
export function getCodeFromDeck(mainDeck, sideboard = [], chosenChampion, additionalLegends = []) {
  for (const c of [...mainDeck, ...sideboard]) {
    if (!Number.isSafeInteger(c.count) || c.count < 1) throw new Error(`Invalid card count for ${c.cardCode}: ${c.count}.`);
  }
  const all = [...mainDeck.map((c) => c.cardCode), ...sideboard.map((c) => c.cardCode), ...(chosenChampion ? [chosenChampion] : []), ...additionalLegends];
  const needsV4 = all.some((c) => parseCardCode(c).number.startsWith('R'));
  const anySpecial = all.some((c) => parseCardCode(c).number.startsWith('SP'));
  const needsV5 = mainDeck.some((c) => c.count > 12) || sideboard.some((c) => c.count > 3);
  const version = additionalLegends.length ? 6 : needsV5 || anySpecial ? 5 : needsV4 ? 4 : 3;
  const flagged = needsV4 || anySpecial;
  const out = [(FORMAT << 4) | version];
  if (version >= 5) out.push(flagged ? 1 : 0, ...encodeSparse(mainDeck, flagged), ...encodeSparse(sideboard, flagged));
  else out.push(...encodeSection(mainDeck, 12, version), ...encodeSection(sideboard, 3, version));
  if (chosenChampion) out.push(1, ...encodeRef(chosenChampion, flagged, 'chosen champion'));
  else out.push(0);
  if (version >= 6) {
    out.push(...varint(additionalLegends.length));
    for (const l of additionalLegends) out.push(...encodeRef(l, flagged, 'additional legend'));
  }
  return base32Encode(out);
}

/** Decode a deck code into { mainDeck, sideboard, chosenChampion, additionalLegends }. Throws on malformed codes. */
export function getDeckFromCode(code, { signedSuffix = 's' } = {}) {
  const r = reader(base32Decode(String(code).trim()));
  const fv = r.byte();
  const format = (fv >> 4) & 15, version = fv & 15;
  if (format !== FORMAT) throw new Error(`Unsupported format: ${format}. Expected format: ${FORMAT}`);
  if (version > VERSION) throw new Error(`Unsupported version: ${version}. Maximum supported version: ${VERSION}`);
  let flagged;
  if (version >= 5) {
    const p = r.byte();
    if (p > 1) throw new Error(`Unsupported deck prefix flag: ${p}`);
    flagged = p === 1;
  } else flagged = version >= 4;
  let mainDeck, sideboard = [];
  if (version >= 5) { mainDeck = decodeSparse(r, signedSuffix, flagged); sideboard = decodeSparse(r, signedSuffix, flagged); }
  else {
    mainDeck = decodeSection(r, 12, signedSuffix, version);
    if (version >= 2) sideboard = decodeSection(r, 3, signedSuffix, version);
  }
  let chosenChampion;
  if (version >= 3 && r.byte() === 1) chosenChampion = decodeRef(r, flagged, signedSuffix, 'champion');
  let additionalLegends;
  if (version >= 6) {
    const n = r.varint();
    additionalLegends = [];
    for (let i = 0; i < n; i++) additionalLegends.push(decodeRef(r, flagged, signedSuffix, 'additional legend'));
  }
  return { mainDeck, sideboard, chosenChampion, additionalLegends };
}
