// Analyze room: pick a work style, run the agent, read a priced report with buys and cuts.
import { analyze, marginal, candidatePool, NEED } from './agent/engine.js';
import { STYLES, styleById } from './agent/styles.js';
import { makeFlap, fmtRatio } from './flap.js';
import { counts } from './rules.js';

const KEY = 'riftcount.deckboard.style';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f2 = (x) => (x === null || x === undefined ? '–' : x.toFixed(2));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createAgent({ root, idx, store, ui }) {
  let styleId = 'engineer';
  try { styleId = localStorage.getItem(KEY) || styleId; } catch { /* storage blocked */ }
  let running = false;

  root.innerHTML = `
    <h2>Deck agent</h2>
    <p class="lede">Reads your list, prices every card against Riot's ledger and against the partners in this deck, then proposes what to add and what to cut. Pick how it should think.</p>
    <div class="styles" role="group" aria-label="Work style">${STYLES.map((s) => `<button type="button" class="style-key" data-style="${s.id}" aria-pressed="false"><b>${s.name}</b><span>${s.blurb}</span></button>`).join('')}</div>
    <div class="agent-actions"><button class="key amber" type="button" data-go>Run agent</button><span class="meta-line" data-status></span></div>
    <ol class="log" data-log></ol>
    <div class="report" data-report></div>`;
  const log = root.querySelector('[data-log]');
  const report = root.querySelector('[data-report]');
  const status = root.querySelector('[data-status]');
  const paintStyles = () => root.querySelectorAll('[data-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === styleId)));
  paintStyles();

  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-style]');
    if (s) { styleId = s.dataset.style; try { localStorage.setItem(KEY, styleId); } catch { /* fine */ } paintStyles(); if (report.childElementCount) run(); return; }
    if (e.target.closest('[data-go]')) { run(); return; }
    const add = e.target.closest('[data-add]');
    if (add) { ui.addCard(add.dataset.add, 'main'); add.disabled = true; add.textContent = 'Added'; return; }
    const cut = e.target.closest('[data-cut]');
    if (cut) { ui.removeCard(cut.dataset.cut, 'main'); cut.disabled = true; cut.textContent = 'Cut'; return; }
    const open = e.target.closest('[data-open]');
    if (open) ui.openCard(open.dataset.open);
  });

  async function step(text, ms) {
    const li = document.createElement('li');
    li.textContent = text;
    log.appendChild(li);
    if (!reduced()) li.animate([{ opacity: 0, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
    await wait(reduced() ? 0 : ms);
    li.classList.add('done');
  }

  async function run() {
    if (running) return;
    const deck = store.getDeck();
    if (!deck.legend) { status.textContent = 'Pick a legend and some cards first.'; return; }
    running = true;
    const style = styleById(styleId);
    log.replaceChildren(); report.replaceChildren();
    status.textContent = `${style.name} is reading your list.`;
    const n = counts(deck);
    await step(`Reading ${n.main} main-deck cards, the legend and ${n.bf} battlefields.`, 260);
    const a = analyze(deck, idx);
    await step(`Pricing ${a.rows.length} distinct cards against Riot's cost ledger.`, 260);
    await step(`Mapping ${a.table.size} synergy tags; ${a.pairs.length} working links between cards.`, 300);
    const pool = candidatePool(deck, idx);
    await step(`Testing ${pool.length} legal cards in ${a.legend.domains.join(' and ')} for this list.`, 320);
    const ctx = { metrics: a.metrics };
    const ms = pool.map((c) => marginal(c, a, deck)).filter(Boolean).map((m) => ({ ...m, metrics: a.metrics }));
    ms.forEach((m) => { m.helps = m.helps.map((h) => ({ ...h, name: idx.byId.get(h.id)?.name || h.id })); });
    const buys = ms.map((m) => ({ m, s: style.score(m, ctx) })).sort((x, y) => y.s - x.s).slice(0, 10).map((x) => x.m);
    const givenOut = new Map();
    for (const p of a.pairs) givenOut.set(p.from, (givenOut.get(p.from) || 0) + p.value);
    const cuts = a.rows.filter((r) => !r.champion && r.deckAmber !== null)
      .map((r) => ({ ...r, givenOut: givenOut.get(r.card.id) || 0, roleCount: (r.card.model?.r || []).length }))
      .map((r) => ({ r, s: style.keep(r, ctx) })).sort((x, y) => x.s - y.s).slice(0, 6).map((x) => x.r);
    await step('Writing the report.', 200);
    status.textContent = `${style.name} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    render(a, style, buys, cuts, ctx);
    ui.refresh(true);
    running = false;
  }

  function render(a, style, buys, cuts, ctx) {
    const [title, line] = style.headline(a);
    const sec = (h, inner) => `<section class="rsec"><h3>${h}</h3>${inner}</section>`;
    const verdict = document.createElement('div');
    verdict.className = 'verdict';
    verdict.innerHTML = `<div class="score"></div><div><h3>${esc(title)}</h3><p>${esc(line)}</p></div>`;
    verdict.querySelector('.score').appendChild(makeFlap(fmtRatio(style.id === 'auditor' ? a.metrics.ledger : a.metrics.inDeck), style.id === 'auditor' ? 'amber' : ''));

    const movers = a.rows.filter((r) => r.deckAmber !== null && (r.ledger ?? r.practical) !== null)
      .map((r) => ({ r, d: r.deckAmber - (r.ledger ?? r.practical) })).sort((x, y) => y.d - x.d);
    const up = movers.filter((x) => x.d > 0.05).slice(0, 5);
    const down = movers.filter((x) => x.d < -0.05).slice(-4).reverse();
    const moverRow = ({ r, d }) => `<div class="tr"><span class="side ${d > 0 ? 'buy' : 'sell'}">${d > 0 ? '▲' : '▼'}</span>
      <button class="t" type="button" data-open="${r.card.id}">${esc(r.card.name)}</button><span>${f2(r.ledger ?? r.practical)} → ${f2(r.deckAmber)}</span><span></span>
      <span class="why">${esc(explainMove(r, idx))}</span></div>`;

    const pairRow = (p) => {
      const from = idx.byId.get(p.from), to = idx.byId.get(p.to);
      return `<div class="tr"><span class="side pair">Pair</span><span class="t">${esc(from?.name)} → ${esc(to?.name)}</span><span>+${p.value.toFixed(2)} C</span><span></span>
        <span class="why">${esc([...p.tags].map(tagLabel).join(', '))}${p.notes.size ? ` · ${esc([...p.notes][0])}` : ''}</span></div>`;
    };
    const buyRow = (m) => `<div class="tr"><span class="side buy">Buy</span><button class="t" type="button" data-open="${m.card.id}">${esc(m.card.name)}</button>
      <span>${f2(m.deckAmber)}</span><button class="key small" type="button" data-add="${m.card.id}">Add</button>
      <span class="why">${esc(style.buyWhy(m, ctx))}</span></div>`;
    const cutRow = (r) => `<div class="tr"><span class="side sell">Sell</span><button class="t" type="button" data-open="${r.card.id}">${esc(r.card.name)}</button>
      <span>${f2(r.deckAmber)}</span><button class="key small quiet" type="button" data-cut="${r.card.id}">Cut 1</button>
      <span class="why">${esc(style.sellWhy(r, ctx))}</span></div>`;

    const gaps = a.misfits.slice(0, 4).map((r) => {
      const short = (r.detail || []).filter((d) => d.gain < -0.1).sort((x, y) => x.gain - y.gain).slice(0, 2)
        .map((d) => `${tagLabel(d.tag)}: ${d.have.toFixed(0)} in the deck${d.typical ? `, a typical deck has ${d.typical.toFixed(0)}` : ''}`);
      return `<div class="tr"><span class="side hold">Gap</span><button class="t" type="button" data-open="${r.card.id}">${esc(r.card.name)}</button><span>${r.bonus.toFixed(1)} C</span><span></span>
        <span class="why">Short on ${esc(short.join('; ') || 'partners')}.</span></div>`;
    }).join('');

    const roleGauge = (k) => {
      const have = a.metrics.roles[k] || 0, target = NEED.ROLE_TARGETS[k];
      const ok = have >= target;
      return `<div class="gauge"><span class="lbl">${k.replace('_', ' ')}</span><span class="flap" data-g="${have}/${target}"></span>
        <div class="bar ${ok ? 'good' : have < target / 2 ? 'bad' : ''}"><i style="transform:scaleX(${Math.min(1, have / target)})"></i></div></div>`;
    };
    const legendFit = a.legendFit && a.legendFit.links.length
      ? `<p>${esc(a.legend.name)}: the deck feeds its ability for ${a.legendFit.bonus >= 0 ? '+' : ''}${a.legendFit.bonus.toFixed(1)} C of extra value per game.</p>` : '';

    report.innerHTML = '';
    report.appendChild(verdict);
    report.insertAdjacentHTML('beforeend', [
      sec('Buy', `<div class="tape">${buys.map(buyRow).join('') || '<div class="tr"><span class="t">No legal additions found.</span></div>'}</div>`),
      sec('Sell', `<div class="tape">${cuts.map(cutRow).join('') || '<div class="tr"><span class="t">Nothing worth cutting.</span></div>'}</div>`),
      up.length || down.length ? sec('Movers against the ledger', `<div class="tape">${up.map(moverRow).join('')}${down.map(moverRow).join('')}</div>`) : '',
      a.pairs.length ? sec('Working combos', `${legendFit}<div class="tape">${a.pairs.slice(0, 8).map(pairRow).join('')}</div>`) : '',
      gaps ? sec('Payoffs without fuel', `<div class="tape">${gaps}</div>`) : '',
      sec('Roles', `<div class="gauges">${NEED.roleNames.map(roleGauge).join('')}</div>`),
    ].join(''));
    report.querySelectorAll('[data-g]').forEach((el) => { el.replaceWith(makeFlap(el.dataset.g)); });
    if (!reduced()) {
      [...report.children].forEach((el, i) => el.animate(
        [{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(10px)' }, { clipPath: 'inset(0 0 0 0)', transform: 'none' }],
        { duration: 520, delay: Math.min(i * 90, 450), easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
    }
  }

  return { run, clear() { log.replaceChildren(); report.replaceChildren(); status.textContent = ''; } };
}

const TAG_LABELS = { spell: 'spells', unit: 'units', gear: 'gear', legion: 'cheap plays (Legion)', show_off: 'big cards to show off',
  friendly_death: 'your units dying', enemy_death: 'enemy units dying', token_unit: 'unit tokens', xp: 'XP', draw: 'card draw',
  discard: 'discards', recycle: 'recycling', buff: 'buffs', might_up: 'might boosts', move_friendly: 'moving your units',
  conquer: 'conquering', hold: 'holding', exhausted_units: 'exhausted units', exhaust_friendly: 'exhausting units',
  channel_rune: 'rune ramp', rune_count: 'many runes', equipment: 'equipment', hidden: 'Hidden cards', deathknell: 'Deathknell units',
  gold: 'Gold tokens', mighty: 'Mighty units', big_spell: 'big spells', stun: 'stuns', vision: 'card selection' };
export const tagLabel = (t) => TAG_LABELS[t] || t.replace(/^tribe:/, '').replace(/^region:/, '').replace(/_/g, ' ');

function explainMove(r, idx) {
  if (r.bonus > 0.05) {
    const top = [...r.links].filter((l) => l.from && l.value > 0).sort((a, b) => b.value - a.value).slice(0, 2);
    const names = top.map((l) => idx.byId.get(l.from)?.name).filter(Boolean);
    return `+${r.bonus.toFixed(1)} C from ${names.join(' and ') || 'its partners'}${top[0] ? ` (${tagLabel(top[0].tag)})` : ''}.`;
  }
  if (r.bonus < -0.05) {
    const d = (r.detail || []).filter((x) => x.gain < 0).sort((x, y) => x.gain - y.gain)[0];
    return `${r.bonus.toFixed(1)} C: ${d ? `${tagLabel(d.tag)} is thin here (${d.have.toFixed(0)} in the deck${d.typical ? ` vs ${d.typical.toFixed(0)} typical` : ''})` : 'its payoff lacks partners here'}.`;
  }
  const extra = (r.parts || []).filter((p) => p.value > 0.2).map((p) => p.label.split(':')[0]).slice(0, 2);
  return extra.length ? `Ledger misses: ${extra.join('; ')}.` : 'Same as the ledger.';
}
