// The card gallery: toolbar, filters and the card grid. Clicking a card adds it to the zone being built.
import { DOMAINS, SETS, img, esc, isChampionFor, isSignatureFor, norm } from './data.js';
import { blockReason, copiesOf, inDomains, LIMITS, counts } from './rules.js';
import { setNum, makeNum, fmtRatio, band } from './num.js';
import { baseValue, marginal, wantsOf, providesOf } from './agent/engine.js';
import { createMenu } from './menu.js';
import { energyGlyph, runeGlyph, typeGlyph, costGlyphs } from './glyphs.js';

const ZONES = [
  ['legend', 'Legend'], ['champion', 'Champion'], ['main', 'Main deck'], ['bf', 'Battlefields'], ['runes', 'Runes'],
];
const SORTS = [['num', 'Set order'], ['cost', 'Energy'], ['name', 'Name'], ['ledger', 'Ledger value'], ['practical', 'Practical value'], ['deck', 'Value in this deck']];
const LENS = [['ledger', 'Ledger'], ['practical', 'Practical'], ['deck', 'In this deck']];
const TARGETS = [['main', 'Main deck'], ['side', 'Sideboard'], ['bench', 'Bench']];

const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const phone = matchMedia('(max-width: 900px)');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SINGLE = ['Legend', 'Battlefield'];

export function createGallery({ root, filtersEl, idx, store, ui }) {
  const st = { zone: 'legend', q: '', doms: new Set(), cost: null, type: '', set: '', rarity: '', mine: false, sort: 'num', lens: 'deck', target: 'main', partner: null, legalOnly: true };
  const tileEls = new Map();
  let analysis = null;
  let marginals = new Map();

  const opts = (list, cur, fmt = (l) => l) => list.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${fmt(l)}</option>`).join('');
  filtersEl.innerHTML = `
    <div class="trow">
      <label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Search name, text, keyword" aria-label="Search cards" autocomplete="off"><span class="count"></span><kbd aria-hidden="true">/</kbd></label>
      <div class="segc zones" role="group" aria-label="Card types">${ZONES.map(([k, l]) => `<button type="button" data-zone="${k}" aria-pressed="false">${l}<b></b></button>`).join('')}</div>
      <button class="btn tray-toggle" type="button" data-tray aria-expanded="false" aria-controls="filters-row">Filters</button>
    </div>
    <div class="trow tray" id="filters-row">
      <div class="doms" role="group" aria-label="Domains">${DOMAINS.map((d) => `<button type="button" class="dom" data-dom="${d}" aria-pressed="false">${runeGlyph(d)}${d}</button>`).join('')}</div>
      <div class="costs" role="group" aria-label="Energy cost">${[0, 1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" data-cost="${n}" aria-pressed="false" aria-label="${n === 7 ? '7 or more' : n} energy" title="${n === 7 ? '7 or more' : n} energy">${energyGlyph(n)}${n === 7 ? '+' : ''}</button>`).join('')}</div>
      <div class="types" role="group" aria-label="Card type">${['Unit', 'Spell', 'Gear'].map((t) => `<button type="button" class="dom" data-ctype="${t}" aria-pressed="false">${typeGlyph(t)}${t}</button>`).join('')}</div>
      <select class="sel" data-f="sort" aria-label="Sort">${opts(SORTS, st.sort, (l) => `Sort: ${l}`)}</select>
      <button class="btn" type="button" data-more aria-expanded="false" aria-controls="filters-more">More</button>
    </div>
    <div class="trow tray more" id="filters-more" hidden>
      <select class="sel" data-f="set" aria-label="Set"><option value="">All sets</option>${Object.entries(SETS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <select class="sel" data-f="rarity" aria-label="Rarity"><option value="">Any rarity</option><option>Common</option><option>Uncommon</option><option>Rare</option><option>Epic</option><option>Showcase</option></select>
      <button class="toggle" type="button" data-mine aria-pressed="false">In deck only</button>
      <select class="sel" data-f="lens" aria-label="Value shown on cards">${opts(LENS, st.lens, (l) => `Value: ${l}`)}</select>
      <select class="sel" data-f="target" aria-label="Clicks add to">${opts(TARGETS, st.target, (l) => `Add to: ${l}`)}</select>
      <span class="tslot"><span class="tlabel" aria-hidden="true">Card size</span></span>
    </div>
    <div class="trow active" id="active-line" hidden></div>`;
  const $ = (s) => filtersEl.querySelector(s);
  const search = $('.search input');
  let tSearch;
  search.addEventListener('input', () => { clearTimeout(tSearch); tSearch = setTimeout(() => { st.q = search.value.trim(); render(); }, 120); });
  filtersEl.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zone]');
    if (z) { setZone(z.dataset.zone); return; }
    const d = e.target.closest('[data-dom]');
    if (d) { st.doms.has(d.dataset.dom) ? st.doms.delete(d.dataset.dom) : st.doms.add(d.dataset.dom); render(); return; }
    const c = e.target.closest('[data-cost]');
    if (c) { const v = +c.dataset.cost; st.cost = st.cost === v ? null : v; render(); return; }
    const ty = e.target.closest('[data-ctype]');
    if (ty) { st.type = st.type === ty.dataset.ctype ? '' : ty.dataset.ctype; render(); return; }
    const clr = e.target.closest('[data-clear]');
    if (clr) { clearFilter(clr.dataset.clear); render(); return; }
    const mine = e.target.closest('[data-mine]');
    if (mine) { st.mine = !st.mine; render(); return; }
    const more = e.target.closest('[data-more]');
    if (more) { const row = $('#filters-more'); row.hidden = !row.hidden; more.setAttribute('aria-expanded', String(!row.hidden)); return; }
    const tray = e.target.closest('[data-tray]');
    if (tray) { const open = filtersEl.classList.toggle('open'); tray.setAttribute('aria-expanded', String(open)); }
  });
  filtersEl.addEventListener('change', (e) => {
    const f = e.target.dataset.f;
    if (f === 'target') { ui.setTarget(e.target.value); return; }
    if (f) { st[f] = e.target.value; render(); }
  });

  function clearFilter(key) {
    const [k, v] = key.split(':');
    if (k === 'all') { st.doms.clear(); st.cost = null; st.type = ''; st.set = ''; st.rarity = ''; st.mine = false; st.q = ''; st.partner = null; search.value = ''; }
    else if (k === 'dom') st.doms.delete(v);
    else if (k === 'q') { st.q = ''; search.value = ''; }
    else if (k === 'mine') st.mine = false;
    else if (k === 'partner') st.partner = null;
    else if (k === 'cost') st.cost = null;
    else if (k in st) st[k] = '';
    for (const f of ['type', 'set', 'rarity']) { const s = filtersEl.querySelector(`[data-f="${f}"]`); if (s) s.value = st[f]; }
  }

  function legendOf(deck) { return deck.legend ? idx.byId.get(deck.legend) : null; }

  function pool(deck) {
    const legend = legendOf(deck);
    const z = st.zone;
    return idx.cards.filter((c) => {
      if (z === 'legend') return c.type === 'Legend';
      if (z === 'champion') return c.type === 'Unit' && c.supertype === 'Champion' && (!legend || isChampionFor(c, legend));
      if (z === 'bf') return c.type === 'Battlefield' && !c.token;
      if (z === 'runes') return c.type === 'Rune' && (!legend || legend.domains.some((d) => c.domains.includes(d)));
      if (!['Unit', 'Spell', 'Gear'].includes(c.type) || c.token) return false;
      if (legend && st.legalOnly && !inDomains(c, legend)) return false;
      if (legend && c.supertype === 'Signature' && !isSignatureFor(c, legend)) return false;
      return true;
    });
  }

  // energy filters champions and main deck cards, type only main deck cards; elsewhere both sit out
  const costOn = () => st.cost !== null && ['main', 'champion'].includes(st.zone);
  const typeOn = () => !!st.type && st.zone === 'main';
  function matches(c) {
    if (st.doms.size && !c.domains.some((d) => st.doms.has(d))) return false;
    if (costOn() && (st.cost === 7 ? c.E < 7 : c.E !== st.cost)) return false;
    if (typeOn() && c.type !== st.type) return false;
    if (st.set && c.set !== st.set) return false;
    if (st.rarity && c.rarity !== st.rarity) return false;
    if (st.mine && !countIn(store.getDeck(), c)) return false;
    if (st.partner) {
      const p = idx.byId.get(st.partner);
      const want = new Set(wantsOf(p).map((w) => w.tag));
      const give = providesOf(p);
      const prov = providesOf(c);
      const feeds = [...prov.keys()].some((t) => want.has(t));
      const fed = wantsOf(c).some((w) => give.has(w.tag));
      if (!(feeds || fed) || c.id === p.id) return false;
    }
    if (st.q) {
      const q = norm(st.q);
      const hay = norm(`${c.name} ${c.text} ${c.tags.join(' ')} ${c.type} ${c.supertype || ''} ${c.id}`);
      if (!q.split(' ').every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  const lensValue = (c) => {
    if (st.lens === 'deck' && marginals.has(c.id)) return marginals.get(c.id)?.deckAmber ?? null;
    const b = baseValue(c);
    return st.lens === 'ledger' ? b.ledger : b.practical;
  };
  const sorter = {
    num: (a, b) => a.id.localeCompare(b.id),
    cost: (a, b) => a.E - b.E || a.P - b.P || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    ledger: (a, b) => (baseValue(b).ledger ?? -1) - (baseValue(a).ledger ?? -1),
    practical: (a, b) => (baseValue(b).practical ?? -1) - (baseValue(a).practical ?? -1),
    deck: (a, b) => (marginals.get(b.id)?.deckAmber ?? -1) - (marginals.get(a.id)?.deckAmber ?? -1),
  };

  // A div with button semantics: Firefox will not start a native drag on a <button>.
  function tile(c) {
    const t = document.createElement('div');
    t.setAttribute('role', 'button');
    t.tabIndex = 0;
    t.className = `tile${c.landscape ? ' bf' : ''}`;
    t.dataset.id = c.id;
    if (finePointer.matches && ['Unit', 'Spell', 'Gear'].includes(c.type)) t.draggable = true;
    t.setAttribute('aria-label', `${c.name}. Activate to add a copy; press I for details.`);
    t.innerHTML = `<div class="art"><img loading="lazy" decoding="async" alt="" src="${esc(img(c, c.landscape ? 480 : 300))}">
      ${c.preview || c.banned ? `<span class="tags">${c.preview ? '<span class="tag">Preview</span>' : ''}${c.banned ? '<span class="tag ban">Banned</span>' : ''}</span>` : ''}</div>
      <div class="cap"><span class="nm"></span><span class="val"></span><span class="sub"></span></div>`;
    t.querySelector('.nm').textContent = c.name;
    t.querySelector('.sub').innerHTML = c.type === 'Legend' || c.type === 'Rune'
      ? c.domains.map((d) => `${runeGlyph(d)}${esc(d)}`).join(' ') || esc(c.type)
      : c.type === 'Battlefield' ? `${typeGlyph(c.type)}${esc(c.type)}` : `${costGlyphs(c)}${typeGlyph(c.type)}${esc(c.type)}`;
    // in-deck strip (Piltover-style): − count +, pointer only; keyboard uses Enter, Shift+Enter and Backspace
    const strip = document.createElement('div');
    strip.className = `qty${SINGLE.includes(c.type) ? ' single' : ''}`;
    strip.setAttribute('aria-hidden', 'true');
    strip.innerHTML = '<button type="button" tabindex="-1" data-q="-1">−</button><button type="button" tabindex="-1" data-q="1">+</button>';
    const count = makeNum('');
    strip.insertBefore(count, strip.lastChild);
    t.querySelector('.art').appendChild(strip);
    const val = makeNum('');
    t.querySelector('.val').appendChild(val);
    t._count = count; t._strip = strip; t._val = val;
    return t;
  }

  function tileFor(c) {
    if (!tileEls.has(c.id)) tileEls.set(c.id, tile(c));
    return tileEls.get(c.id);
  }

  function countIn(deck, c) {
    if (st.zone === 'legend') return deck.legend === c.id ? 1 : 0;
    if (st.zone === 'champion') return deck.champion === c.id ? 1 : 0;
    if (st.zone === 'bf') return deck.bf.includes(c.id) ? 1 : 0;
    if (st.zone === 'runes') return deck.runes[c.domains[0]] || 0;
    return copiesOf(deck, c.id);
  }

  function paintTile(t, c, deck, animate) {
    const n = countIn(deck, c);
    setNum(t._count, n ? String(n) : '', { animate });
    t._strip.classList.toggle('on', n > 0);
    t.classList.toggle('in', n > 0);
    const costed = !['Legend', 'Battlefield', 'Rune'].includes(c.type);
    const v = costed ? lensValue(c) : null;
    t._val.hidden = !costed;
    if (costed) setNum(t._val, fmtRatio(v), { animate, cls: band(v) });
    const legend = legendOf(deck);
    t.classList.toggle('off', !!legend && st.zone === 'main' && st.target !== 'bench' && !!blockReason(deck, c, idx) && n === 0);
  }

  function render(animate = false) {
    const deck = store.getDeck();
    const list = pool(deck).filter(matches).sort(sorter[st.sort] || sorter.num);
    const frag = document.createDocumentFragment();
    for (const c of list) { const t = tileFor(c); paintTile(t, c, deck, animate); frag.appendChild(t); }
    root.replaceChildren(frag);
    if (!list.length) root.innerHTML = '<p class="empty-note">No cards match. Clear a filter or search for something else.</p>';
    if (st.zone === 'legend' && !deck.legend && !st.q) root.prepend(intro());
    paintChrome(deck, list.length);
  }

  function paintChrome(deck, shown) {
    const n = counts(deck);
    const legend = legendOf(deck);
    const zoneCount = { legend: deck.legend ? 1 : 0, champion: deck.champion ? 1 : 0, main: n.main, bf: n.bf, runes: n.runes };
    filtersEl.querySelectorAll('[data-zone]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.zone === st.zone));
      b.querySelector('b').textContent = zoneCount[b.dataset.zone];
    });
    // with a legend, only its domains are worth filtering by in the main deck, champion and rune views
    const narrow = legend && ['main', 'champion', 'runes'].includes(st.zone);
    filtersEl.querySelectorAll('[data-dom]').forEach((b) => {
      b.setAttribute('aria-pressed', String(st.doms.has(b.dataset.dom)));
      b.hidden = !!narrow && !legend.domains.includes(b.dataset.dom);
    });
    filtersEl.querySelectorAll('[data-cost]').forEach((b) => b.setAttribute('aria-pressed', String(st.cost === +b.dataset.cost)));
    $('.costs').hidden = !['main', 'champion'].includes(st.zone);
    filtersEl.querySelectorAll('[data-ctype]').forEach((b) => b.setAttribute('aria-pressed', String(st.type === b.dataset.ctype)));
    $('.types').hidden = st.zone !== 'main';
    $('[data-mine]').setAttribute('aria-pressed', String(st.mine));
    const chips = [
      ...[...st.doms].map((d) => [`dom:${d}`, d]),
      costOn() ? ['cost', `${st.cost === 7 ? '7+' : st.cost} energy`] : null,
      typeOn() ? ['type', st.type] : null, st.set ? ['set', SETS[st.set] || st.set] : null, st.rarity ? ['rarity', st.rarity] : null,
      st.mine ? ['mine', 'In deck only'] : null, st.q ? ['q', `“${st.q}”`] : null,
      st.partner ? ['partner', `Partners of ${idx.byId.get(st.partner)?.name || ''}`] : null,
    ].filter(Boolean);
    // the deck panel and the intro already explain the other zones; the rune trade needs a word here
    const help = st.zone === 'runes' ? 'Click adds a rune; at twelve it trades one from the other domain.' : '';
    const line = $('#active-line');
    line.hidden = !chips.length && !help;
    line.innerHTML = `${chips.map(([k, l]) => `<button class="fchip" type="button" data-clear="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)}<span aria-hidden="true">×</span></button>`).join('')}
      ${chips.length > 1 ? '<button class="link" type="button" data-clear="all">Clear all</button>' : ''}
      ${help ? `<span class="help">${esc(help)}</span>` : ''}`;
    $('.search .count').innerHTML = `<b>${shown}</b> card${shown === 1 ? '' : 's'}`;
  }

  function intro() {
    const el = document.createElement('section');
    el.className = 'intro';
    el.innerHTML = `<h2>Build a Riftbound deck and see what every card is worth in it.</h2>
      <p>Each card carries Riot's own price for what it does, 1.00 is par. Put cards together and the deck panel shows what they are worth in this list.</p>
      <ol><li><b>Pick a legend</b> below; it sets your two domains.</li><li><b>Choose the champion and add cards.</b> Click adds a copy, Shift adds three, right click shows more, or type names in the deck panel.</li><li><b>Run the coach</b> for buys, cuts and combos.</li></ol>
      <p class="intro-cta"><button class="btn" type="button" data-intro-import>Import a deck code or list</button> <a href="/amber/">How the ledger prices cards</a></p>`;
    el.querySelector('[data-intro-import]').addEventListener('click', () => ui.importList());
    return el;
  }

  function setZone(z) { st.zone = z; st.partner = null; render(); root.scrollTo?.({ top: 0 }); root.parentElement?.scrollTo({ top: 0 }); }

  /** Make `c` the chosen champion (or clear it when it already is). */
  function chooseChampion(c) {
    const deck = store.getDeck();
    if (deck.champion === c.id) { store.update((d) => { d.champion = null; }, 'champion'); return; }
    const legend = legendOf(deck);
    if (legend && !isChampionFor(c, legend)) { ui.toast(`${c.name} is not a ${legend.champ} champion.`, true); return; }
    if (c.banned) { ui.toast(`${c.name} is banned in Standard.`, true); return; }
    if (legend && !inDomains(c, legend)) { ui.toast(`${c.name} is outside ${legend.domains.join(' / ')}.`, true); return; }
    if (copiesOf(deck, c.id) >= 3) { ui.toast('Already three copies counting the champion.', true); return; }
    store.update((d) => { d.champion = c.id; }, 'champion');
    ui.toast(`${c.name} is the chosen champion.`);
    if (counts(store.getDeck()).main < 2 && st.zone === 'champion') setZone('main');
  }

  /** Apply a gallery action; returns how many copies went into a card zone. */
  function act(c, mode = 'add') {
    const deck = store.getDeck();
    const remove = mode === 'remove';
    if (c.type === 'Legend') {
      if (remove) { store.update((d) => { d.legend = null; }, 'legend'); return 0; }
      store.update((d) => {
        d.legend = c.id;
        const champ = d.champion ? idx.byId.get(d.champion) : null;
        if (champ && !isChampionFor(champ, c)) d.champion = null;
        const runeTotal = Object.values(d.runes).reduce((a, b) => a + b, 0);
        if (!runeTotal || Object.keys(d.runes).some((k) => !c.domains.includes(k))) {
          d.runes = {}; c.domains.forEach((dm) => { d.runes[dm] = Math.floor(12 / c.domains.length); });
        }
      }, 'legend');
      ui.toast(`${c.name} leads the deck.`);
      if (!store.getDeck().champion) setZone('champion');
      return 0;
    }
    if (st.zone === 'champion' && c.supertype === 'Champion') {
      if (remove && deck.champion !== c.id) return 0;
      chooseChampion(c);
      return 0;
    }
    if (c.type === 'Battlefield') {
      if (deck.bf.includes(c.id)) { store.update((d) => { d.bf = d.bf.filter((x) => x !== c.id); }, 'bf'); return 0; }
      if (remove) return 0;
      if (deck.bf.length >= 3) { ui.toast('Three battlefields already. Remove one first.', true); return 0; }
      if (c.banned) { ui.toast(`${c.name} is banned in Standard.`, true); return 0; }
      store.update((d) => { d.bf.push(c.id); }, 'bf');
      return 0;
    }
    if (c.type === 'Rune') {
      const legend = legendOf(deck);
      if (legend && !legend.domains.includes(c.domains[0])) { ui.toast(`${c.domains[0]} runes do not match the legend.`, true); return 0; }
      ui.shiftRune(c.domains[0], remove ? -1 : 1);
      return 0;
    }
    const zone = ['side', 'bench'].includes(st.target) ? st.target : 'main';
    if (remove) {
      // take it from the add target first, then from wherever a copy sits
      const from = [zone, 'main', 'side', 'bench'].find((z) => deck[z][c.id] > 0);
      if (from) store.update((d) => { d[from][c.id] -= 1; }, 'remove');
      else if (deck.champion === c.id) store.update((d) => { d.champion = null; }, 'remove');
      if (from && from !== zone) ui.toast(`Took one ${c.name} out of the ${from === 'side' ? 'sideboard' : from === 'bench' ? 'bench' : 'main deck'}.`);
      return 0;
    }
    return ui.addCard(c.id, zone, { playset: mode === 'playset' }) || 0;
  }

  /** On phones, a copy of the art flies into the deck sheet's peek bar so the add is visible from the gallery. */
  function fly(t) {
    if (!phone.matches || reduced()) return;
    const im = t.querySelector('img');
    const dock = document.getElementById('peek');
    if (!im || !dock) return;
    const a = im.getBoundingClientRect(), b = dock.getBoundingClientRect();
    const g = im.cloneNode();
    g.className = 'flyer';
    Object.assign(g.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
    document.body.appendChild(g);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    g.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.14)`, opacity: 0.4 }],
      { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)' }).finished.finally(() => {
      g.remove();
      dock.animate([{ transform: 'translateY(-3px)' }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  function addTo(c, zone, three, t) {
    const n = ui.addCard(c.id, zone, { playset: three });
    if (n > 0 && zone === 'main' && t) fly(t);
  }

  /** Gallery tile menu (Piltover-style): add one or three to a zone, choose the champion, details. */
  function tileItems(c, t) {
    const deck = store.getDeck();
    const legend = legendOf(deck);
    const info = { label: 'Card details', run: () => ui.openCard(c.id) };
    if (c.type === 'Legend') return [{ label: deck.legend === c.id ? 'Remove the legend' : 'Lead the deck', run: () => act(c, deck.legend === c.id ? 'remove' : 'add') }, null, info];
    if (c.type === 'Battlefield') return [{ label: deck.bf.includes(c.id) ? 'Remove battlefield' : 'Add battlefield', run: () => act(c) }, null, info];
    if (c.type === 'Rune') return [{ label: `Add a ${c.domains[0]} rune`, run: () => act(c) }, { label: `Take a ${c.domains[0]} rune out`, run: () => act(c, 'remove') }, null, info];
    const n = copiesOf(deck, c.id);
    const zoneName = { main: 'main deck', side: 'sideboard', bench: 'bench' };
    const add = (zone, three) => ({ label: `Add ${three ? 'three' : 'one'} to ${zoneName[zone]}`, run: () => addTo(c, zone, three, t) });
    return [add('main'), add('main', true),
      legend && isChampionFor(c, legend) && deck.champion !== c.id ? { label: 'Set as chosen champion', run: () => chooseChampion(c) } : false,
      null, add('side'), add('side', true), null, add('bench'), add('bench', true),
      n > 0 ? null : false, n > 0 ? { label: 'Remove one', run: () => act(c, 'remove') } : false,
      null, info, { label: 'Show partners', run: () => ui.showPartners(c.id) }];
  }
  const menu = createMenu();
  const openMenu = (t, x, y, focus) => menu.open(tileItems(idx.byId.get(t.dataset.id), t), x, y, { focus });

  // pointer: click adds (Shift three), the − / + strip adjusts, right click or long press opens the menu, the caption opens details
  let pressTimer = null; let longPressed = false;
  root.addEventListener('pointerdown', (e) => {
    longPressed = false;
    const t = e.target.closest('.tile'); if (!t || e.button !== 0 || e.pointerType !== 'touch' || e.target.closest('[data-q]')) return;
    const { clientX: x, clientY: y } = e;
    pressTimer = setTimeout(() => { longPressed = true; navigator.vibrate?.(12); openMenu(t, x, y, false); }, 480);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => root.addEventListener(ev, () => clearTimeout(pressTimer)));
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    if (longPressed) { longPressed = false; return; }
    const c = idx.byId.get(t.dataset.id);
    const q = e.target.closest('[data-q]');
    if (q) { if (act(c, q.dataset.q === '1' ? (e.shiftKey ? 'playset' : 'add') : 'remove') > 0 && st.target === 'main') fly(t); return; }
    if (e.target.closest('.cap')) { ui.openCard(t.dataset.id); return; }
    if (act(c, e.altKey ? 'remove' : e.shiftKey ? 'playset' : 'add') > 0 && st.target === 'main') fly(t);
  });
  // drag a tile onto the deck board (main deck, sideboard or bench); Shift on drop adds three
  root.addEventListener('dragstart', (e) => {
    const t = e.target.closest?.('.tile[draggable="true"]');
    if (!t) return;
    clearTimeout(pressTimer);
    e.dataTransfer.setData('application/x-riftcount-card', t.dataset.id);
    e.dataTransfer.effectAllowed = 'copy';
    const im = t.querySelector('img');
    if (im) e.dataTransfer.setDragImage(im, im.width / 2, im.height / 3);
  });
  // drag a board card back onto the gallery to take a copy out (Shift: every copy)
  const MOVE = 'application/x-riftcount-move';
  root.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes(MOVE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    root.classList.add('dropout');
  });
  root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) root.classList.remove('dropout'); });
  addEventListener('dragend', () => root.classList.remove('dropout'));
  root.addEventListener('drop', (e) => {
    const move = e.dataTransfer.getData(MOVE);
    root.classList.remove('dropout');
    if (!move) return;
    e.preventDefault();
    const [zone, id] = move.split(':');
    if (!['main', 'side', 'bench'].includes(zone) || !idx.byId.has(id)) return;
    ui.removeCard(id, zone, { all: e.shiftKey });
  });
  root.addEventListener('contextmenu', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    e.preventDefault();
    if (longPressed) return; // the touch long press already opened it
    clearTimeout(pressTimer);
    if (e.pointerType === 'touch') longPressed = true; // the release click must not add a copy under the menu
    const keyboard = e.button !== 2 && e.pointerType !== 'touch';
    const r = t.getBoundingClientRect();
    openMenu(t, keyboard ? r.left + 20 : e.clientX, keyboard ? r.top + 30 : e.clientY, keyboard);
  });
  root.addEventListener('keydown', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    if (e.target !== t) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(idx.byId.get(t.dataset.id), e.altKey ? 'remove' : e.shiftKey ? 'playset' : 'add'); }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '-') { e.preventDefault(); act(idx.byId.get(t.dataset.id), 'remove'); }
    if (e.key === 'i' || e.key === '?') ui.openCard(t.dataset.id);
  });

  function setAnalysis(a, deck) {
    analysis = a;
    marginals = new Map();
    if (!a || !deck.legend) return;
    for (const c of pool(deck)) {
      if (!['Unit', 'Spell', 'Gear'].includes(c.type)) continue;
      const m = marginal(c, a, deck);
      if (m) marginals.set(c.id, m);
    }
  }

  return {
    render, setZone, setAnalysis,
    showPartners(id) { st.partner = id; st.zone = 'main'; render(); },
    repaint(animate = true) {
      const deck = store.getDeck();
      for (const t of root.querySelectorAll('.tile')) paintTile(t, idx.byId.get(t.dataset.id), deck, animate);
      paintChrome(deck, root.querySelectorAll('.tile').length);
    },
    get zone() { return st.zone; },
    get target() { return st.target; },
    /** Where clicks in the gallery add cards: main, side or bench. */
    setTarget(z) {
      if (!['main', 'side', 'bench'].includes(z)) return;
      st.target = z;
      const sel = filtersEl.querySelector('[data-f="target"]');
      if (sel) sel.value = z;
      if (st.zone !== 'main') setZone('main'); else render();
    },
    autoZone(deck) {
      if (!deck.legend) setZone('legend');
      else if (!deck.champion) setZone('champion');
      else setZone('main');
    },
  };
}
