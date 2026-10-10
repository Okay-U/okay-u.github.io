// Boot and wiring. The deck (board) is the carried object; rooms change around it.
import { loadData } from './data.js';
import * as store from './store.js';
import { validate, blockReason, counts, LIMITS } from './rules.js';
import { hydrateFlaps } from './flap.js';
import { analyze, setPool } from './agent/engine.js';
import { createGallery } from './gallery.js';
import { createBoard } from './board.js';
import { createAgent } from './agent.js';
import { createTest } from './test.js';
import { createSheet } from './sheet.js';
import { exportText } from './text.js';
import { createLoupe } from './loupe.js';

const $ = (s) => document.querySelector(s);
const mobile = matchMedia('(max-width: 900px)');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ROOM_ORDER = ['build', 'analyze', 'test'];

let idx, gallery, board, agent, test, sheet;
let analysis = null;
let room = 'build';
let mobileView = 'build';

const toastEl = $('#toast');
let toastTimer;
function toast(msg, bad = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('bad', bad);
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), bad ? 3600 : 2200);
}

async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Copy failed. Select the text and copy it by hand.', true); }
}

function setRoom(next, { force = false } = {}) {
  if (next === room && !force) return;
  const prev = room;
  room = next;
  document.querySelectorAll('.rooms [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.room === next)));
  const out = $(`#room-${prev}`), inn = $(`#room-${next}`);
  inn.hidden = false;
  const dir = ROOM_ORDER.indexOf(next) > ROOM_ORDER.indexOf(prev) ? 1 : -1;
  if (!reduced() && out !== inn) {
    out.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-28 * dir}px)`, opacity: 0 }], { duration: 160, easing: 'cubic-bezier(.55,0,.75,.2)' })
      .finished.then(() => { if (room !== prev) out.hidden = true; });
    inn.animate([{ transform: `translateX(${36 * dir}px)`, opacity: 0, clipPath: `inset(0 ${dir > 0 ? 0 : 30}% 0 ${dir > 0 ? 30 : 0}%)` },
      { transform: 'none', opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
  } else if (out !== inn) out.hidden = true;
  if (next === 'test') test.render(analysis);
}

function setMobileView(v) {
  mobileView = v;
  document.querySelectorAll('.dock button').forEach((b) => (b.dataset.dock === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  const boardEl = $('#board');
  if (v === 'board') {
    boardEl.classList.remove('away');
    if (!reduced()) boardEl.animate([{ transform: 'translateY(22px)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)' });
  } else {
    boardEl.classList.add('away');
    setRoom(v);
  }
}

function refresh(animate = true) {
  const deck = store.getDeck();
  analysis = deck.legend ? analyze(deck, idx) : null;
  gallery.setAnalysis(analysis, deck);
  board.render(analysis);
  gallery.repaint(animate);
  if (room === 'test') test.render(analysis);
  const name = $('#deck-name');
  if (document.activeElement !== name) name.value = deck.name;
  const v = validate(deck, idx);
  const lamp = $('#legal-lamp');
  lamp.className = `lamp-status ${v.status === 'legal' ? 'ok' : v.status === 'illegal' ? 'bad' : v.status === 'building' ? 'warn' : ''}`;
  lamp.querySelector('span').textContent = v.status === 'legal' ? 'Legal' : v.status === 'illegal' ? `${v.issues.filter((i) => i.sev === 'bad').length} problem${v.issues.filter((i) => i.sev === 'bad').length > 1 ? 's' : ''}` : v.status === 'building' ? 'Building' : 'Pick a legend';
  lamp.title = v.issues.map((i) => i.text).join('\n');
  $('#dock-count').textContent = counts(deck).main;
}

function addCard(id, zone = 'main') {
  const c = idx.byId.get(id);
  const deck = store.getDeck();
  if (!c) return;
  if (zone === 'champion') { toast('The chosen champion is a single card.'); return; }
  if (zone === 'bf' || zone === 'runes') { gallery.setZone(zone); setRoom('build'); return; }
  const why = blockReason(deck, c, idx);
  if (why) { toast(why, true); return; }
  if (zone === 'side' && counts(deck).side >= LIMITS.side) { toast('The sideboard holds ten cards.', true); return; }
  store.update((d) => { d[zone][id] = (d[zone][id] || 0) + 1; }, 'add');
}

function removeCard(id, zone = 'main') {
  const deck = store.getDeck();
  if (zone === 'champion') {
    if (deck.main[id]) store.update((d) => { d.main[id] -= 1; }, 'remove');
    else store.update((d) => { d.champion = null; }, 'remove');
    return;
  }
  if (zone === 'bf') { board.exitRow(id, 'bf').then(() => store.update((d) => { d.bf = d.bf.filter((x) => x !== id); }, 'remove')); return; }
  if (!deck[zone]?.[id]) return;
  const last = deck[zone][id] === 1;
  (last ? board.exitRow(id, zone) : Promise.resolve()).then(() => store.update((d) => { d[zone][id] -= 1; }, 'remove'));
}

const ui = {
  toast, copy,
  analysis: () => analysis,
  openCard: (id) => sheet.card(id),
  addCard, removeCard,
  refresh,
  runAgent() { if (mobile.matches) setMobileView('analyze'); else setRoom('analyze'); agent.run(); },
  newDeck(seed) { store.newDeck(seed); gallery.autoZone(store.getDeck()); agent.clear(); },
  copyList() { copy(exportText(store.getDeck(), idx), 'Decklist copied.'); },
  showPartners(id) { gallery.showPartners(id); if (mobile.matches) setMobileView('build'); else setRoom('build'); toast(`Showing cards that feed or are fed by ${idx.byId.get(id)?.name}.`); },
  importList() { sheet.importSheet(); },
  goBuild(zone) { gallery.setZone(zone); if (mobile.matches) setMobileView('build'); else setRoom('build'); },
};

async function boot() {
  hydrateFlaps();
  $('#gallery').innerHTML = '<p class="empty-note">Loading the card gallery…</p>';
  try {
    idx = await loadData();
  } catch (e) {
    $('#gallery').innerHTML = `<p class="empty-note">The card data did not load (${String(e.message || e)}). Check the connection and reload.</p>`;
    return;
  }
  setPool(idx.cards);
  const { fromShare } = store.initStore();
  gallery = createGallery({ root: $('#gallery'), filtersEl: $('#filters'), idx, store, ui });
  board = createBoard({ root: $('#board'), idx, store, ui });
  agent = createAgent({ root: $('#agent'), idx, store, ui });
  test = createTest({ root: $('#test'), idx, store, ui });
  sheet = createSheet({ el: $('#sheet'), idx, store, ui });
  const loupe = createLoupe(idx);
  loupe.bind($('#gallery'), '.tile', (t) => t.dataset.id);
  loupe.bind($('#board'), '.row', (r) => r.dataset.id);

  store.subscribe((d, reason) => {
    refresh(true);
    if (reason === 'switch') gallery.autoZone(d);
  });
  gallery.autoZone(store.getDeck());
  refresh(false);
  if (fromShare) toast('Shared deck loaded and saved to your decks.');

  document.querySelectorAll('.rooms [role="tab"]').forEach((b) => b.addEventListener('click', () => setRoom(b.dataset.room)));
  document.querySelectorAll('.dock button').forEach((b) => b.addEventListener('click', () => setMobileView(b.dataset.dock)));
  if (mobile.matches) setMobileView('build');
  mobile.addEventListener('change', () => { $('#board').classList.remove('away'); if (mobile.matches) setMobileView(mobileView); });

  let tName;
  $('#deck-name').addEventListener('input', (e) => {
    clearTimeout(tName);
    const v = e.target.value.trim() || 'Untitled deck';
    tName = setTimeout(() => store.update((d) => { d.name = v; }, 'name'), 300);
  });
  $('#legal-lamp').addEventListener('click', () => {
    const v = validate(store.getDeck(), idx);
    toast(v.issues.length ? v.issues.slice(0, 3).map((i) => i.text).join(' ') : 'Legal for Standard.', v.status === 'illegal');
  });
  $('#btn-decks').addEventListener('click', () => sheet.decksSheet());
  $('#btn-import').addEventListener('click', () => sheet.importSheet());
  $('#btn-export').addEventListener('click', () => sheet.exportSheet());
  $('#btn-share').addEventListener('click', () => sheet.shareSheet(store.shareURL()));
  addEventListener('hashchange', () => { if (/#d=/.test(location.hash)) location.reload(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.target.closest('input, textarea')) { e.preventDefault(); if (!store.undo()) toast('Nothing to undo.'); }
    if (e.key === '/' && !e.target.closest('input, textarea')) { e.preventDefault(); document.querySelector('.search')?.focus(); }
  });
}

boot();
