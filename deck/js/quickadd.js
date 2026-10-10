// Quick add on the deck board (Moxfield-style): type a name, optionally with a count ("3 jinx"), pick with the arrows,
// Enter adds to the main deck, Shift+Enter to the sideboard, Alt+Enter to the bench. Focus stays for the next card.
import { norm, esc, isSignatureFor } from './data.js';
import { inDomains, copiesOf } from './rules.js';
import { baseValue } from './agent/engine.js';
import { fmtRatio } from './flap.js';

const MAX = 8;

export function createQuickAdd({ mount, idx, store, ui }) {
  mount.innerHTML = `<div class="qadd" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-owns="qadd-list">
      <input class="search" type="text" placeholder="Add a card: 3 jinx" aria-label="Add a card by name" aria-autocomplete="list" aria-controls="qadd-list" autocomplete="off" spellcheck="false">
      <ul class="qlist" id="qadd-list" role="listbox" hidden></ul>
    </div>
    <p class="qhint">Enter adds to main · Shift+Enter sideboard · Alt+Enter bench</p>`;
  const box = mount.querySelector('.qadd');
  const input = mount.querySelector('input');
  const list = mount.querySelector('.qlist');
  let hits = [];
  let sel = 0;

  function parse(v) {
    const m = /^\s*(\d)\s*x?\s+(.*)$/i.exec(v);
    return m ? { n: Math.max(1, Math.min(3, +m[1])), q: m[2] } : { n: 1, q: v };
  }

  function candidates() {
    const deck = store.getDeck();
    const legend = deck.legend ? idx.byId.get(deck.legend) : null;
    return idx.cards.filter((c) => ['Unit', 'Spell', 'Gear'].includes(c.type) && !c.token
      && (!legend || (inDomains(c, legend) && (c.supertype !== 'Signature' || isSignatureFor(c, legend)))));
  }

  function search(q) {
    const k = norm(q);
    if (!k) return [];
    const scored = [];
    for (const c of candidates()) {
      const n = norm(c.name);
      const s = n.startsWith(k) ? 0 : n.split(' ').some((w) => w.startsWith(k)) ? 1 : n.includes(k) ? 2 : -1;
      if (s >= 0) scored.push([s, c]);
    }
    return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).slice(0, MAX).map(([, c]) => c);
  }

  function paint() {
    const deck = store.getDeck();
    box.setAttribute('aria-expanded', String(hits.length > 0));
    list.hidden = !hits.length;
    list.innerHTML = hits.map((c, i) => {
      const have = copiesOf(deck, c.id);
      return `<li role="option" id="qadd-${i}" data-i="${i}" aria-selected="${i === sel}"><span class="qn">${esc(c.name)}</span>
        <span class="qm">${c.E}E${c.P ? ` ${c.P}P` : ''} · ${esc(c.type)}${have ? ` · ${have} in deck` : ''}${c.banned ? ' · banned' : ''}</span><span class="qv">${fmtRatio(baseValue(c).ledger)}</span></li>`;
    }).join('');
    if (hits.length) input.setAttribute('aria-activedescendant', `qadd-${sel}`); else input.removeAttribute('aria-activedescendant');
  }

  function close() { hits = []; sel = 0; paint(); }

  function commit(c, zone) {
    const { n } = parse(input.value);
    const before = store.getDeck()[zone]?.[c.id] || 0;
    ui.addCard(c.id, zone, { n, quiet: true });
    const added = (store.getDeck()[zone]?.[c.id] || 0) - before;
    if (added > 0) ui.toast(`+${added} ${c.name}${zone === 'main' ? '' : zone === 'side' ? ' to the sideboard' : ' to the bench'}.`);
    input.value = '';
    close();
    input.focus();
  }

  input.addEventListener('input', () => { hits = search(parse(input.value).q); sel = 0; paint(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); sel = (sel + 1) % hits.length; paint(); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); sel = (sel - 1 + hits.length) % hits.length; paint(); }
    else if (e.key === 'Escape') { if (input.value) { e.stopPropagation(); input.value = ''; } close(); }
    else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); commit(hits[sel], e.altKey ? 'bench' : e.shiftKey ? 'side' : 'main'); }
  });
  list.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus in the input
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[data-i]');
    if (li) commit(hits[+li.dataset.i], e.altKey ? 'bench' : e.shiftKey ? 'side' : 'main');
  });
  input.addEventListener('blur', () => setTimeout(close, 120));

  return { focus: () => input.focus() };
}
