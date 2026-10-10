// The deck board: the carried object. Pinned on desktop, its own screen on phones.
// Rows show quantity, cost, the ledger price and the price in this deck; values flip when the deck changes.
import { img, esc, DOMAIN_CLASS } from './data.js';
import { counts, LIMITS } from './rules.js';
import { flap, makeFlap, fmtRatio, pad, hydrateFlaps } from './flap.js';

const TYPE_ORDER = ['Unit', 'Spell', 'Gear'];

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
  const strip = document.getElementById('ministrip');
  const S = (k) => strip?.querySelector(`[data-ms="${k}"]`);
  strip?.addEventListener('click', (e) => { if (e.target.closest('[data-ms-run]')) ui.runAgent(); });
  const F = (k) => root.querySelector(`[data-k="${k}"]`);
  const rowEls = new Map();

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
    const row = e.target.closest('.row');
    if (!row) return;
    const id = row.dataset.id;
    const zone = row.dataset.zone;
    if (e.target.closest('[data-inc]')) { ui.addCard(id, zone); return; }
    if (e.target.closest('[data-dec]')) { ui.removeCard(id, zone); return; }
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
        <span class="ctl"><button class="key icon small" type="button" data-dec aria-label="Remove one">−</button><button class="key icon small" type="button" data-inc aria-label="Add one">+</button></span>`;
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
    const a = an?.rows.find((x) => x.card.id === card.id);
    const ledger = a ? a.ledger : null;
    const inDeck = a ? a.deckAmber : null;
    flap(r.querySelector('.q .flap'), `${n}`, { animate: !fresh });
    flap(r.querySelector('.v .flap'), fmtRatio(ledger), { animate: !fresh, cls: ledger === null ? 'dim' : 'amber' });
    const ref = ledger ?? a?.practical ?? null;
    const dir = inDeck === null || ref === null ? '' : inDeck > ref + 0.04 ? 'up' : inDeck < ref - 0.04 ? 'down' : '';
    const mv = r.querySelector('.mv');
    mv.className = `mv ${dir}`;
    mv.querySelector('.tk').textContent = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
    flap(mv.querySelector('.flap'), fmtRatio(inDeck), { animate: !fresh, cls: dir || (inDeck === null ? 'dim' : '') });
    mv.title = a && a.links?.length ? `In this deck: ${a.bonus >= 0 ? '+' : ''}${a.bonus.toFixed(2)} C from partners` : '';
    if (fresh && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      r.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    return r;
  }

  function render(an) {
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
    const entries = Object.entries(deck.main).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c && (!champ || c.id !== champ.id));
    if (!entries.length) mainSec.insertAdjacentHTML('beforeend', `<p class="hint">${legend ? '<button type="button" data-pick="main">Add cards</button> from the gallery. Click adds a copy.' : 'Pick a legend first.'}</p>`);
    if (entries.length) mainSec.insertAdjacentHTML('beforeend', '<div class="rowhead" aria-hidden="true"><span>Qty</span><span>Cost</span><span>Card</span><span>Ledger</span><span>In deck</span></div>');
    for (const type of TYPE_ORDER) {
      const list = entries.filter(([c]) => c.type === type).sort(([a], [b]) => a.C - b.C || a.name.localeCompare(b.name));
      if (!list.length) continue;
      mainSec.insertAdjacentHTML('beforeend', `<div class="grp">${type}s · ${list.reduce((s, [, k]) => s + k, 0)}</div>`);
      for (const [c, k] of list) mainSec.appendChild(row(c, k, 'main', an));
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

    const side = Object.entries(deck.side).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c);
    if (side.length) {
      const sideSec = section('Sideboard', `${pad(n.side)}/10`);
      for (const [c, k] of side.sort(([a], [b]) => a.C - b.C)) sideSec.appendChild(row(c, k, 'side', an));
      frag.appendChild(sideSec);
    }
    body.replaceChildren(frag);
    for (const [key, el] of rowEls) if (!el.isConnected) rowEls.delete(key);
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
