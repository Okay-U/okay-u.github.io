// Test room: energy and power curves, domain split, value spread, sample opening hands with mulligan, opening odds.
import { img, esc, DOMAIN_CLASS } from './data.js';
import { makeFlap, hydrateFlaps } from './flap.js';

const HAND = 4;           // opening hand in Riftbound
const MULLIGAN_MAX = 2;   // cards you may recycle and redraw once

function choose(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
/** P(at least one hit in `draws` cards) from `deck` cards with `hits` successes (hypergeometric). */
const atLeastOne = (deck, hits, draws) => { const d = Math.min(draws, deck); return deck <= 0 || d <= 0 ? 0 : 1 - choose(deck - hits, d) / choose(deck, d); };
/** P(at least `k` hits in `draws` cards). */
function atLeast(deck, hits, draws, k) {
  const d = Math.min(draws, deck);
  if (deck <= 0 || d <= 0 || hits <= 0) return k <= 0 ? 1 : 0;
  let p = 0;
  for (let x = Math.max(k, 0); x <= Math.min(hits, d); x++) p += (choose(hits, x) * choose(deck - hits, d - x)) / choose(deck, d);
  return Math.min(1, p);
}

export function createTest({ root, idx, store, ui }) {
  let hand = [];
  let library = [];
  let marked = new Set();
  let mulliganed = false;

  let pickedE = null;
  root.innerHTML = `<h2><span data-flap="TEST BENCH"></span></h2><p class="lede">Curves, the shape of the list, and sample opening hands. The chosen champion starts in its own zone, so hands draw from the other 39 cards.</p>
    <div class="gauges heads" data-heads></div>
    <div class="charts" data-charts></div>
    <div class="curvecards" data-curve hidden></div>
    <section class="rsec"><h3>Sample hand</h3>
      <div class="agent-actions"><button class="key amber" type="button" data-draw>Draw 4</button><button class="key" type="button" data-mull disabled>Mulligan marked</button><button class="key quiet" type="button" data-next>Draw next</button><span class="meta-line" data-hint>Tap up to two cards to mark them for the mulligan.</span></div>
      <div class="hand" data-hand></div></section>
    <section class="rsec"><h3>Opening odds</h3><div class="odds" data-odds></div></section>
    <section class="rsec"><h3>Draw odds calculator</h3>
      <div class="calc" data-calc>
        <label>Card <select class="sel" data-c="card"><option value="">Pick a card or set copies</option></select></label>
        <label>Copies in deck <input type="number" min="0" max="40" value="3" data-c="hits"></label>
        <label>Cards seen <input type="number" min="1" max="40" value="5" data-c="seen"></label>
        <label>At least <input type="number" min="1" max="12" value="1" data-c="k"></label>
        <output data-c="out"></output>
        <p class="meta-line">Four cards in the opening hand, one more each turn. Two seen on turn 1 going second? Count them in.</p>
      </div></section>`;
  hydrateFlaps(root);
  const $ = (s) => root.querySelector(s);

  function cardsInDeck() {
    const d = store.getDeck();
    const out = [];
    for (const [id, n] of Object.entries(d.main)) { const c = idx.byId.get(id); if (c && id !== d.champion) for (let i = 0; i < n; i++) out.push(c); }
    if (d.champion && d.main[d.champion]) { const c = idx.byId.get(d.champion); for (let i = 0; i < d.main[d.champion]; i++) out.push(c); }
    return out;
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function draw() {
    library = shuffle(cardsInDeck());
    hand = library.splice(0, HAND);
    marked = new Set(); mulliganed = false;
    paintHand(true);
  }
  function mulligan() {
    if (!marked.size || mulliganed) return;
    const keep = hand.filter((_, i) => !marked.has(i));
    const back = hand.filter((_, i) => marked.has(i));
    const fresh = library.splice(0, back.length);
    library.push(...back); // recycled to the bottom
    hand = [...keep, ...fresh];
    marked = new Set(); mulliganed = true;
    paintHand(true);
  }
  function next() { if (!library.length) return; hand.push(library.shift()); paintHand(true, hand.length - 1); }

  function paintHand(animate, only = -1) {
    const el = $('[data-hand]');
    el.replaceChildren(...hand.map((c, i) => {
      const f = document.createElement('figure');
      f.className = `card${marked.has(i) ? ' mull' : ''}`;
      f.dataset.i = i;
      f.innerHTML = `<img alt="${esc(c.name)}" src="${esc(img(c, 300))}">`;
      if (animate && (only < 0 || only === i) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        f.animate([{ transform: 'translateY(24px) rotate(-2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 420, delay: only < 0 ? i * 70 : 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      }
      return f;
    }));
    $('[data-mull]').disabled = !marked.size || mulliganed;
    $('[data-hint]').textContent = !hand.length ? 'Add cards to the main deck first.' : mulliganed ? `Mulligan done. ${library.length} cards left in the deck.` : 'Tap up to two cards to mark them for the mulligan.';
  }

  function calc() {
    const v = (k) => Math.max(0, Math.trunc(Number(root.querySelector(`[data-c="${k}"]`).value)) || 0);
    const N = cardsInDeck().length;
    const p = atLeast(N, Math.min(v('hits'), N), v('seen'), Math.max(1, v('k')));
    const out = root.querySelector('[data-c="out"]');
    out.replaceChildren(makeFlap(N ? `${String(Math.round(p * 100)).padStart(3, ' ')}%` : ' -- ', p >= 0.8 ? 'up' : p < 0.5 ? 'down' : ''));
  }
  root.addEventListener('input', (e) => {
    if (e.target.dataset.c === 'card') {
      const id = e.target.value;
      if (id) root.querySelector('[data-c="hits"]').value = cardsInDeck().filter((c) => c.id === id).length;
    }
    if (e.target.closest('[data-calc]')) calc();
  });

  root.addEventListener('click', (e) => {
    const col = e.target.closest('[data-e]');
    if (col) { pickedE = pickedE === col.dataset.e ? null : col.dataset.e; paintCurve(); return; }
    const open = e.target.closest('[data-open]');
    if (open) { ui.openCard(open.dataset.open); return; }
    if (e.target.closest('[data-draw]')) { draw(); return; }
    if (e.target.closest('[data-mull]')) { mulligan(); return; }
    if (e.target.closest('[data-next]')) { if (!hand.length) draw(); else next(); return; }
    const f = e.target.closest('.hand .card');
    if (f && !mulliganed) {
      const i = +f.dataset.i;
      if (marked.has(i)) marked.delete(i); else if (marked.size < MULLIGAN_MAX && i < HAND) marked.add(i);
      paintHand(false);
    }
  });

  function bars(title, groups, keys, colorOf, labelOf) {
    const total = (k) => Object.values(groups[k] || {}).reduce((a, b) => a + b, 0);
    const max = Math.max(4, ...keys.map(total));
    let delay = 0;
    const cols = keys.map((k) => {
      const cells = [];
      for (const [part, n] of Object.entries(groups[k] || {})) for (let i = 0; i < n; i++) {
        cells.push(`<i style="background:${colorOf(part)};animation-delay:${Math.min(delay, 520)}ms" title="${esc(labelOf(k))}: ${esc(part)}"></i>`);
        delay += 14;
      }
      return `<div class="col"${title === 'Energy curve' ? ` data-e="${k}" role="button" tabindex="0" aria-label="Show the ${total(k)} cards at ${esc(labelOf(k))} energy"` : ''}><b>${total(k) || ''}</b><div class="stack" style="--max:${max}">${cells.join('')}</div><span>${esc(labelOf(k))}</span></div>`;
    }).join('');
    // the energy curve's bars are buttons, so it is a group rather than an image
    return `<div class="chart"><h3><span>${title}</span></h3><div class="bars" role="${title === 'Energy curve' ? 'group' : 'img'}" aria-label="${esc(title)}">${cols}</div></div>`;
  }

  function render(analysis) {
    const deck = cardsInDeck();
    const d = store.getDeck();
    const champ = d.champion ? idx.byId.get(d.champion) : null;
    const all = champ ? [champ, ...deck] : deck;
    const energy = {}, power = {}, type = {}, value = {};
    for (const c of all) {
      const e = Math.min(c.E, 7); const dom = c.domains[0] || 'Colorless';
      energy[e] = energy[e] || {}; energy[e][dom] = (energy[e][dom] || 0) + 1;
      const p = Math.min(c.P, 3); power[p] = power[p] || {}; power[p][dom] = (power[p][dom] || 0) + 1;
      type[c.type] = type[c.type] || {}; type[c.type][dom] = (type[c.type][dom] || 0) + 1;
    }
    if (analysis) for (const r of analysis.rows) {
      if (r.deckAmber === null) continue;
      const b = r.deckAmber < 0.86 ? 'under' : r.deckAmber <= 1.17 ? 'on' : r.deckAmber < 1.5 ? 'above' : 'far';
      value[b] = value[b] || {}; value[b].cards = (value[b].cards || 0) + r.n;
    }
    const domColor = (dname) => (DOMAIN_CLASS[dname] ? `color-mix(in srgb, var(--${DOMAIN_CLASS[dname]}) 74%, #16171a)` : '#6d6a63');
    const bandColor = { cards: 'var(--amber)' };
    $('[data-charts]').innerHTML = [
      bars('Energy curve', energy, [0, 1, 2, 3, 4, 5, 6, 7], domColor, (k) => (k === 7 ? '7+' : String(k))),
      bars('Power', power, [0, 1, 2, 3], domColor, (k) => (k === 3 ? '3+' : String(k))),
      bars('Types', type, ['Unit', 'Spell', 'Gear'], domColor, (k) => k),
      bars('Value in this deck', value, ['under', 'on', 'above', 'far'], (p) => bandColor[p] || 'var(--amber)', (k) => ({ under: '<0.86', on: 'on curve', above: '>1.17', far: '≥1.5' }[k])),
    ].join('');

    const N = deck.length;
    const count = (pred) => deck.filter(pred).length;
    const early = count((c) => c.type === 'Unit' && c.E <= 2);
    const removal = count((c) => (c.model?.r || []).includes('removal'));
    const draw = count((c) => (c.model?.r || []).some((r) => r === 'draw' || r === 'cantrip'));
    const odds = [
      [`A unit costing 2 or less in the opening ${HAND} (${early} in deck)`, atLeastOne(N, early, HAND)],
      [`…after a two-card mulligan`, atLeastOne(N, early, HAND + 2)],
      [`Removal by your turn 3 (${removal} in deck, ${HAND + 3} cards seen)`, atLeastOne(N, removal, HAND + 3)],
      [`Card draw by turn 3 (${draw} in deck)`, atLeastOne(N, draw, HAND + 3)],
    ];
    const units = all.filter((c) => c.type === 'Unit').length;
    const heads = [['Cards', String(all.length)], ['Avg energy', all.length ? (all.reduce((a, c) => a + c.E, 0) / all.length).toFixed(1) : ' -- '],
      ['Avg power', all.length ? (all.reduce((a, c) => a + c.P, 0) / all.length).toFixed(1) : ' -- '], ['Units', String(units)],
      ['In this deck', analysis?.metrics.inDeck ? analysis.metrics.inDeck.toFixed(2) : ' -- ']];
    $('[data-heads]').replaceChildren(...heads.map(([l, v]) => {
      const g = document.createElement('div');
      g.className = 'gauge';
      g.innerHTML = `<span class="lbl">${l}</span>`;
      g.appendChild(makeFlap(v, l === 'In this deck' ? 'amber' : ''));
      return g;
    }));
    paintCurve();
    const sel = root.querySelector('[data-c="card"]');
    const keep = sel.value;
    const uniq = [...new Map(all.map((c) => [c.id, c])).values()].sort((a, b) => a.name.localeCompare(b.name));
    sel.innerHTML = `<option value="">Pick a card or set copies</option>${uniq.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}`;
    sel.value = uniq.some((c) => c.id === keep) ? keep : '';
    if (sel.value) root.querySelector('[data-c="hits"]').value = cardsInDeck().filter((c) => c.id === sel.value).length;
    calc();
    $('[data-odds]').innerHTML = '';
    for (const [label, p] of odds) {
      const tr = document.createElement('div');
      tr.className = 'tr';
      tr.innerHTML = `<span>${esc(label)}</span>`;
      tr.appendChild(makeFlap(N ? `${String(Math.round(p * 100)).padStart(3, ' ')}%` : ' -- ', p >= 0.8 ? 'up' : p < 0.5 ? 'down' : ''));
      $('[data-odds]').appendChild(tr);
    }
    if (!hand.length) paintHand(false);
  }

  /** Moxfield-style: click a curve bar to list the cards at that energy. */
  function paintCurve() {
    root.querySelectorAll('[data-e]').forEach((c) => c.classList.toggle('picked', c.dataset.e === pickedE));
    const box = $('[data-curve]');
    if (pickedE === null) { box.hidden = true; return; }
    const d = store.getDeck();
    const e = Number(pickedE);
    const list = [...(d.champion ? [[d.champion, 1 + (d.main[d.champion] || 0)]] : []), ...Object.entries(d.main).filter(([id]) => id !== d.champion)]
      .map(([id, n]) => [idx.byId.get(id), n]).filter(([c]) => c && (e === 7 ? c.E >= 7 : c.E === e)).sort(([a], [b]) => a.name.localeCompare(b.name));
    box.hidden = false;
    box.innerHTML = `<h3>${e === 7 ? '7+' : e} energy · ${list.reduce((a, [, n]) => a + n, 0)} cards</h3>${list.length ? `<div class="cc">${list.map(([c, n]) =>
      `<button type="button" data-open="${esc(c.id)}"><img alt="" src="${esc(img(c, 200))}"><span>${n}× ${esc(c.name)}</span></button>`).join('')}</div>` : '<p class="meta-line">No cards at this cost.</p>'}`;
  }

  root.addEventListener('keydown', (e) => {
    const col = e.target.closest('[data-e]');
    if (col && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); col.click(); }
  });

  return { render, draw };
}
