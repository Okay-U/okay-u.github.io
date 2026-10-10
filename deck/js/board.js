// The deck board: the carried object. Pinned on desktop, its own screen on phones.
// Rows show quantity, cost, the ledger price and the price in this deck; values flip when the deck changes.
import { img, esc, DOMAIN_CLASS } from './data.js';
import { counts, LIMITS } from './rules.js';
import { flap, makeFlap, fmtRatio, pad, hydrateFlaps } from './flap.js';
import { baseValue, marginal } from './agent/engine.js';
import { createRowMenu } from './rowmenu.js';
import { createQuickAdd } from './quickadd.js';
import { GROUPS, SORTS, loadPrefs, savePrefs, groupEntries } from './deckview.js';

export function createBoard({ root, idx, store, ui }) {
  root.innerHTML = `
    <div class="bhead">
      <h2 class="boardtitle"><span data-flap="PRICE BOARD"></span></h2>
      <div class="ticker">
        <div class="tick-cell"><small>Main</small><span class="flap" data-k="main"></span></div>
        <div class="tick-cell"><small>Runes</small><span class="flap" data-k="runes"></span></div>
        <div class="tick-cell"><small>Fields</small><span class="flap" data-k="bf"></span></div>
        <button class="key amber run" type="button" data-run>Run agent</button>
      </div>
      <div class="values">
        <div><span class="lbl">Ledger value</span><span class="flap amber" data-k="ledger"></span><span class="why">Riot's own price per cost</span></div>
        <div><span class="lbl">In this deck</span><span class="flap" data-k="indeck"></span><span class="why" data-k="indeck-why">After combos in this list</span></div>
      </div>
      <div class="qslot"></div>
    </div>
    <div class="bbody"></div>
    <div class="board-foot">
      <button class="key small quiet" type="button" data-undo>Undo</button>
      <button class="key small quiet" type="button" data-new>New deck</button>
      <button class="key small quiet" type="button" data-export>Copy list</button>
      <button class="key small quiet" type="button" data-clear>Clear main</button>
    </div>`;
  hydrateFlaps(root);
  const body = root.querySelector('.bbody');
  createQuickAdd({ mount: root.querySelector('.qslot'), idx, store, ui });
  // The header scrolls away except its quick-add strip, which stays pinned at the top of the board.
  const head = root.querySelector('.bhead');
  const qslot = root.querySelector('.qslot');
  new ResizeObserver(() => head.style.setProperty('--pin', `${qslot.offsetTop - 10}px`)).observe(head);
  const strip = document.getElementById('ministrip');
  const S = (k) => strip?.querySelector(`[data-ms="${k}"]`);
  strip?.addEventListener('click', (e) => { if (e.target.closest('[data-ms-run]')) ui.runAgent(); });
  const F = (k) => root.querySelector(`[data-k="${k}"]`);
  const rowEls = new Map();
  const stackEls = new Map();
  const prefs = loadPrefs();
  let lastAn = null;
  let cascade = false;
  const setPref = (k, v) => {
    prefs[k] = v; savePrefs(prefs);
    cascade = k === 'view' && v === 'stacks';
    render(lastAn);
  };
  const menu = createRowMenu({ ui, store });
  root.addEventListener('change', (e) => {
    const f = e.target.dataset.pref;
    if (f) setPref(f, e.target.value);
  });
  root.addEventListener('contextmenu', (e) => {
    const r = e.target.closest('.row, .sc');
    if (!r) return;
    e.preventDefault();
    menu.open(r.dataset.id, r.dataset.zone, e.clientX, e.clientY);
  });

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-run]')) { ui.runAgent(); return; }
    if (e.target.closest('[data-undo]')) { if (!store.undo()) ui.toast('Nothing to undo.'); return; }
    if (e.target.closest('[data-new]')) { ui.newDeck(); return; }
    if (e.target.closest('[data-export]')) { ui.copyList(); return; }
    if (e.target.closest('[data-clear]')) {
      if (!Object.keys(store.getDeck().main).length) return;
      if (confirm('Remove every card from the main deck? Legend, champion, battlefields and runes stay. Undo can bring them back.')) {
        store.update((d) => { d.main = {}; }, 'clear');
      }
      return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) { ui.goBuild(pick.dataset.pick); return; }
    const view = e.target.closest('[data-view]');
    if (view) { if (prefs.view !== view.dataset.view) setPref('view', view.dataset.view); return; }
    const g = e.target.closest('[data-gkey]');
    if (g) {
      const k = g.dataset.gkey;
      setPref('collapsed', prefs.collapsed.includes(k) ? prefs.collapsed.filter((x) => x !== k) : [...prefs.collapsed, k]);
      return;
    }
    const sc = e.target.closest('.sc');
    if (sc) { menu.open(sc.dataset.id, 'main', e.clientX, e.clientY, { focus: e.detail === 0 }); return; }
    const row = e.target.closest('.row');
    if (!row) return;
    const id = row.dataset.id;
    const zone = row.dataset.zone;
    if (e.target.closest('[data-inc]')) { ui.addCard(id, zone === 'champion' ? 'main' : zone); return; }
    if (e.target.closest('[data-dec]')) { ui.removeCard(id, zone); return; }
    const more = e.target.closest('[data-menu]');
    if (more) { const b = more.getBoundingClientRect(); menu.open(id, zone, b.right, b.bottom, { focus: e.detail === 0 }); return; }
    if (e.target.closest('.nm')) ui.openCard(id);
  });

  function section(title, count, inner) {
    const s = document.createElement('section');
    s.className = 'bsec';
    s.innerHTML = `<h3><span>${title}</span></h3>`;
    if (count !== undefined) s.querySelector('h3').appendChild(makeFlap(count, 'dim'));
    if (typeof inner === 'string') s.insertAdjacentHTML('beforeend', inner); else if (inner) s.appendChild(inner);
    return s;
  }

  function row(card, n, zone, an, extraClass = '') {
    const key = `${zone}:${card.id}`;
    let r = rowEls.get(key);
    const fresh = !r;
    if (!r) {
      r = document.createElement('div');
      r.className = 'row';
      r.dataset.id = card.id; r.dataset.zone = zone;
      r.innerHTML = `<span class="q"></span><span class="cost"></span><button class="nm" type="button"></button>
        <span class="v"></span><span class="mv"><span class="tk"></span></span>
        <span class="ctl"><button class="key icon small" type="button" data-dec aria-label="Remove one">−</button><button class="key icon small" type="button" data-inc aria-label="Add one">+</button><button class="key icon small" type="button" data-menu aria-haspopup="menu" aria-label="More actions">⋯</button></span>`;
      r.querySelector('.q').appendChild(makeFlap('', ''));
      r.querySelector('.v').appendChild(makeFlap('', 'amber'));
      r.querySelector('.mv').prepend(makeFlap('', ''));
      rowEls.set(key, r);
    }
    r.getAnimations().forEach((a) => a.cancel());
    r.className = `row ${extraClass}`.trim();
    r.querySelector('.nm').textContent = card.name;
    const pipClass = DOMAIN_CLASS[card.domains[0]] || 'paint-mute';
    r.querySelector('.cost').innerHTML = `${Number(card.E) || 0}${`<i class="pw" style="background:var(--${pipClass})"></i>`.repeat(Math.min(Number(card.P) || 0, 3))}`;
    // Main-deck rows read the analysis; sideboard and bench rows show what the card would be worth if it joined the main deck.
    const a = ['main', 'champion'].includes(zone) ? an?.rows.find((x) => x.card.id === card.id) : (an && marginal(card, an, store.getDeck()));
    const ledger = a ? a.ledger : ['side', 'bench'].includes(zone) ? baseValue(card).ledger : null;
    const inDeck = a ? a.deckAmber : null;
    flap(r.querySelector('.q .flap'), `${n}`, { animate: !fresh });
    flap(r.querySelector('.v .flap'), fmtRatio(ledger), { animate: !fresh, cls: ledger === null ? 'dim' : 'amber' });
    const ref = ledger ?? a?.practical ?? null;
    const dir = inDeck === null || ref === null ? '' : inDeck > ref + 0.04 ? 'up' : inDeck < ref - 0.04 ? 'down' : '';
    const mv = r.querySelector('.mv');
    mv.className = `mv ${dir}`;
    mv.querySelector('.tk').textContent = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
    flap(mv.querySelector('.flap'), fmtRatio(inDeck), { animate: !fresh, cls: dir || (inDeck === null ? 'dim' : '') });
    mv.title = ['side', 'bench'].includes(zone) ? 'Value if it joined the main deck' : a && a.links?.length ? `In this deck: ${a.bonus >= 0 ? '+' : ''}${a.bonus.toFixed(2)} C from partners` : '';
    if (fresh && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      r.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    return r;
  }

  function groupHead(g, shut) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grp';
    b.dataset.gkey = g.key;
    b.setAttribute('aria-expanded', String(!shut));
    b.textContent = `${g.label} · ${g.count}`;
    return b;
  }

  function viewBar() {
    const bar = document.createElement('div');
    bar.className = 'bview';
    const opt = (list, cur) => list.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('');
    bar.innerHTML = `<div class="seg" role="group" aria-label="View">${[['list', 'List'], ['stacks', 'Stacks']].map(([k, l]) =>
      `<button type="button" data-view="${k}" aria-pressed="${prefs.view === k}">${l}</button>`).join('')}</div>
      <select class="sel" data-pref="group" aria-label="Group by">${opt(GROUPS.map(([k, l]) => [k, k === 'none' ? l : `By ${l}`]), prefs.group)}</select>
      <select class="sel" data-pref="sort" aria-label="Sort by">${opt(SORTS.map(([k, l]) => [k, `Sort: ${l}`]), prefs.sort)}</select>`;
    return bar;
  }

  function stackCard(card, n, an) {
    let s = stackEls.get(card.id);
    if (!s) {
      s = document.createElement('button');
      s.type = 'button';
      s.className = 'sc';
      s.dataset.id = card.id; s.dataset.zone = 'main';
      s.innerHTML = `<img alt="" decoding="async" src="${esc(img(card, 300))}"><span class="sl"><span class="sq"></span><span class="sn"></span></span>`;
      s.querySelector('.sn').textContent = card.name;
      s.querySelector('.sl').appendChild(makeFlap('', 'amber'));
      stackEls.set(card.id, s);
    }
    const a = an?.rows.find((x) => x.card.id === card.id);
    const ref = a ? a.ledger ?? a.practical : null;
    const v = a ? a.deckAmber : null;
    const dir = v === null || ref === null ? '' : v > ref + 0.04 ? 'up' : v < ref - 0.04 ? 'down' : '';
    s.querySelector('.sq').textContent = `${n}×`;
    flap(s.querySelector('.sl .flap'), fmtRatio(v), { animate: s.isConnected, cls: dir || (v === null ? 'dim' : 'amber') });
    s.setAttribute('aria-label', `${n} × ${card.name}, ${card.E} energy. In this deck ${fmtRatio(v).trim()}. Open actions.`);
    return s;
  }

  function stacks(groups, an) {
    const wrap = document.createElement('div');
    wrap.className = 'stacks';
    for (const g of groups) {
      const col = document.createElement('div');
      col.className = 'stk';
      const shut = prefs.collapsed.includes(g.key);
      col.appendChild(groupHead(g, shut));
      if (!shut) for (const [c, k] of g.list) col.appendChild(stackCard(c, k, an));
      wrap.appendChild(col);
    }
    return wrap;
  }

  function render(an) {
    lastAn = an;
    const deck = store.getDeck();
    const n = counts(deck);
    flap(F('main'), `${pad(n.main)}/${LIMITS.main}`, { cls: n.main === LIMITS.main ? 'up' : n.main > LIMITS.main ? 'down' : '' });
    flap(F('runes'), `${pad(n.runes)}/12`, { cls: n.runes === 12 ? 'up' : '' });
    flap(F('bf'), `${n.bf}/3`, { cls: n.bf === 3 ? 'up' : '' });
    flap(F('ledger'), fmtRatio(an?.metrics.ledger ?? null), { cls: 'amber' });
    const ind = an?.metrics.inDeck ?? null;
    const lg = an?.metrics.ledger ?? null;
    flap(F('indeck'), fmtRatio(ind), { cls: ind !== null && lg !== null ? (ind > lg + 0.02 ? 'up' : ind < lg - 0.02 ? 'down' : '') : '' });
    F('indeck-why').textContent = ind !== null && lg !== null ? `${ind >= lg ? '+' : ''}${Math.round((ind - lg) * 100)}% against the ledger` : 'After combos in this list';
    if (strip) {
      const dir = ind !== null && lg !== null ? (ind > lg + 0.02 ? 'up' : ind < lg - 0.02 ? 'down' : '') : '';
      flap(S('main'), `${pad(n.main)}/${LIMITS.main}`, { cls: n.main === LIMITS.main ? 'up' : n.main > LIMITS.main ? 'down' : '' });
      flap(S('indeck'), fmtRatio(ind), { cls: dir });
      S('tk').textContent = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
      S('tk').className = `tk ${dir}`;
    }

    const legend = deck.legend ? idx.byId.get(deck.legend) : null;
    const frag = document.createDocumentFragment();
    frag.appendChild(section('Legend', undefined, legend
      ? `<div class="legend-plate"><img alt="" src="${esc(img(legend, 200))}"><div><div class="t"></div><div class="d">${esc(legend.domains.join(' / '))} · <button class="key small quiet" type="button" data-pick="legend">Change</button></div></div></div>`
      : `<p class="hint">No legend yet. <button type="button" data-pick="legend">Pick one</button> to set your domains.</p>`));
    if (legend) frag.lastChild.querySelector('.t').textContent = legend.name;

    const champ = deck.champion ? idx.byId.get(deck.champion) : null;
    const champSec = section('Chosen champion', undefined, champ ? null : `<p class="hint">${legend ? `<button type="button" data-pick="champion">Choose a ${esc(legend.champ)} champion</button>.` : 'Comes after the legend.'}</p>`);
    if (champ) champSec.appendChild(row(champ, 1 + (deck.main[champ.id] || 0), 'champion', an, 'champ'));
    frag.appendChild(champSec);

    const mainSec = section('Main deck', `${pad(n.main)}/${LIMITS.main}`);
    mainSec.dataset.zone = 'main';
    const entries = Object.entries(deck.main).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c && (!champ || c.id !== champ.id));
    if (!entries.length) mainSec.insertAdjacentHTML('beforeend', `<p class="hint">${legend ? '<button type="button" data-pick="main">Add cards</button> from the gallery or type a name above. Click adds a copy.' : 'Pick a legend first.'}</p>`);
    if (entries.length) {
      mainSec.appendChild(viewBar());
      const groups = groupEntries(entries, prefs, (c) => an?.rows.find((r) => r.card.id === c.id)?.deckAmber ?? null);
      if (prefs.view === 'stacks') mainSec.appendChild(stacks(groups, an));
      else {
        mainSec.insertAdjacentHTML('beforeend', '<div class="rowhead" aria-hidden="true"><span>Qty</span><span>Cost</span><span>Card</span><span>Ledger</span><span>In deck</span></div>');
        for (const g of groups) {
          const shut = prefs.collapsed.includes(g.key);
          mainSec.appendChild(groupHead(g, shut));
          if (!shut) for (const [c, k] of g.list) mainSec.appendChild(row(c, k, 'main', an));
        }
      }
    }
    frag.appendChild(mainSec);

    const bfSec = section('Battlefields', `${n.bf}/3`);
    if (!deck.bf.length) bfSec.insertAdjacentHTML('beforeend', `<p class="hint"><button type="button" data-pick="bf">Pick three battlefields</button>.</p>`);
    for (const id of deck.bf) { const c = idx.byId.get(id); if (c) bfSec.appendChild(row(c, 1, 'bf', an)); }
    frag.appendChild(bfSec);

    const runeSec = section('Runes', `${pad(n.runes)}/12`);
    const runes = document.createElement('div');
    runes.className = 'runes';
    for (const d of (legend?.domains || Object.keys(deck.runes))) {
      const r = document.createElement('span');
      r.className = 'rune';
      if (!DOMAIN_CLASS[d]) continue;
      r.innerHTML = `<i class="dot" style="background:var(--${DOMAIN_CLASS[d]})"></i><span></span>`;
      r.querySelector('span').textContent = d;
      r.appendChild(makeFlap(pad(deck.runes[d] || 0), ''));
      runes.appendChild(r);
    }
    if (legend) runes.insertAdjacentHTML('beforeend', `<button class="key small quiet" type="button" data-pick="runes">Adjust</button>`);
    runeSec.appendChild(runes);
    frag.appendChild(runeSec);

    const zoneRows = (zone, title, count, hint) => {
      const list = Object.entries(deck[zone]).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c);
      const sec = section(title, count);
      sec.dataset.zone = zone;
      if (!list.length) sec.insertAdjacentHTML('beforeend', `<p class="hint">${hint}</p>`);
      for (const [c, k] of list.sort(([a], [b]) => a.C - b.C || a.name.localeCompare(b.name))) sec.appendChild(row(c, k, zone, an));
      frag.appendChild(sec);
    };
    if (legend) {
      zoneRows('side', 'Sideboard', `${pad(n.side)}/10`, 'Optional, up to ten cards. Right click a card in the deck to move it here.');
      const benched = Object.values(deck.bench).reduce((x, y) => x + y, 0);
      zoneRows('bench', 'Bench', benched ? pad(benched) : undefined, 'Park cards you are weighing up. Not part of the list, saved with the deck.');
    }
    body.replaceChildren(frag);
    for (const [key, el] of rowEls) if (!el.isConnected) rowEls.delete(key);
    for (const [key, el] of stackEls) if (!el.isConnected) stackEls.delete(key);
    if (cascade && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.querySelectorAll('.sc').forEach((el, i) => el.animate([{ transform: 'translateY(-18px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 360, delay: Math.min(i * 14, 420), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    }
    cascade = false;
  }

  /** Wipe a row out before the deck change removes it. */
  function exitRow(id, zone) {
    const r = rowEls.get(`${zone}:${id}`);
    if (!r || !r.isConnected || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
    return r.animate([{ clipPath: 'inset(0 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 100%)', opacity: 0.3 }],
      { duration: 170, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' }).finished.catch(() => {});
  }

  return { render, exitRow };
}
