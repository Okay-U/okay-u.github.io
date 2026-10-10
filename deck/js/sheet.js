// Side sheet (native <dialog>): card detail with the three value layers, import, export, share, saved decks.
import { img, esc } from './data.js';
import { baseValue, wantsOf, providesOf } from './agent/engine.js';
import { tagLabel } from './agent.js';
import { exportText, importText } from './text.js';
import { copiesOf, blockReason } from './rules.js';

const f2 = (x) => (x === null || x === undefined || !isFinite(x) ? '–' : x.toFixed(2));
let ledgerCalc = null;

async function calcFor(id) {
  if (!ledgerCalc) {
    try {
      const r = await fetch('/amber/amber.json');
      const j = await r.json();
      ledgerCalc = new Map(j.cards.map((c) => [c.id, c]));
    } catch { return null; } // retry on the next open
  }
  return ledgerCalc.get(id) || null;
}

export function createSheet({ el, idx, store, ui }) {
  const open = (html) => {
    el.innerHTML = `<button class="key icon close" type="button" data-close aria-label="Close">✕</button><div class="in">${html}</div>`;
    if (!el.open) el.showModal();
    el.querySelector('.in').scrollTop = 0;
  };
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) el.close();
  });

  async function card(id) {
    const c = idx.byId.get(id);
    if (!c) return;
    const b = baseValue(c);
    const an = ui.analysis();
    const row = an?.rows.find((r) => r.card.id === id);
    const deck = store.getDeck();
    const n = copiesOf(deck, id);
    const costed = ['Unit', 'Spell', 'Gear'].includes(c.type);
    const why = costed ? blockReason(deck, c, idx) : null;
    const status = { f: 'fully priced', p: 'partly priced, lower bound', d: 'deferred by the ledger rules' }[c.model?.S] || '';
    const wants = wantsOf(c), prov = [...providesOf(c).keys()].filter((t) => !['unit', 'spell', 'gear'].includes(t));
    open(`
      <div class="detail"><img alt="" src="${esc(img(c, c.landscape ? 744 : 520))}">
        <div>
          <h2>${esc(c.name)}</h2>
          <p class="meta-line">${esc(c.id)} · ${esc(c.type)}${c.supertype ? ` · ${esc(c.supertype)}` : ''} · ${esc(c.domains.join(' / ') || 'Colorless')}${costed ? ` · ${c.E} energy${c.P ? ` + ${c.P} power` : ''} = ${c.C} C` : ''}${c.preview ? ' · Preview' : ''}${c.banned ? ' · Banned in Standard' : ''}</p>
          <p class="rules">${esc(c.text)}</p>
          ${c.model?.n ? `<p class="meta-line">${esc(c.model.n)}</p>` : ''}
          ${costed ? `<div class="agent-actions">
            <button class="key amber" type="button" data-add ${why ? 'disabled' : ''}>Add to main</button>
            <button class="key" type="button" data-dec ${n ? '' : 'disabled'}>Remove one</button>
            <button class="key quiet" type="button" data-partners>Show partners</button>
            <span class="meta-line">${n ? `${n} in deck` : ''}${why ? ` ${esc(why)}` : ''}</span></div>` : ''}
        </div></div>
      ${costed ? `<section class="rsec"><h3>Value, three ways</h3><div class="ledger">
        <div class="lr"><span>Ledger: Riot's price per cost ${status ? `(${esc(status)})` : ''}</span><b>${f2(b.ledger)}</b></div>
        ${(b.parts || []).map((p) => `<div class="lr"><span>Practical: ${esc(p.label)}</span><b>${p.value >= 0 ? '+' : ''}${p.value.toFixed(2)} C</b></div>`).join('')}
        <div class="lr tot"><span>Practical value per cost</span><b>${f2(b.practical)}</b></div>
        ${row ? `<div class="lr"><span>Partners in this deck</span><b>${row.bonus >= 0 ? '+' : ''}${row.bonus.toFixed(2)} C</b></div>
        <div class="lr tot"><span>In this deck, per cost</span><b>${f2(row.deckAmber)}</b></div>` : ''}
      </div></section>` : ''}
      ${row && row.links.length ? `<section class="rsec"><h3>What feeds it here</h3><div class="ledger">${row.links.filter((l) => Math.abs(l.value) > 0.02).slice(0, 10).map((l) =>
        `<div class="lr"><span>${l.from ? esc(idx.byId.get(l.from)?.name || l.from) : 'Missing'} · ${esc(tagLabel(l.tag))}${l.note ? ` · ${esc(l.note)}` : ''}</span><b>${l.value >= 0 ? '+' : ''}${l.value.toFixed(2)} C</b></div>`).join('')}</div></section>` : ''}
      ${wants.length || prov.length ? `<section class="rsec"><h3>Synergy tags</h3><p class="meta-line">${prov.length ? `Gives: ${esc(prov.map(tagLabel).join(', '))}. ` : ''}${wants.length ? `Wants: ${esc(wants.map((w) => `${tagLabel(w.tag)} (${w.kind.replace('_', ' ')}, ${w.value.toFixed(2)} C)`).join(', '))}.` : ''}</p></section>` : ''}
      ${costed ? `<section class="rsec"><h3>Ledger calculation</h3><div class="calc-note" data-calc>Loading the ledger…</div></section>` : ''}`);
    el.querySelector('[data-add]')?.addEventListener('click', () => { ui.addCard(id, 'main'); card(id); });
    el.querySelector('[data-dec]')?.addEventListener('click', () => { ui.removeCard(id, 'main'); card(id); });
    el.querySelector('[data-partners]')?.addEventListener('click', () => { el.close(); ui.showPartners(id); });
    if (costed) {
      const lc = await calcFor(c.id);
      const box = el.querySelector('[data-calc]');
      if (box) box.textContent = lc ? `${lc.calc || 'No calculation note.'}${lc.reason ? `\nStatus: ${lc.reason}` : ''}` : 'Not in the ledger yet.';
    }
  }

  function exportSheet() {
    const text = exportText(store.getDeck(), idx);
    open(`<h2>Export</h2><p class="meta-line">The same format the Riftcount app and most builders read.</p>
      <textarea readonly data-text>${esc(text)}</textarea>
      <div class="agent-actions"><button class="key amber" type="button" data-copy>Copy</button><button class="key" type="button" data-dl>Download .txt</button></div>`);
    el.querySelector('[data-copy]').addEventListener('click', () => ui.copy(text, 'Decklist copied.'));
    el.querySelector('[data-dl]').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      a.download = `${(store.getDeck().name || 'deck').replace(/[^\w-]+/g, '_')}.txt`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  function importSheet() {
    open(`<h2>Import</h2><p class="meta-line">Paste a decklist from the Riftcount app, Piltover Archive or any builder that writes "3 Card Name" lines under Legend / Champion / MainDeck / Battlefields / Runes / Sideboard.</p>
      <textarea data-text placeholder="Legend:&#10;1 Jinx, Loose Cannon&#10;&#10;Champion:&#10;1 Jinx, Rebel&#10;&#10;MainDeck:&#10;3 …"></textarea>
      <div class="agent-actions"><button class="key amber" type="button" data-go>Import as new deck</button><span class="meta-line" data-msg></span></div>`);
    el.querySelector('[data-go]').addEventListener('click', () => {
      const text = el.querySelector('[data-text]').value;
      const { deck, unresolved } = importText(text, idx);
      if (!deck.legend && !Object.keys(deck.main).length) { el.querySelector('[data-msg]').textContent = 'Nothing recognised. Check the section headers.'; return; }
      ui.newDeck({ ...deck, name: 'Imported deck' });
      el.close();
      ui.toast(unresolved.length ? `Imported. ${unresolved.length} line${unresolved.length > 1 ? 's' : ''} not recognised: ${unresolved.slice(0, 2).join(' / ')}` : 'Deck imported.', !!unresolved.length);
    });
    setTimeout(() => el.querySelector('[data-text]')?.focus(), 60);
  }

  function decksSheet() {
    const list = store.savedDecks();
    const cur = store.getDeck().id;
    open(`<h2>Your decks</h2><p class="meta-line">Saved in this browser. Use Share to move a deck to another device.</p>
      <div class="agent-actions"><button class="key amber" type="button" data-new>New deck</button><button class="key" type="button" data-import>Import</button>
        <button class="key" type="button" data-export>Export current</button><button class="key" type="button" data-share>Share current</button></div>
      <div class="deck-list">${list.map((d) => {
        const legend = d.legend ? idx.byId.get(d.legend) : null;
        const n = Object.values(d.main).reduce((a, b) => a + b, 0) + (d.champion ? 1 : 0);
        return `<div class="dl ${d.id === cur ? 'cur' : ''}"><button class="t" type="button" data-open="${esc(d.id)}">${esc(d.name)}<small>${esc(legend?.name || 'No legend')} · ${n} cards · ${new Date(d.updated).toLocaleDateString()}</small></button>
          <span><button class="key small quiet" type="button" data-dup="${esc(d.id)}">Copy</button> <button class="key small quiet" type="button" data-del="${esc(d.id)}">Delete</button></span></div>`;
      }).join('') || '<div class="dl"><span class="meta-line">No saved decks yet.</span></div>'}</div>`);
    el.querySelector('[data-new]').addEventListener('click', () => { ui.newDeck(); el.close(); });
    el.querySelector('[data-import]').addEventListener('click', importSheet);
    el.querySelector('[data-export]').addEventListener('click', exportSheet);
    el.querySelector('[data-share]').addEventListener('click', () => shareSheet(store.shareURL()));
    el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { store.switchTo(b.dataset.open); el.close(); }));
    el.querySelectorAll('[data-dup]').forEach((b) => b.addEventListener('click', () => { store.duplicateDeck(b.dataset.dup); decksSheet(); }));
    el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const d = list.find((x) => x.id === b.dataset.del);
      if (confirm(`Delete "${d?.name}" from this browser? This cannot be undone.`)) { store.removeDeck(b.dataset.del); decksSheet(); }
    }));
  }

  function shareSheet(url) {
    open(`<h2>Share</h2><p class="meta-line">The whole deck lives in this link. Nothing is uploaded.</p>
      <textarea readonly style="min-height:120px">${esc(url)}</textarea>
      <div class="agent-actions"><button class="key amber" type="button" data-copy>Copy link</button>${navigator.share ? '<button class="key" type="button" data-native>Share…</button>' : ''}</div>`);
    el.querySelector('[data-copy]').addEventListener('click', () => ui.copy(url, 'Link copied.'));
    el.querySelector('[data-native]')?.addEventListener('click', () => navigator.share({ title: store.getDeck().name, url }).catch(() => {}));
  }

  return { card, exportSheet, importSheet, decksSheet, shareSheet, close: () => el.close() };
}
