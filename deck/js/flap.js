// Split-flap cells: each character sits in its own cell; changed cells flip over the hinge,
// left to right, like an exchange board. Unchanged cells stay still.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const GLYPHS = '0123456789';
const STAGGER = 34;
const MAX_STAGGER = 260;
let budget = 0; // ponytail: global per-frame flip cap; raise if large boards look static.

function cell(ch) {
  const c = document.createElement('span');
  c.className = ch === ' ' ? 'fc sp' : 'fc';
  c.textContent = ch === ' ' ? ' ' : ch;
  return c;
}

/** Render `text` into `el` (a .flap). Animates only changed characters. */
export function flap(el, text, { animate = true, cls } = {}) {
  if (!el) return;
  if (cls !== undefined) el.className = `flap ${cls}`.trim();
  const next = String(text);
  const prev = el.dataset.v;
  if (prev === next) return;
  el.dataset.v = next;
  el.setAttribute('aria-label', next);
  const cells = [...el.children];
  while (cells.length < next.length) { const c = cell(' '); el.appendChild(c); cells.push(c); }
  while (cells.length > next.length) el.removeChild(cells.pop());
  const instant = !animate || reduced.matches || prev === undefined || document.hidden;
  cells.forEach((c, i) => {
    const ch = next[i];
    const shown = ch === ' ' ? ' ' : ch;
    c.className = ch === ' ' ? 'fc sp' : 'fc';
    if (c.textContent === shown) return;
    if (instant || budget > 60) { c.textContent = shown; return; }
    flipCell(c, shown, Math.min(i * STAGGER, MAX_STAGGER));
  });
}

function flipCell(c, shown, delay) {
  budget++;
  const mid = GLYPHS.includes(shown) ? GLYPHS[(GLYPHS.indexOf(shown) + 7) % 10] : shown;
  const half = (from, to, d) => c.animate(
    [{ transform: `rotateX(${from}deg)`, filter: 'brightness(1)' }, { transform: `rotateX(${to}deg)`, filter: 'brightness(.55)' }],
    { duration: d, delay: 0, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' });
  setTimeout(async () => {
    try {
      await half(0, -90, 70).finished;
      c.textContent = mid;
      await c.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }], { duration: 60, easing: 'linear' }).finished;
      await half(0, -90, 60).finished;
      c.textContent = shown;
      await c.animate([{ transform: 'rotateX(90deg)', filter: 'brightness(.6)' }, { transform: 'rotateX(0deg)', filter: 'brightness(1)' }],
        { duration: 150, easing: 'cubic-bezier(.16,1,.3,1)' }).finished;
    } catch { c.textContent = shown; }
    c.getAnimations().forEach((a) => a.cancel());
    budget--;
  }, delay);
}

/** Create a .flap element with initial text (no animation). */
export function makeFlap(text, cls = '') {
  const el = document.createElement('span');
  el.className = `flap ${cls}`.trim();
  flap(el, text, { animate: false });
  return el;
}

/** Fill every [data-flap] element once. */
export function hydrateFlaps(root = document) {
  root.querySelectorAll('[data-flap]').forEach((el) => {
    el.classList.add('flap');
    flap(el, el.dataset.flap, { animate: false });
  });
}

/** Format a ratio for a 4-cell flap: "1.24", "0.86", " -- ". */
export const fmtRatio = (x) => (x === null || x === undefined || !isFinite(x) ? ' -- ' : Math.min(x, 9.99).toFixed(2));
export const pad = (n, w = 2) => String(n).padStart(w, ' ');
