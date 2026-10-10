// Build room: filters and the card gallery. Clicking a tile adds it to the zone being built.
import { DOMAINS, DOMAIN_CLASS, SETS, img, isChampionFor, isSignatureFor, norm } from './data.js';
import { blockReason, copiesOf, inDomains, LIMITS, counts } from './rules.js';
import { makeFlap, flap, fmtRatio } from './flap.js';
import { baseValue, marginal, wantsOf, providesOf } from './agent/engine.js';

const ZONES = [
  ['legend', 'Legend'], ['champion', 'Champion'], ['main', 'Main deck'], ['bf', 'Battlefields'], ['runes', 'Runes'],
];
const SORTS = [['num', 'Set order'], ['cost', 'Energy cost'], ['name', 'Name'], ['ledger', 'Ledger value'], ['practical', 'Practical value'], ['deck', 'Value in this deck']];
const LENS = [['ledger', 'Ledger'], ['practical', 'Practical'], ['deck', 'In deck']];

export function createGallery({ root, filtersEl, idx, store, ui }) {
  const st = { zone: 'legend', q: '', doms: new Set(), cost: null, type: '', set: '', rarity: '', mine: false, sort: 'num', lens: 'deck', target: 'main', partner: null, legalOnly: true };
  const tileEls = new Map();
  let analysis = null;
  let marginals = new Map();

  filtersEl.innerHTML = `
    <div class="frow">
      <div class="zones" role="group" aria-label="Zone">${ZONES.map(([k, l]) => `<button type="button" data-zone="${k}" aria-pressed="false">${l}<b></b></button>`).join('')}</div>
    </div>
    <div class="frow">
      <input class="search" type="search" placeholder="Search name, text, keyword" aria-label="Search cards" autocomplete="off">
      <button class="key tray-toggle" type="button" data-tray aria-expanded="false">Filters</button>
    </div>
    <div class="frow tray">
      <div class="domains" role="group" aria-label="Domains">${DOMAINS.map((d) => `<button type="button" class="dom ${DOMAIN_CLASS[d]}" data-dom="${d}" aria-pressed="false"><i></i>${d}</button>`).join('')}</div>
      <div class="costs" role="group" aria-label="Energy cost">${[0, 1, 2, 3, 4, 5, 6, 7].map((n) => `<button type="button" data-cost="${n}" aria-pressed="false">${n === 7 ? '7+' : n}</button>`).join('')}</div>
      <select class="sel" data-f="type" aria-label="Type"><option value="">All types</option><option>Unit</option><option>Spell</option><option>Gear</option></select>
      <select class="sel" data-f="set" aria-label="Set"><option value="">All sets</option>${Object.entries(SETS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <select class="sel" data-f="rarity" aria-label="Rarity"><option value="">Any rarity</option><option>Common</option><option>Uncommon</option><option>Rare</option><option>Epic</option><option>Showcase</option></select>
      <button class="key" type="button" data-mine aria-pressed="false">In deck</button>
      <select class="sel" data-f="sort" aria-label="Sort">${SORTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <select class="sel" data-f="lens" aria-label="Value shown">${LENS.map(([k, l]) => `<option value="${k}" ${k === 'deck' ? 'selected' : ''}>Show: ${l}</option>`).join('')}</select>
      <select class="sel" data-f="target" aria-label="Add to"><option value="main">Add to main</option><option value="side">Add to sideboard</option></select>
    </div>
    <div class="frow meta-line" id="meta-line"></div>`;
  const $ = (s) => filtersEl.querySelector(s);
  const search = $('.search');
  let tSearch;
  search.addEventListener('input', () => { clearTimeout(tSearch); tSearch = setTimeout(() => { st.q = search.value.trim(); render(); }, 120); });
  filtersEl.addEventListener('click', (e) => {
    const z = e.target.closest('[data-zone]');
    if (z) { setZone(z.dataset.zone); return; }
    const d = e.target.closest('[data-dom]');
    if (d) { st.doms.has(d.dataset.dom) ? st.doms.delete(d.dataset.dom) : st.doms.add(d.dataset.dom); render(); return; }
    const c = e.target.closest('[data-cost]');
    if (c) { const v = +c.dataset.cost; st.cost = st.cost === v ? null : v; render(); return; }
    if (e.target.closest('[data-clear-partner]')) { st.partner = null; render(); return; }
    const mine = e.target.closest('[data-mine]');
    if (mine) { st.mine = !st.mine; mine.setAttribute('aria-pressed', String(st.mine)); render(); return; }
    const tray = e.target.closest('[data-tray]');
    if (tray) { const open = filtersEl.classList.toggle('open'); tray.setAttribute('aria-expanded', String(open)); }
  });
  filtersEl.addEventListener('change', (e) => {
    const f = e.target.dataset.f;
    if (f) { st[f] = e.target.value; if (f === 'target') return; render(); }
  });

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

  function matches(c) {
    if (st.doms.size && !c.domains.some((d) => st.doms.has(d))) return false;
    if (st.cost !== null && (st.cost === 7 ? c.E < 7 : c.E !== st.cost)) return false;
    if (st.type && c.type !== st.type) return false;
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
    cost: (a, b) => a.C - b.C || a.E - b.E || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    ledger: (a, b) => (baseValue(b).ledger ?? -1) - (baseValue(a).ledger ?? -1),
    practical: (a, b) => (baseValue(b).practical ?? -1) - (baseValue(a).practical ?? -1),
    deck: (a, b) => (marginals.get(b.id)?.deckAmber ?? -1) - (marginals.get(a.id)?.deckAmber ?? -1),
  };

  function tile(c) {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = `tile${c.landscape ? ' bf' : ''}`;
    t.dataset.id = c.id;
    t.setAttribute('aria-label', `${c.name}. Activate to add a copy; press I for details.`);
    t.innerHTML = `<div class="art"><img loading="lazy" decoding="async" alt="" src="${img(c, c.landscape ? 480 : 300)}">
      ${c.preview ? '<span class="tag-preview">Preview</span>' : ''}${c.banned ? '<span class="tag-preview tag-ban">Banned</span>' : ''}</div>
      <div class="cap"><span class="nm"></span><span class="val"></span><span class="sub"></span></div>`;
    t.querySelector('.nm').textContent = c.name;
    t.querySelector('.sub').textContent = c.type === 'Legend' || c.type === 'Battlefield' || c.type === 'Rune'
      ? c.domains.join(' / ') || c.type : `${c.E}E${c.P ? ` ${c.P}P` : ''} · ${c.type}${c.might !== null && c.type === 'Unit' ? ` · ${c.might} might` : ''}`;
    const count = makeFlap('', 'count');
    count.classList.add('count');
    t.querySelector('.art').appendChild(count);
    const val = makeFlap(' -- ', 'amber');
    t.querySelector('.val').appendChild(val);
    t._count = count; t._val = val;
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
    flap(t._count, n ? String(n) : '', { animate });
    const costed = !['Legend', 'Battlefield', 'Rune'].includes(c.type);
    const v = costed ? lensValue(c) : null;
    t._val.hidden = !costed;
    if (costed) flap(t._val, fmtRatio(v), { animate, cls: v === null ? 'dim' : 'amber' });
    const legend = legendOf(deck);
    t.classList.toggle('off', !!legend && ['main'].includes(st.zone) && !!blockReason(deck, c, idx) && n === 0);
  }

  function render(animate = false) {
    const deck = store.getDeck();
    const list = pool(deck).filter(matches).sort(sorter[st.sort] || sorter.num);
    const frag = document.createDocumentFragment();
    for (const c of list) { const t = tileFor(c); paintTile(t, c, deck, animate); frag.appendChild(t); }
    root.replaceChildren(frag);
    if (!list.length) root.innerHTML = `<p class="empty-note">No cards match. Clear a filter or search for something else.</p>`;
    if (st.zone === 'legend' && !deck.legend && !st.q) root.prepend(intro());
    paintChrome(deck, list.length);
  }

  function paintChrome(deck, shown) {
    const n = counts(deck);
    const zoneCount = { legend: deck.legend ? '1/1' : '0/1', champion: deck.champion ? '1/1' : '0/1', main: `${n.main}/${LIMITS.main}`, bf: `${n.bf}/3`, runes: `${n.runes}/12` };
    filtersEl.querySelectorAll('[data-zone]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.zone === st.zone));
      b.querySelector('b').textContent = zoneCount[b.dataset.zone];
    });
    filtersEl.querySelectorAll('[data-dom]').forEach((b) => b.setAttribute('aria-pressed', String(st.doms.has(b.dataset.dom))));
    filtersEl.querySelectorAll('[data-cost]').forEach((b) => b.setAttribute('aria-pressed', String(st.cost === +b.dataset.cost)));
    const meta = filtersEl.querySelector('#meta-line');
    const partner = st.partner ? idx.byId.get(st.partner) : null;
    const zoneHelp = { legend: 'Pick the legend that leads the deck.', champion: 'Pick the chosen champion.', main: st.target === 'side' ? 'Tapping the art adds to the sideboard.' : 'Tap the art to add a copy, the name for details. Right click or long press removes one.',
      bf: 'Pick three different battlefields.', runes: 'Click adds a rune, right click removes one.' }[st.zone];
    meta.innerHTML = `<span><b>${shown}</b> cards · ${zoneHelp}</span>${partner ? ` <button class="key small quiet" data-clear-partner type="button">Partners of ${partner.name} ✕</button>` : ''}`;
  }

  function intro() {
    const el = document.createElement('section');
    el.className = 'intro';
    el.innerHTML = `<div class="intro-head"><h2>Build a deck. Watch it re-price.</h2>
        <p>Every card carries Riot's own price for what it does. Put cards together and the board shows what they are worth in this deck.</p></div>
      <ol class="intro-steps"><li><b>Pick a legend</b><span>It sets your two domains.</span></li>
        <li><b>Choose the champion, add cards</b><span>Tap the art to add a copy, the name for details. Right click or long press removes one.</span></li>
        <li><b>Run the agent</b><span>Five work styles read the list and propose buys, cuts and combos.</span></li></ol>
      <dl class="intro-values"><div><dt>Ledger</dt><dd>Riot's price per cost, 1.00 is par.</dd></div>
        <div><dt>Practical</dt><dd>Adds what the ledger books at a discount or ignores.</dd></div>
        <div><dt>In deck</dt><dd>After the combos in your list.</dd></div></dl>
      <p class="intro-cta"><button class="key" type="button" data-intro-import>Import a list</button> <a href="/amber/">How the ledger prices cards</a></p>`;
    el.querySelector('[data-intro-import]').addEventListener('click', () => ui.importList());
    return el;
  }

  function setZone(z) { st.zone = z; st.partner = null; render(); root.scrollTo?.({ top: 0 }); root.parentElement?.scrollTo({ top: 0 }); }

  function act(c, remove) {
    const deck = store.getDeck();
    if (c.type === 'Legend') {
      if (remove) { store.update((d) => { d.legend = null; }, 'legend'); return; }
      store.update((d) => {
        d.legend = c.id;
        const champ = d.champion ? idx.byId.get(d.champion) : null;
        if (champ && !isChampionFor(champ, c)) d.champion = null;
        const runeTotal = Object.values(d.runes).reduce((a, b) => a + b, 0);
        if (!runeTotal || Object.keys(d.runes).some((k) => !c.domains.includes(k))) {
          d.runes = {}; c.domains.forEach((dm, i) => { d.runes[dm] = c.domains.length === 1 ? 12 : 6 + (i === 0 ? 0 : 0); });
        }
      }, 'legend');
      ui.toast(`${c.name} leads the deck.`);
      if (!store.getDeck().champion) setZone('champion');
      return;
    }
    if (st.zone === 'champion' && c.supertype === 'Champion') {
      if (remove || deck.champion === c.id) { store.update((d) => { d.champion = null; }, 'champion'); return; }
      const legend = legendOf(deck);
      if (legend && !isChampionFor(c, legend)) { ui.toast(`${c.name} is not a ${legend.champ} champion.`, true); return; }
      if (copiesOf(deck, c.id) >= 3) { ui.toast('Already three copies counting the champion.', true); return; }
      store.update((d) => { d.champion = c.id; }, 'champion');
      ui.toast(`${c.name} is the chosen champion.`);
      if (counts(store.getDeck()).main < 2) setZone('main');
      return;
    }
    if (c.type === 'Battlefield') {
      if (deck.bf.includes(c.id)) { store.update((d) => { d.bf = d.bf.filter((x) => x !== c.id); }, 'bf'); return; }
      if (remove) return;
      if (deck.bf.length >= 3) { ui.toast('Three battlefields already. Remove one first.', true); return; }
      if (c.banned) { ui.toast(`${c.name} is banned in Standard.`, true); return; }
      store.update((d) => { d.bf.push(c.id); }, 'bf');
      return;
    }
    if (c.type === 'Rune') {
      const dm = c.domains[0];
      if (remove) { store.update((d) => { d.runes[dm] = (d.runes[dm] || 0) - 1; }, 'runes'); return; }
      const legend = legendOf(deck);
      if (legend && !legend.domains.includes(dm)) { ui.toast(`${dm} runes do not match the legend.`, true); return; }
      if (counts(deck).runes >= 12) { ui.toast('Twelve runes already. Remove one first.', true); return; }
      store.update((d) => { d.runes[dm] = (d.runes[dm] || 0) + 1; }, 'runes');
      return;
    }
    const zone = st.target === 'side' ? 'side' : 'main';
    if (remove) {
      if (deck[zone][c.id]) store.update((d) => { d[zone][c.id] -= 1; }, 'remove');
      else if (deck.champion === c.id) store.update((d) => { d.champion = null; }, 'remove');
      return;
    }
    const why = blockReason(deck, c, idx);
    if (why) { ui.toast(why, true); return; }
    if (zone === 'side' && counts(deck).side >= LIMITS.side) { ui.toast('The sideboard holds ten cards.', true); return; }
    store.update((d) => { d[zone][c.id] = (d[zone][c.id] || 0) + 1; }, 'add');
  }

  // pointer: click adds, right click removes, long press removes, double click opens details
  let pressTimer = null; let longPressed = false;
  root.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.tile'); if (!t || e.button !== 0) return;
    longPressed = false;
    pressTimer = setTimeout(() => { longPressed = true; act(idx.byId.get(t.dataset.id), true); navigator.vibrate?.(12); }, 480);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => root.addEventListener(ev, () => clearTimeout(pressTimer)));
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    if (longPressed) { longPressed = false; return; }
    if (e.target.closest('.cap')) { ui.openCard(t.dataset.id); return; }
    act(idx.byId.get(t.dataset.id), e.shiftKey || e.altKey);
  });
  root.addEventListener('contextmenu', (e) => { const t = e.target.closest('.tile'); if (!t) return; e.preventDefault(); act(idx.byId.get(t.dataset.id), true); });
  root.addEventListener('keydown', (e) => {
    const t = e.target.closest('.tile'); if (!t) return;
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '-') { e.preventDefault(); act(idx.byId.get(t.dataset.id), true); }
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
    autoZone(deck) {
      if (!deck.legend) setZone('legend');
      else if (!deck.champion) setZone('champion');
      else setZone('main');
    },
  };
}
