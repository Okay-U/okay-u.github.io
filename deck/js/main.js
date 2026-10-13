// Boot and wiring. The deck panel (Deck, Stats, Hand, Coach tabs) sits beside the gallery; on phones it is a bottom
// sheet over the gallery with a peek bar.
import { loadData, isMainCard, img, esc } from './data.js';
import * as store from './store.js';
import { validate, counts, addRoom, shiftRunes, LIMITS } from './rules.js';
import { analyze, setPool } from './agent/engine.js';
import { createGallery } from './gallery.js';
import { createBoard } from './board.js';
import { createAgent } from './agent.js';
import { createTest } from './test.js';
import { createSheet } from './sheet.js';
import { exportText, importCode } from './text.js';
import { createLayout } from './layout.js';
import { fmtRatio } from './num.js';
import { createMenu } from './menu.js';

const $ = (s) => document.querySelector(s);
const mobile = matchMedia('(max-width: 900px)');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const TABS = ['deck', 'stats', 'hand', 'coach'];

let idx, gallery, board, agent, test, sheet;
let analysis = null;
let tab = 'deck';

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

/** Show a deck panel tab (ARIA tabs: roving tabindex, panels hidden). */
function setTab(next, { focus = false } = {}) {
  if (!TABS.includes(next)) return;
  const changed = next !== tab;
  tab = next;
  for (const t of TABS) {
    const on = t === next;
    const b = $(`#tab-${t}`);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    $(`#pane-${t}`).hidden = !on;
  }
  if (focus) $(`#tab-${next}`).focus();
  if (next === 'stats' || next === 'hand') test.render(analysis);
  if (changed) {
    $('#deckpanel').scrollTo({ top: 0 });
    if (!reduced()) $(`#pane-${next}`).animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  }
}

/** Phones: the deck panel is a bottom sheet; the peek bar opens and closes it. */
function setSheet(open) {
  document.body.classList.toggle('sheet-open', open);
  $('#peek').setAttribute('aria-expanded', String(open));
  // a closed sheet sits off screen: keep its controls out of the tab and screen reader order
  const shut = mobile.matches && !open;
  document.querySelectorAll('#deckpanel > .tabbar, #deckpanel > .pane').forEach((el) => { el.inert = shut; });
  if (open) $('#deckpanel').scrollTo({ top: 0 });
}
const sheetOpen = () => document.body.classList.contains('sheet-open');

function refresh(animate = true) {
  const deck = store.getDeck();
  analysis = deck.legend ? analyze(deck, idx) : null;
  gallery.setAnalysis(analysis, deck);
  board.render(analysis);
  gallery.repaint(animate);
  if (tab === 'stats' || tab === 'hand') test.render(analysis);
  const name = $('#deck-name');
  if (document.activeElement !== name) name.value = deck.name;
  const v = validate(deck, idx);
  const bad = v.issues.filter((i) => i.sev === 'bad').length;
  const label = v.status === 'legal' ? 'Legal' : v.status === 'illegal' ? `${bad} problem${bad > 1 ? 's' : ''}` : v.status === 'building' ? 'Building' : 'Pick a legend';
  const lamp = $('#legal-lamp');
  lamp.className = `status ${v.status === 'legal' ? 'ok' : v.status === 'illegal' ? 'bad' : v.status === 'building' ? 'warn' : ''}`;
  lamp.querySelector('span').textContent = label;
  lamp.title = v.issues.map((i) => i.text).join('\n');
  // peek bar (phones)
  const n = counts(deck);
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  $('#peek-name').textContent = deck.name;
  $('#peek-line').textContent = legend ? `${n.main}/${LIMITS.main} cards · ${label}${analysis?.metrics.inDeck != null ? ` · value ${fmtRatio(analysis.metrics.inDeck)}` : ''}` : 'Pick a legend to start';
  $('#peek-thumb').innerHTML = legend ? `<img alt="" src="${esc(img(legend, 100))}">` : '';
}

const ZONE_NAME = { main: 'the main deck', side: 'the sideboard', bench: 'the bench' };
const CARD_ZONES = ['main', 'side', 'bench'];

/** addRoom with the reason toasted when nothing fits. */
function fits(deck, c, zone, want, counted = 0) {
  const { n, why } = addRoom(deck, c, zone, want, idx, counted);
  if (why) toast(why, true);
  return n;
}

/** Add `n` copies (one by default, three with `playset`), as many as the rules allow. */
function addCard(id, zone = 'main', { playset = false, n: want = playset ? LIMITS.copies : 1, quiet = false } = {}) {
  const c = idx.byId.get(id);
  const deck = store.getDeck();
  if (!c) return;
  if (zone === 'champion') { toast('The chosen champion is a single card.'); return; }
  if (zone === 'bf' || zone === 'runes') { ui.goBuild(zone); return; }
  if (!CARD_ZONES.includes(zone) || !isMainCard(c)) return;
  const n = fits(deck, c, zone, Math.max(1, Math.min(LIMITS.copies, Math.trunc(want) || 1)));
  if (n > 0) store.update((d) => { d[zone][c.id] = (d[zone][c.id] || 0) + n; }, 'add');
  if (n > 1 && !quiet) toast(`${n} × ${c.name} to ${ZONE_NAME[zone]}.`);
  return Math.max(0, n);
}

/** Move copies of a card (all by default) between main, sideboard and bench, as many as the rules allow. */
function moveCard(id, from, to, { n: want = Infinity } = {}) {
  const deck = store.getDeck();
  const c = idx.byId.get(id);
  if (!c || from === to || !CARD_ZONES.includes(from) || !CARD_ZONES.includes(to)) return;
  const have = Math.min(deck[from][c.id] || 0, want);
  if (!have) return;
  const n = fits(deck, c, to, have, from === 'bench' ? 0 : have);
  if (n <= 0) return;
  store.update((d) => { d[from][c.id] -= n; d[to][c.id] = (d[to][c.id] || 0) + n; }, 'move');
  toast(`${n} × ${c.name} to ${ZONE_NAME[to]}.`);
}

/** Add (+1) or take out (-1) a rune; at twelve it trades with the other domain (rules.js shiftRunes). */
function shiftRune(dm, delta) {
  const deck = store.getDeck();
  const legend = deck.legend ? idx.byId.get(deck.legend) : null;
  const next = shiftRunes(deck.runes, legend?.domains || Object.keys(deck.runes), dm, delta);
  if (!next) { if (delta > 0) toast(`All twelve runes are ${dm} already.`); return; }
  store.update((d) => { d.runes = next; }, 'runes');
}

/** Take one copy out of a zone, or every copy with `all`. */
function removeCard(id, zone = 'main', { all = false } = {}) {
  const deck = store.getDeck();
  if (![...CARD_ZONES, 'champion', 'bf'].includes(zone) || !idx.byId.has(id)) return;
  if (all && CARD_ZONES.includes(zone)) {
    if (deck[zone]?.[id] > 0) board.exitRow(id, zone).then(() => store.update((d) => { delete d[zone][id]; }, 'remove'));
    return;
  }
  if (zone === 'champion') {
    if (deck.champion !== id) return;
    if (deck.main[id]) store.update((d) => { d.main[id] -= 1; }, 'remove');
    else store.update((d) => { d.champion = null; }, 'remove');
    return;
  }
  if (zone === 'bf') {
    if (!deck.bf.includes(id)) return; board.exitRow(id, 'bf').then(() => store.update((d) => { d.bf = d.bf.filter((x) => x !== id); }, 'remove')); return; }
  if (!(deck[zone]?.[id] > 0)) return;
  const last = deck[zone][id] === 1;
  (last ? board.exitRow(id, zone) : Promise.resolve()).then(() => store.update((d) => { if (d[zone][id] > 0) d[zone][id] -= 1; }, 'remove'));
}

const ui = {
  toast, copy,
  analysis: () => analysis,
  openCard: (id) => sheet.card(id),
  addCard, removeCard, moveCard, shiftRune,
  getTarget: () => gallery?.target || 'main',
  setTarget(z) {
    gallery.setTarget(z);
    board.render(analysis);
    toast(`Gallery clicks now add to the ${z === 'main' ? 'main deck' : z === 'side' ? 'sideboard' : 'bench'}.`);
  },
  refresh,
  runAgent() { setTab('coach'); if (mobile.matches) setSheet(true); agent.run(); },
  newDeck(seed) { store.newDeck(seed); gallery.autoZone(store.getDeck()); agent.clear(); },
  copyList() { copy(exportText(store.getDeck(), idx), 'Decklist copied.'); },
  showPartners(id) { gallery.showPartners(id); if (mobile.matches) setSheet(false); toast(`Showing cards that feed or are fed by ${idx.byId.get(id)?.name}.`); },
  importList() { sheet.importSheet(); },
  goBuild(zone) { gallery.setZone(zone); if (mobile.matches) setSheet(false); },
};

async function boot() {
  $('#gallery').innerHTML = '<p class="empty-note">Loading the card gallery…</p>';
  try {
    idx = await loadData();
  } catch (e) {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = `The card data did not load (${String(e?.message || e)}). Check the connection and reload.`;
    $('#gallery').replaceChildren(p);
    return;
  }
  setPool(idx.cards);
  const { fromShare } = store.initStore(idx);
  gallery = createGallery({ root: $('#gallery'), filtersEl: $('#filters'), idx, store, ui });
  board = createBoard({ root: $('#board'), idx, store, ui });
  agent = createAgent({ root: $('#agent'), idx, store, ui });
  test = createTest({ statsRoot: $('#stats'), handRoot: $('#hand'), idx, store, ui });
  sheet = createSheet({ el: $('#sheet'), idx, store, ui });
  createLayout({ floor: $('#floor'), sizeMount: $('#filters .tslot') });

  store.subscribe((d, reason) => {
    refresh(true);
    if (reason === 'switch') { gallery.autoZone(d); agent.clear(); }
    if (reason === 'undo') gallery.render();
  });
  gallery.autoZone(store.getDeck());
  refresh(false);
  if (fromShare) toast('Shared deck loaded and saved to your decks.');
  // ?code=… opens a deck code (the format Piltover Archive shares) as a new deck
  const code = new URLSearchParams(location.search).get('code');
  if (code) {
    history.replaceState(null, '', location.pathname);
    try {
      const { deck, unresolved } = importCode(code, idx);
      ui.newDeck({ ...deck, name: 'Deck from code' });
      toast(unresolved.length ? `Deck code opened. ${unresolved.length} card${unresolved.length > 1 ? 's' : ''} not in the card data.` : 'Deck code opened as a new deck.', !!unresolved.length);
    } catch (e) { toast(`That deck code did not read: ${String(e?.message || e)}`, true); }
  }

  // deck panel tabs: click, or arrow keys along the tab list
  const tablist = $('.tabs');
  tablist.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  tablist.addEventListener('keydown', (e) => {
    const i = TABS.indexOf(tab);
    const next = { ArrowRight: TABS[(i + 1) % TABS.length], ArrowLeft: TABS[(i - 1 + TABS.length) % TABS.length], Home: TABS[0], End: TABS[TABS.length - 1] }[e.key];
    if (next) { e.preventDefault(); setTab(next, { focus: true }); }
  });
  // phone bottom sheet: tap the peek bar, or drag it up or down
  const peek = $('#peek');
  let drag = null, dragged = false;
  peek.addEventListener('pointerdown', (e) => { dragged = false; if (mobile.matches) drag = { y: e.clientY, moved: false }; });
  peek.addEventListener('pointermove', (e) => { if (drag && Math.abs(e.clientY - drag.y) > 8) drag.moved = true; });
  peek.addEventListener('pointerup', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    dragged = drag.moved;
    drag = null;
    if (dragged && Math.abs(dy) > 30) setSheet(dy < 0);
  });
  // a mouse drag ends in a click on the bar, which must not toggle the sheet straight back
  peek.addEventListener('click', (e) => {
    const skip = dragged && e.detail !== 0;
    dragged = false;
    if (!skip && mobile.matches) setSheet(!sheetOpen());
  });
  // Escape closes an open menu first (menu.js), the sheet only after that
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetOpen() && !$('#sheet').open && !e.defaultPrevented && !document.querySelector('.rmenu:not([hidden])')) setSheet(false);
  });
  mobile.addEventListener('change', () => setSheet(false));
  setSheet(false);

  let tName;
  $('#deck-name').addEventListener('input', (e) => {
    clearTimeout(tName);
    const v = e.target.value.trim().slice(0, 60) || 'Untitled deck';
    const id = store.getDeck().id;
    tName = setTimeout(() => { if (store.getDeck().id === id) store.update((d) => { d.name = v; }, 'name'); }, 300);
  });
  $('#legal-lamp').addEventListener('click', () => {
    const v = validate(store.getDeck(), idx);
    toast(v.issues.length ? v.issues.slice(0, 3).map((i) => i.text).join(' ') : 'Legal for Standard.', v.status === 'illegal');
  });
  $('#btn-decks').addEventListener('click', () => sheet.decksSheet());
  $('#btn-import').addEventListener('click', () => sheet.importSheet());
  $('#btn-export').addEventListener('click', () => sheet.exportSheet());
  $('#btn-share').addEventListener('click', () => sheet.shareSheet(store.shareURL()));
  // phones: the top bar keeps only the deck name and status; the rest sits behind ⋯
  const more = createMenu();
  $('#btn-more').addEventListener('click', (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    more.open([{ label: 'Your decks', run: () => sheet.decksSheet() }, { label: 'New deck', run: () => ui.newDeck() }, null,
      { label: 'Import', run: () => sheet.importSheet() }, { label: 'Export', run: () => sheet.exportSheet() }, { label: 'Share', run: () => sheet.shareSheet(store.shareURL()) }],
    b.right - 220, b.bottom + 6, { focus: e.detail === 0 });
  });
  addEventListener('hashchange', () => { if (/#d=/.test(location.hash)) location.reload(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.target.closest('input, textarea')) { e.preventDefault(); if (!store.undo()) toast('Nothing to undo.'); }
    if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); document.querySelector('#filters .search input')?.focus(); }
  });
}

boot();
