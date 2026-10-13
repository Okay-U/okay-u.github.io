// The deck panel's Deck tab: identity, counts, quick add, the value band and the main deck as card thumbnails, rows
// or stacks, then runes, battlefields, sideboard and bench. Values are per cost against the AMBER band.
import { img, esc, DOMAIN_CLASS } from './data.js';
import { counts, LIMITS, autoRunes } from './rules.js';
import { setNum, makeNum, fmtRatio, band, valueBar } from './num.js';
import { baseValue, marginal } from './agent/engine.js';
import { createMenu } from './menu.js';
import { createQuickAdd } from './quickadd.js';
import { energyGlyph, runeGlyph, typeGlyph, costGlyphs } from './glyphs.js';
import { GROUPS, SORTS, VIEWS, loadPrefs, savePrefs, groupEntries } from './deckview.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ZONE_TITLE = { main: 'Main deck', side: 'Sideboard', bench: 'Bench' };

export function createBoard({ root, idx, store, ui }) {
  root.innerHTML = `
    <div class="dhead"><div class="ident" data-ident></div><div class="chips" data-chips></div></div>
    <div class="qslot"></div>
    <div class="dbody"></div>
    <div class="dfoot">
      <button class="btn quiet" type="button" data-undo>Undo</button>
      <button class="btn quiet" type="button" data-export>Copy list</button>
      <button class="btn quiet" type="button" data-new>New deck</button>
      <button class="btn quiet" type="button" data-clear>Clear main</button>
      <span class="grow"></span>
      <button class="btn primary" type="button" data-run>Run the coach</button>
    </div>`;
  const body = root.querySelector('.dbody');
  const identEl = root.querySelector('[data-ident]');
  const chipsEl = root.querySelector('[data-chips]');
  createQuickAdd({ mount: root.querySelector('.qslot'), idx, store, ui });
  const rowEls = new Map();
  const cardEls = new Map();
  const stackEls = new Map();
  const prefs = loadPrefs();
  let lastAn = null;
  let cascade = false;
  const setPref = (k, v) => {
    prefs[k] = v; savePrefs(prefs);
    cascade = k === 'view' && v !== 'rows';
    render(lastAn);
  };

  // ---- menus ----
  const menu = createMenu();
  /** Menu items for a card in a zone; moves carry every copy. */
  function rowItems(id, zone) {
    const n = store.getDeck()[zone]?.[id] || 0;
    const badge = n > 1 ? `×${n}` : '';
    const add = { label: 'Add one', run: () => ui.addCard(id, zone) };
    const dec = { label: zone === 'bf' ? 'Remove' : 'Remove one', run: () => ui.removeCard(id, zone) };
    const to = (z, label) => ({ label, badge, run: () => ui.moveCard(id, zone, z) });
    const info = { label: 'Card details', run: () => ui.openCard(id) };
    const partners = { label: 'Show partners', run: () => ui.showPartners(id) };
    return {
      main: [add, dec, null, to('side', 'Move to sideboard'), to('bench', 'Move to bench'), null, info, partners],
      side: [add, dec, null, to('main', 'Move to main deck'), to('bench', 'Move to bench'), null, info],
      bench: [add, dec, null, to('main', 'Move to main deck'), to('side', 'Move to sideboard'), null, info, partners],
      bf: [dec, info],
    }[zone] || [];
  }
  /** Open the menu at the pointer, or under the element when opened from the keyboard (and focus it). */
  const openMenu = (el, e, keyboard) => {
    const b = el.getBoundingClientRect();
    menu.open(rowItems(el.dataset.id, el.dataset.zone), keyboard ? b.left + 24 : e.clientX, keyboard ? b.top + 26 : e.clientY, { focus: keyboard });
  };
  root.addEventListener('contextmenu', (e) => {
    const r = e.target.closest('.row, .sc, .cc, .bf:not(.empty)');
    if (!r) return;
    e.preventDefault();
    openMenu(r, e, e.button !== 2);
  });
  root.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('.sc, .cc, .bf:not(.empty)');
    if (el && e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openMenu(el, e, true); }
  });
  root.addEventListener('change', (e) => {
    const f = e.target.dataset.pref;
    if (f) setPref(f, e.target.value);
  });

  // ---- drag and drop: gallery cards in, board cards between main deck, sideboard and bench ----
  const CARD = 'application/x-riftcount-card';
  const MOVE = 'application/x-riftcount-move';
  const dropZone = (e) => e.target.closest?.('.dsec[data-zone]')?.dataset.zone || 'main';
  let lit = null;
  const light = (sec) => { if (lit === sec) return; lit?.classList.remove('drop'); lit = sec; sec?.classList.add('drop'); };
  root.addEventListener('dragstart', (e) => {
    const r = e.target.closest?.('.row[draggable="true"], .sc, .cc');
    if (!r) return;
    e.dataTransfer.setData(MOVE, `${r.dataset.zone}:${r.dataset.id}`);
    e.dataTransfer.effectAllowed = 'move';
  });
  root.addEventListener('dragover', (e) => {
    const types = [...e.dataTransfer.types];
    if (!types.includes(CARD) && !types.includes(MOVE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = types.includes(MOVE) ? 'move' : 'copy';
    light(root.querySelector(`.dsec[data-zone="${dropZone(e)}"]`));
  });
  root.addEventListener('dragleave', (e) => { if (!root.contains(e.relatedTarget)) light(null); });
  root.addEventListener('drop', (e) => {
    const card = e.dataTransfer.getData(CARD);
    const move = e.dataTransfer.getData(MOVE);
    if (!card && !move) return;
    e.preventDefault();
    const zone = dropZone(e);
    light(null);
    if (card) ui.addCard(card, zone, { playset: e.shiftKey });
    else { const [from, id] = move.split(':'); if (from !== zone) ui.moveCard(id, from, zone, { n: e.shiftKey ? Infinity : 1 }); } // one copy, Shift moves all
  });
  addEventListener('dragend', () => light(null));

  // ---- clicks ----
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
    const rune = e.target.closest('[data-rune]');
    if (rune) { ui.shiftRune(rune.dataset.rune, Number(rune.dataset.d)); return; }
    if (e.target.closest('[data-runes-auto]')) {
      const r = autoRunes(store.getDeck(), idx);
      if (r) { store.update((d) => { d.runes = r; }, 'runes'); ui.toast(`Runes split by power costs: ${Object.entries(r).map(([k, v]) => `${v} ${k}`).join(', ')}.`); }
      return;
    }
    const tgt = e.target.closest('[data-target]');
    if (tgt) { ui.setTarget(tgt.dataset.target); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { ui.goBuild(pick.dataset.pick); return; }
    const view = e.target.closest('[data-view]');
    if (view) { if (prefs.view !== view.dataset.view) setPref('view', view.dataset.view); return; }
    if (e.target.closest('[data-values]')) { setPref('values', !prefs.values); return; }
    const g = e.target.closest('[data-gkey]');
    if (g) {
      const k = g.dataset.gkey;
      setPref('collapsed', prefs.collapsed.includes(k) ? prefs.collapsed.filter((x) => x !== k) : [...prefs.collapsed, k]);
      return;
    }
    const step = e.target.closest('[data-step]');
    if (step) {
      const holder = step.closest('.cc');
      if (step.dataset.step === '1') ui.addCard(holder.dataset.id, 'main'); else ui.removeCard(holder.dataset.id, 'main');
      return;
    }
    const cell = e.target.closest('.sc, .cc, .bf');
    if (cell) { openMenu(cell, e, e.detail === 0); return; }
    const row = e.target.closest('.row');
    if (!row) return;
    const id = row.dataset.id;
    const zone = row.dataset.zone;
    if (e.target.closest('[data-inc]')) { ui.addCard(id, zone); return; }
    if (e.target.closest('[data-dec]')) { ui.removeCard(id, zone); return; }
    const more = e.target.closest('[data-menu]');
    if (more) { const b = more.getBoundingClientRect(); menu.open(rowItems(id, zone), b.right, b.bottom, { focus: e.detail === 0 }); return; }
    if (e.target.closest('.nm')) ui.openCard(id);
  });

  // ---- pieces ----
  function section(zone, title, count, { target = null, extra = '' } = {}) {
    const s = document.createElement('section');
    s.className = 'dsec';
    if (zone) s.dataset.zone = zone;
    // main deck, sideboard and bench headings pick where gallery clicks add cards (Piltover-style)
    const on = target && ui.getTarget() === target;
    const heading = target
      ? `<button class="tgt${on ? ' on' : ''}" type="button" data-target="${target}" aria-pressed="${on}" title="${on ? 'Gallery clicks add here' : 'Make gallery clicks add here'}"><span>${title}</span>${count ? `<span class="cnt">${count}</span>` : ''}${on ? '<small>Adding here</small>' : ''}</button>`
      : `<span>${title}</span>${count ? `<span class="cnt">${count}</span>` : ''}`;
    s.innerHTML = `<header class="sh"><h3>${heading}</h3>${extra}</header>`;
    return s;
  }

  /** Symbol for a group heading: the type, the energy or the domain the group stands for. */
  function groupGlyph(g) {
    const c = g.list[0]?.[0];
    if (!c) return '';
    const kind = g.key.split(':')[0];
    if (kind === 'type') return typeGlyph(c.type);
    if (kind === 'energy') return energyGlyph(Math.min(c.E, 7));
    if (kind === 'domain') return (c.domains.length ? c.domains : ['Colorless']).map((d) => runeGlyph(d)).join('');
    return '';
  }

  /** Values for a card in a zone: main reads the analysis; sideboard and bench show what it would be worth in the main deck. */
  function valuesOf(card, zone, an) {
    const a = zone === 'main' ? an?.rows.find((x) => x.card.id === card.id) : (an && marginal(card, an, store.getDeck()));
    const ledger = a ? a.ledger : ['side', 'bench'].includes(zone) ? baseValue(card).ledger : null;
    return { a, ledger, inDeck: a ? a.deckAmber : null };
  }

  function row(card, n, zone, an) {
    const key = `${zone}:${card.id}`;
    let r = rowEls.get(key);
    const fresh = !r;
    if (!r) {
      r = document.createElement('div');
      r.className = 'row';
      r.dataset.id = card.id; r.dataset.zone = zone;
      if (['main', 'side', 'bench'].includes(zone)) r.draggable = true;
      r.innerHTML = `<span class="q"></span><span class="cost"></span><span class="nmw"><button class="nm" type="button"></button><span class="bar"></span></span>
        <span class="val"></span>
        <span class="ctl"><button class="ib" type="button" data-dec aria-label="Remove one">−</button><button class="ib" type="button" data-inc aria-label="Add one">+</button><button class="ib" type="button" data-menu aria-haspopup="menu" aria-label="More actions">⋯</button></span>`;
      r.querySelector('.q').appendChild(makeNum(''));
      r.querySelector('.val').appendChild(makeNum(''));
      rowEls.set(key, r);
    }
    r.getAnimations().forEach((x) => x.cancel());
    r.querySelector('.nm').textContent = card.name;
    r.querySelector('.cost').innerHTML = costGlyphs(card);
    const { a, inDeck } = valuesOf(card, zone, an);
    setNum(r.querySelector('.q .num'), `${n}`, { animate: !fresh });
    setNum(r.querySelector('.val .num'), fmtRatio(inDeck), { animate: !fresh, cls: band(inDeck) });
    r.querySelector('.bar').innerHTML = prefs.values && zone !== 'bf' ? valueBar(inDeck) : '';
    r.querySelector('.val').title = ['side', 'bench'].includes(zone) ? 'Value per cost if it joined the main deck'
      : a?.links?.length ? `In this deck: ${a.bonus >= 0 ? '+' : ''}${a.bonus.toFixed(2)} C from partners` : 'Value per cost in this deck';
    if (fresh && !reduced()) r.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    return r;
  }

  /** A main-deck card as a thumbnail with its count, value and (pointer) − / + controls. */
  function cardCell(card, n, an) {
    let c = cardEls.get(card.id);
    const fresh = !c;
    if (!c) {
      c = document.createElement('div'); // not a <button>: Firefox will not drag buttons
      c.setAttribute('role', 'button');
      c.tabIndex = 0;
      c.className = 'cc';
      c.dataset.id = card.id; c.dataset.zone = 'main';
      c.draggable = true;
      c.innerHTML = `<span class="cart"><img alt="" decoding="async" loading="lazy" src="${esc(img(card, 200))}"><span class="ccount"></span>
        <span class="cstep" aria-hidden="true"><button type="button" tabindex="-1" data-step="-1">−</button><button type="button" tabindex="-1" data-step="1">+</button></span></span>
        <span class="cval"></span>`;
      cardEls.set(card.id, c);
    }
    const { inDeck } = valuesOf(card, 'main', an);
    c.querySelector('.ccount').textContent = `×${n}`;
    c.querySelector('.cval').innerHTML = `<span class="num ${band(inDeck)}">${fmtRatio(inDeck)}</span>${prefs.values ? valueBar(inDeck) : ''}`;
    c.setAttribute('aria-label', `${n} × ${card.name}, ${card.E} energy, value ${fmtRatio(inDeck)} in this deck. Open actions.`);
    c.title = card.name;
    if (fresh && !reduced()) c.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    return c;
  }

  function stackCard(card, n, an) {
    let s = stackEls.get(card.id);
    if (!s) {
      s = document.createElement('div'); // not a <button>: Firefox will not drag buttons
      s.setAttribute('role', 'button');
      s.tabIndex = 0;
      s.className = 'sc';
      s.dataset.id = card.id; s.dataset.zone = 'main';
      s.draggable = true;
      s.innerHTML = `<img alt="" decoding="async" src="${esc(img(card, 300))}"><span class="sl"><span class="sq"></span><span class="sn"></span><span class="num"></span></span>`;
      s.querySelector('.sn').textContent = card.name;
      stackEls.set(card.id, s);
    }
    const { inDeck } = valuesOf(card, 'main', an);
    s.querySelector('.sq').textContent = `${n}×`;
    setNum(s.querySelector('.sl .num'), fmtRatio(inDeck), { animate: s.isConnected, cls: band(inDeck) });
    s.setAttribute('aria-label', `${n} × ${card.name}, ${card.E} energy. In this deck ${fmtRatio(inDeck)}. Open actions.`);
    return s;
  }

  function groupHead(g, shut) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'grp';
    b.dataset.gkey = g.key;
    b.setAttribute('aria-expanded', String(!shut));
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>${groupGlyph(g)}<span></span><span class="cnt"></span>`;
    b.querySelector('span:not(.cnt)').textContent = g.label;
    b.querySelector('.cnt').textContent = g.count;
    return b;
  }

  function viewBar() {
    const bar = document.createElement('div');
    bar.className = 'vbarrow';
    const opt = (list, cur) => list.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('');
    bar.innerHTML = `<div class="segc small" role="group" aria-label="Deck view">${VIEWS.map(([k, l]) =>
      `<button type="button" data-view="${k}" aria-pressed="${prefs.view === k}">${l}</button>`).join('')}</div>
      <select class="sel small" data-pref="group" aria-label="Group by">${opt(GROUPS.map(([k, l]) => [k, k === 'none' ? l : `By ${l.toLowerCase()}`]), prefs.group)}</select>
      <select class="sel small" data-pref="sort" aria-label="Sort by">${opt(SORTS.map(([k, l]) => [k, `Sort: ${l}`]), prefs.sort)}</select>
      <button class="toggle" type="button" data-values aria-pressed="${prefs.values}" title="Show or hide value bars">Values</button>`;
    return bar;
  }

  /** Value band: the deck's value per cost against Riot's ledger, with the energy curve. */
  function valueBand(deck, an) {
    const ind = an.metrics.inDeck, lg = an.metrics.ledger;
    const champ = deck.champion ? idx.byId.get(deck.champion) : null;
    const all = [...(champ ? [champ] : []), ...Object.entries(deck.main).flatMap(([id, k]) => Array(k).fill(idx.byId.get(id)))].filter(Boolean);
    const curve = Array.from({ length: 8 }, (_, e) => all.filter((c) => (e === 7 ? c.E >= 7 : c.E === e)).length);
    const top = Math.max(...curve, 1);
    const pct = ind !== null && lg ? Math.round((ind / lg - 1) * 100) : null;
    const el = document.createElement('section');
    el.className = 'vband';
    el.innerHTML = `<div class="vb-main"><div class="vb-num num ${band(ind)}">${fmtRatio(ind)}</div><div class="vb-lbl">value per cost in this deck</div>
        ${valueBar(ind)}
        <p>${lg !== null ? `Riot's ledger prices this list at ${fmtRatio(lg)}${pct !== null ? `; partners in the deck move it ${pct >= 0 ? '+' : ''}${pct}%` : ''}. ` : ''}Average energy ${an.metrics.avgEnergy.toFixed(1)}.</p></div>
      <div class="curve" role="img" aria-label="Energy curve: ${curve.map((v, e) => `${v} at ${e === 7 ? '7 or more' : e}`).join(', ')}">
        ${curve.map((v, e) => `<div><em>${v || ''}</em><span style="height:${Math.round((v / top) * 100)}%"></span><b>${e === 7 ? '7+' : e}</b></div>`).join('')}</div>`;
    return el;
  }

  function identity(deck) {
    const legend = deck.legend ? idx.byId.get(deck.legend) : null;
    const champ = deck.champion ? idx.byId.get(deck.champion) : null;
    if (!legend) {
      identEl.innerHTML = `<div class="emptyid"><p><b>Start with a legend.</b> It sets your two domains and the champion you can choose.</p>
        <button class="btn primary" type="button" data-pick="legend">Pick a legend</button> <button class="btn" type="button" data-import-hint>Import a deck</button></div>`;
      identEl.querySelector('[data-import-hint]').addEventListener('click', () => ui.importList());
      return;
    }
    const dots = legend.domains.map((d) => `<span>${runeGlyph(d)}${esc(d)}</span>`).join('');
    identEl.innerHTML = `
      <button class="thumb" type="button" data-pick="legend" title="Change the legend"><img alt="" src="${esc(img(legend, 200))}"><span class="sr">Change the legend</span></button>
      ${champ ? `<button class="thumb" type="button" data-pick="champion" title="Change the chosen champion"><img alt="" src="${esc(img(champ, 200))}"><span class="sr">Change the chosen champion</span></button>`
        : `<button class="thumb empty" type="button" data-pick="champion"><span>Champion</span></button>`}
      <div class="idtext"><h2></h2><p class="sub"></p><div class="doms">${dots}</div></div>`;
    identEl.querySelector('h2').textContent = legend.name;
    identEl.querySelector('.sub').textContent = champ ? `${champ.name} · chosen champion` : `Choose a ${legend.champ} champion`;
  }

  function chips(deck, an) {
    const n = counts(deck);
    const chip = (label, have, need, max = need) => {
      const cls = have > max ? 'over' : have === need ? 'ok' : '';
      return `<span class="chip ${cls}">${label} <b>${have}/${need}</b></span>`;
    };
    chipsEl.innerHTML = deck.legend ? [chip('Main', n.main, LIMITS.main), chip('Runes', n.runes, LIMITS.runes), chip('Battlefields', n.bf, LIMITS.battlefields),
      `<span class="chip ${n.side > LIMITS.side ? 'over' : ''}">Sideboard <b>${n.side}/${LIMITS.side}</b></span>`,
      an?.metrics.inDeck !== null && an?.metrics.inDeck !== undefined ? `<span class="chip">Value <b class="${band(an.metrics.inDeck)}">${fmtRatio(an.metrics.inDeck)}</b></span>` : ''].join('') : '';
  }

  // ---- focus survives re-renders ----
  function focusKey() {
    const a = document.activeElement;
    if (!a || !root.contains(a)) return null;
    if (a.dataset.rune !== undefined) return `[data-rune="${CSS.escape(a.dataset.rune)}"][data-d="${CSS.escape(a.dataset.d)}"]`;
    for (const k of ['pref', 'view', 'gkey', 'target', 'pick']) if (a.dataset[k] !== undefined) return `[data-${k}="${CSS.escape(a.dataset[k])}"]`;
    if (a.hasAttribute('data-runes-auto')) return '[data-runes-auto]';
    if (a.hasAttribute('data-values')) return '[data-values]';
    const holder = a.closest('.row, .sc, .cc, .bf');
    if (!holder) return null;
    const own = `.${holder.classList[0]}[data-zone="${holder.dataset.zone}"][data-id="${CSS.escape(holder.dataset.id)}"]`;
    const part = ['data-inc', 'data-dec', 'data-menu'].find((x) => a.hasAttribute(x)) || (a.classList.contains('nm') ? 'nm' : null);
    return { own, part, zone: holder.dataset.zone };
  }
  function restoreFocus(k) {
    if (!k) return;
    let el;
    if (typeof k === 'string') el = root.querySelector(k);
    else {
      const holder = root.querySelector(k.own);
      el = holder && k.part ? holder.querySelector(k.part === 'nm' ? '.nm' : `[${k.part}]`) : holder;
      el ||= root.querySelector(`.dsec[data-zone="${k.zone}"] .row .nm, .dsec[data-zone="${k.zone}"] .cc, .dsec[data-zone="${k.zone}"] .sc`);
    }
    el?.focus({ preventScroll: true });
  }

  // ---- render ----
  function render(an) {
    lastAn = an;
    const deck = store.getDeck();
    const keep = focusKey();
    const n = counts(deck);
    const legend = deck.legend ? idx.byId.get(deck.legend) : null;
    const champ = deck.champion ? idx.byId.get(deck.champion) : null;
    identity(deck);
    chips(deck, an);
    root.querySelector('.qslot').hidden = !legend;
    const frag = document.createDocumentFragment();

    const entries = Object.entries(deck.main).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c);
    if (legend && an && entries.length && prefs.values) frag.appendChild(valueBand(deck, an));

    const mainSec = section('main', ZONE_TITLE.main, legend ? `${n.main}/${LIMITS.main}` : '', { target: legend ? 'main' : null });
    if (!legend) mainSec.insertAdjacentHTML('beforeend', '<p class="hint">Pick a legend first; the gallery then shows the cards it can play.</p>');
    else if (!entries.length) mainSec.insertAdjacentHTML('beforeend', `<p class="hint">${champ ? 'Add' : '<button class="link" type="button" data-pick="champion">Choose the chosen champion</button>, then add'} cards from the gallery or type a name above. A click adds a copy, Shift adds three, right click or long press shows more.</p>`);
    else {
      mainSec.appendChild(viewBar());
      const groups = groupEntries(entries, prefs, (c) => an?.rows.find((r) => r.card.id === c.id)?.deckAmber ?? null);
      if (prefs.view === 'stacks') {
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
        mainSec.appendChild(wrap);
      } else {
        for (const g of groups) {
          const shut = prefs.collapsed.includes(g.key);
          mainSec.appendChild(groupHead(g, shut));
          if (shut) continue;
          const box = document.createElement('div');
          box.className = prefs.view === 'cards' ? 'cgrid' : 'list';
          for (const [c, k] of g.list) box.appendChild(prefs.view === 'cards' ? cardCell(c, k, an) : row(c, k, 'main', an));
          mainSec.appendChild(box);
        }
      }
    }
    frag.appendChild(mainSec);

    if (legend) {
      const runeSec = section(null, 'Runes', `${n.runes}/${LIMITS.runes}`, { extra: '<button class="link" type="button" data-runes-auto title="Split the twelve runes by the power costs in the main deck">Auto split</button>' });
      const runes = document.createElement('div');
      runes.className = 'runes';
      for (const d of legend.domains) {
        if (!DOMAIN_CLASS[d]) continue;
        const r = document.createElement('div');
        r.className = 'rune';
        r.innerHTML = `${runeGlyph(d)}<span class="rn"></span>
          <button class="ib" type="button" data-rune="${d}" data-d="-1" aria-label="One ${d} rune fewer">−</button><span class="rc num"></span>
          <button class="ib" type="button" data-rune="${d}" data-d="1" aria-label="One ${d} rune more">+</button>`;
        r.querySelector('.rn').textContent = d;
        r.querySelector('.rc').textContent = deck.runes[d] || 0;
        runes.appendChild(r);
      }
      runeSec.appendChild(runes);
      frag.appendChild(runeSec);

      const bfSec = section(null, 'Battlefields', `${n.bf}/${LIMITS.battlefields}`);
      const fields = document.createElement('div');
      fields.className = 'fields';
      for (let i = 0; i < LIMITS.battlefields; i++) {
        const c = deck.bf[i] ? idx.byId.get(deck.bf[i]) : null;
        fields.insertAdjacentHTML('beforeend', c
          ? `<div class="bf" role="button" tabindex="0" data-id="${esc(c.id)}" data-zone="bf" aria-label="${esc(c.name)}. Open actions."><span class="ph"><img alt="" loading="lazy" src="${esc(img(c, 300))}"></span><span class="bn">${esc(c.name)}</span></div>`
          : '<button class="bf empty" type="button" data-pick="bf"><span class="ph"><span>+</span></span><span class="bn">Add a battlefield</span></button>');
      }
      bfSec.appendChild(fields);
      frag.appendChild(bfSec);

      for (const [zone, hint, count] of [['side', 'Optional, up to ten cards. Move cards here from the deck menu or by dragging.', `${n.side}/${LIMITS.side}`],
        ['bench', 'Park cards you are weighing up. Not part of the list, saved with the deck.', String(Object.values(deck.bench).reduce((x, y) => x + y, 0) || '')]]) {
        const sec = section(zone, ZONE_TITLE[zone], count, { target: zone });
        const list = Object.entries(deck[zone]).map(([id, k]) => [idx.byId.get(id), k]).filter(([c]) => c)
          .sort(([a], [b]) => a.E - b.E || a.name.localeCompare(b.name));
        if (!list.length) sec.insertAdjacentHTML('beforeend', `<p class="hint">${hint}</p>`);
        else {
          const box = document.createElement('div');
          box.className = 'list';
          for (const [c, k] of list) box.appendChild(row(c, k, zone, an));
          sec.appendChild(box);
        }
        frag.appendChild(sec);
      }
    }
    body.replaceChildren(frag);
    restoreFocus(keep);
    for (const m of [rowEls, cardEls, stackEls]) for (const [key, el] of m) if (!el.isConnected) m.delete(key);
    if (cascade && !reduced()) {
      body.querySelectorAll('.sc, .cc').forEach((el, i) => el.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 260, delay: Math.min(i * 10, 300), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    }
    cascade = false;
  }

  /** Fade a row or card out before the deck change removes it. */
  function exitRow(id, zone) {
    const r = rowEls.get(`${zone}:${id}`) || (zone === 'main' ? cardEls.get(id) : null);
    if (!r || !r.isConnected || reduced()) return Promise.resolve();
    return r.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }],
      { duration: 140, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' }).finished.catch(() => {});
  }

  return { render, exitRow };
}
