// Numeric readouts: plain tabular text with a state colour, a short fade when the value changes, and the value bar
// that grows from a centre par line (green to the right above par, red to the left below).
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** Set a readout's text and colour class; fades in when an existing value changes. */
export function setNum(el, text, { animate = true, cls } = {}) {
  if (!el) return;
  if (cls !== undefined) el.className = `num ${cls}`.trim();
  const next = String(text).trim();
  if (el.dataset.v === next) return;
  const changed = el.dataset.v !== undefined;
  el.dataset.v = next;
  el.textContent = next;
  if (animate && changed && !reduced.matches && !document.hidden) el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
}

/** A readout element with initial text. */
export function makeNum(text, cls = '') {
  const el = document.createElement('span');
  setNum(el, text, { animate: false, cls });
  return el;
}

/** Format a value per cost: "1.24", or an en dash when there is none. */
export const fmtRatio = (x) => (x === null || x === undefined || !isFinite(x) ? '–' : Math.min(x, 9.99).toFixed(2));

/** Colour class for a value per cost, by the AMBER band: above 1.17 over budget (up), under 0.86 under budget (down). */
export const band = (v) => (v === null || v === undefined || !isFinite(v) ? 'none' : v > 1.17 ? 'up' : v < 0.86 ? 'down' : '');

/**
 * Value bar HTML: a track with a centre par line at 1.00. Above par the fill grows right from the centre, below par it
 * grows left, on a ratio scale: a full half is three times par (3.00) or a third of it (0.33). Values inside the
 * normal band (0.86-1.17) draw softer.
 */
export function valueBar(v) {
  if (v === null || v === undefined || !isFinite(v)) return '<span class="vbar none" aria-hidden="true"><i></i></span>';
  const d = v > 0 ? Math.max(-1, Math.min(1, Math.log(v) / Math.log(3))) : -1;
  const w = Math.max(Math.abs(d) * 50, Math.abs(d) > 0.005 ? 2 : 0);
  const side = d >= 0 ? 'up' : 'down';
  const soft = v >= 0.86 && v <= 1.17 ? ' soft' : '';
  return `<span class="vbar" aria-hidden="true"><i></i><b class="${side}${soft}" style="${side === 'up' ? 'left' : 'right'}:50%;width:${w.toFixed(1)}%"></b></span>`;
}
