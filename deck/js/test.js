// Test room: energy and power curves, domain split, value spread, sample opening hands with mulligan, opening odds.
import { img, DOMAIN_CLASS } from './data.js';
import { makeFlap, hydrateFlaps } from './flap.js';

const HAND = 4;           // opening hand in Riftbound
const MULLIGAN_MAX = 2;   // cards you may recycle and redraw once
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function choose(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
/** P(at least one hit in `draws` cards) from `deck` cards with `hits` successes (hypergeometric). */
const atLeastOne = (deck, hits, draws) => (deck <= 0 || draws <= 0 ? 0 : 1 - choose(deck - hits, draws) / choose(deck, draws));

export function createTest({ root, idx, store, ui }) {
  let hand = [];
  let library = [];
  let marked = new Set();
  let mulliganed = false;

  root.innerHTML = `<h2><span data-flap="TEST BENCH"></span></h2><p class="lede">Curves, the shape of the list, and sample opening hands. The chosen champion starts in its own zone, so hands draw from the other 39 cards.</p>
    <div class="charts" data-charts></div>
    <section class="rsec"><h3>Sample hand</h3>
      <div class="agent-actions"><button class="key amber" type="button" data-draw>Draw 4</button><button class="key" type="button" data-mull disabled>Mulligan marked</button><button class="key quiet" type="button" data-next>Draw next</button><span class="meta-line" data-hint>Tap up to two cards to mark them for the mulligan.</span></div>
      <div class="hand" data-hand></div></section>
    <section class="rsec"><h3>Opening odds</h3><div class="odds" data-odds></div></section>`;
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
      f.innerHTML = `<img alt="${esc(c.name)}" src="${img(c, 300)}">`;
      if (animate && (only < 0 || only === i) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        f.animate([{ transform: 'translateY(24px) rotate(-2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 420, delay: only < 0 ? i * 70 : 0, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      }
      return f;
    }));
    $('[data-mull]').disabled = !marked.size || mulliganed;
    $('[data-hint]').textContent = !hand.length ? 'Add cards to the main deck first.' : mulliganed ? `Mulligan done. ${library.length} cards left in the deck.` : 'Tap up to two cards to mark them for the mulligan.';
  }

  root.addEventListener('click', (e) => {
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
      return `<div class="col"><b>${total(k) || ''}</b><div class="stack" style="--max:${max}">${cells.join('')}</div><span>${esc(labelOf(k))}</span></div>`;
    }).join('');
    return `<div class="chart"><h3><span>${title}</span></h3><div class="bars" role="img" aria-label="${esc(title)}">${cols}</div></div>`;
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

  return { render, draw };
}
