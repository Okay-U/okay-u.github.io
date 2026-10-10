// Deck state, undo, saved decks (browser storage) and share links (URL hash). One deck is "current".
const KEY = 'riftcount.deckboard.v1';
const listeners = new Set();
const undoStack = [];

export const blankDeck = () => ({
  v: 1, id: `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: 'Untitled deck', legend: null, champion: null, main: {}, side: {}, bf: [], runes: {}, bench: [], updated: Date.now(),
});

let deck = blankDeck();
let saved = [];

function readStore() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function writeStore() {
  try { localStorage.setItem(KEY, JSON.stringify({ current: deck.id, decks: saved })); } catch { /* private mode: decks live in the URL only */ }
}

export function initStore() {
  const s = readStore();
  saved = Array.isArray(s?.decks) ? s.decks : [];
  const fromHash = decodeShare(location.hash);
  if (fromHash) {
    deck = { ...blankDeck(), ...fromHash, id: blankDeck().id };
    history.replaceState(null, '', location.pathname);
    persist();
    return { fromShare: true };
  }
  deck = saved.find((d) => d.id === s?.current) || saved[0] || blankDeck();
  return { fromShare: false };
}

export const getDeck = () => deck;
export const savedDecks = () => [...saved].sort((a, b) => b.updated - a.updated);
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function persist() {
  deck.updated = Date.now();
  const i = saved.findIndex((d) => d.id === deck.id);
  const hasContent = deck.legend || Object.keys(deck.main).length || deck.bf.length;
  if (i >= 0) saved[i] = deck; else if (hasContent) saved.push(deck);
  writeStore();
}

/** Apply a change. `fn` receives a copy and returns nothing; listeners get (deck, reason). */
export function update(fn, reason = 'edit') {
  undoStack.push(JSON.stringify(deck));
  if (undoStack.length > 60) undoStack.shift();
  const next = structuredClone(deck);
  fn(next);
  for (const zone of ['main', 'side']) for (const [k, v] of Object.entries(next[zone])) if (v <= 0) delete next[zone][k];
  for (const [k, v] of Object.entries(next.runes)) if (v <= 0) delete next.runes[k];
  deck = next;
  persist();
  listeners.forEach((l) => l(deck, reason));
}

export function undo() {
  const prev = undoStack.pop();
  if (!prev) return false;
  deck = JSON.parse(prev);
  persist();
  listeners.forEach((l) => l(deck, 'undo'));
  return true;
}

export function switchTo(id) {
  const d = saved.find((x) => x.id === id);
  if (!d) return;
  deck = structuredClone(d);
  undoStack.length = 0;
  writeStore();
  listeners.forEach((l) => l(deck, 'switch'));
}

export function newDeck(seed) {
  deck = { ...blankDeck(), ...(seed || {}), id: blankDeck().id };
  undoStack.length = 0;
  persist();
  listeners.forEach((l) => l(deck, 'switch'));
}

export function removeDeck(id) {
  saved = saved.filter((d) => d.id !== id);
  if (deck.id === id) deck = saved[0] ? structuredClone(saved[0]) : blankDeck();
  writeStore();
  listeners.forEach((l) => l(deck, 'switch'));
}

export function duplicateDeck(id) {
  const d = saved.find((x) => x.id === id);
  if (d) newDeck({ ...structuredClone(d), name: `${d.name} copy` });
}

// ---- share links: compact JSON, base64url in the hash ----
const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function shareURL(d = deck) {
  const pack = { n: d.name, l: d.legend, c: d.champion, m: d.main, s: d.side, b: d.bf, r: d.runes };
  return `${location.origin}${location.pathname}#d=${b64(JSON.stringify(pack))}`;
}

function decodeShare(hash) {
  const m = /#d=([A-Za-z0-9_-]+)/.exec(hash || '');
  if (!m) return null;
  try {
    const p = JSON.parse(unb64(m[1]));
    const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.entries(o).filter(([k, v]) => typeof k === 'string' && Number.isInteger(v) && v > 0 && v < 20)) : {});
    return {
      name: typeof p.n === 'string' ? p.n.slice(0, 60) : 'Shared deck',
      legend: typeof p.l === 'string' ? p.l : null, champion: typeof p.c === 'string' ? p.c : null,
      main: obj(p.m), side: obj(p.s), bf: Array.isArray(p.b) ? p.b.filter((x) => typeof x === 'string').slice(0, 6) : [], runes: obj(p.r),
    };
  } catch { return null; }
}
