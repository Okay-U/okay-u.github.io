// Optional coaching read written by Claude, with the visitor's own Anthropic API key.
// The key stays in this browser (session or, if asked, local storage) and goes only to api.anthropic.com.
// The deterministic agent's numbers are sent along so Claude explains and argues from the same ledger.
import { analyze, marginal, candidatePool } from './agent/engine.js';
import { styleById } from './agent/styles.js';

const KEY = 'riftcount.deckboard.anthropic';
export const MODELS = [['claude-sonnet-5-5', 'Sonnet 5.5'], ['claude-opus-5-5', 'Opus 5.5'], ['claude-haiku-5-5', 'Haiku 5.5']];

export function storedKey() {
  try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function storeKey(key, remember) {
  try {
    sessionStorage.setItem(KEY, key);
    if (remember) localStorage.setItem(KEY, key); else localStorage.removeItem(KEY);
  } catch { /* storage blocked: the key lives for this page only */ }
}
export function forgetKey() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* fine */ } }

const r2 = (x) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);

/** Compact, factual brief of the deck for the model. */
export function brief(deck, idx, styleId) {
  const a = analyze(deck, idx);
  const style = styleById(styleId);
  const ctx = { metrics: a.metrics };
  const cards = a.rows.map((r) => ({
    n: r.n, name: r.card.name, type: r.card.type, cost: `${r.card.E}E${r.card.P ? `+${r.card.P}P` : ''}`, might: r.card.might,
    text: r.card.text.replace(/\s*\([^)]*\)/g, '').slice(0, 260), roles: r.card.model?.r || [],
    ledger: r2(r.ledger), practical: r2(r.practical), inDeck: r2(r.deckAmber), synergy: r2(r.bonus), champion: r.champion || undefined,
  }));
  const pool = candidatePool(deck, idx).map((c) => marginal(c, a, deck)).filter(Boolean)
    .map((m) => ({ ...m, metrics: a.metrics, helps: m.helps.map((h) => ({ ...h, name: idx.byId.get(h.id)?.name || h.id })) }))
    .map((m) => ({ m, s: style.score(m, ctx) })).sort((x, y) => y.s - x.s).slice(0, 18)
    .map(({ m }) => ({ name: m.card.name, cost: `${m.card.E}E${m.card.P ? `+${m.card.P}P` : ''}`, text: m.card.text.replace(/\s*\([^)]*\)/g, '').slice(0, 200), inDeck: r2(m.deckAmber), feeds: m.helps.slice(0, 3).map((h) => h.name) }));
  const pairs = a.pairs.slice(0, 12).map((p) => ({ from: idx.byId.get(p.from)?.name, to: idx.byId.get(p.to)?.name, value: r2(p.value), via: [...p.tags] }));
  const legend = a.legend ? { name: a.legend.name, domains: a.legend.domains, text: a.legend.text.replace(/\s*\([^)]*\)/g, '') } : null;
  const bf = deck.bf.map((id) => idx.byId.get(id)?.name).filter(Boolean);
  return { style: { name: style.name, focus: style.blurb }, legend, battlefields: bf, runes: deck.runes, metrics: {
    ledger: r2(a.metrics.ledger), practical: r2(a.metrics.practical), inDeck: r2(a.metrics.inDeck), avgEnergy: r2(a.metrics.avgEnergy),
    curve: a.metrics.curve, roles: a.metrics.roles, units: a.metrics.units }, cards, combos: pairs, candidates: pool };
}

const SYSTEM = `You are a Riftbound TCG deck coach inside the Riftcount Deck Board. You receive a JSON brief of one deck:
each card with its rules text and three values per cost: "ledger" (Riot's designer price, AMBER, Chen & Lee 2026; 1.00 is par),
"practical" (adds what the ledger books at a discount or ignores) and "inDeck" (after the combos in this list), plus detected combos,
metrics and the best legal candidates to add. Riftbound basics: 40-card main deck including the chosen champion, max 3 copies,
legend sets two domains, 12 runes, 3 battlefields, points from conquering and holding battlefields, opening hand of 4.
Coach in the requested work style. Be concrete: name cards, quantities and the numbers from the brief; never invent card text,
prices or meta statistics. Value is not strength: say when a card matters for reasons the numbers miss.
Answer in plain text with these short sections, each starting with a line "## Title": Game plan; Engines and combos;
Weak slots; Swaps (lines like "-2 Card A, +2 Card B: reason"); Mulligan. Keep the whole read under 380 words.`;

/** Stream a coaching read. onText receives the text so far. Throws with a readable message on failure. */
export async function coach({ key, model, deck, idx, styleId, onText, signal }) {
  const payload = brief(deck, idx, styleId);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model, max_tokens: 1400, stream: true, system: SYSTEM,
      messages: [{ role: 'user', content: `Deck brief (JSON):\n${JSON.stringify(payload)}\n\nWrite the coaching read in the ${payload.style.name} style.` }] }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* not JSON */ }
    if (res.status === 401) throw new Error('The API key was rejected. Check it in the Anthropic console and paste it again.');
    if (res.status === 429) throw new Error('Rate limit reached. Wait a minute and try again.');
    throw new Error(`Claude did not answer (HTTP ${res.status}${detail ? `: ${detail}` : ''}).`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (!data) continue;
      let ev;
      try { ev = JSON.parse(data.slice(6)); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; onText(text); }
      if (ev.type === 'error') throw new Error(ev.error?.message || 'Claude stopped with an error.');
    }
  }
  return text;
}
