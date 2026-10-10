// Desktop layout controls: drag the divider to resize the deck board (Piltover-style), and change the gallery card size.
// Both are per-browser preferences.
const KEY = 'riftcount.deckboard.layout';
const SIZES = [112, 130, 148, 172, 204];
const BOARD_MIN = 340;

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  } catch { return {}; }
}
function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: lasts for this visit */ }
}

export function createLayout({ floor, sizeMount }) {
  const prefs = load();
  const rootStyle = document.documentElement.style;
  const maxBoard = () => Math.max(BOARD_MIN, Math.min(820, floor.clientWidth * 0.62));

  // prefs.board is the width the visitor chose; the applied width is clamped to the current window.
  const apply = () => {
    if (!Number.isFinite(prefs.board)) { rootStyle.removeProperty('--board-w'); return; }
    rootStyle.setProperty('--board-w', `${Math.round(Math.max(BOARD_MIN, Math.min(maxBoard(), prefs.board)))}px`);
  };
  const setBoard = (px, persist = true) => {
    if (px === null) delete prefs.board;
    else prefs.board = Math.round(Math.max(BOARD_MIN, Math.min(maxBoard(), px)));
    apply();
    if (persist) save(prefs);
  };
  apply();
  addEventListener('resize', apply);

  const bar = document.createElement('div');
  bar.className = 'divider';
  bar.setAttribute('role', 'separator');
  bar.setAttribute('aria-orientation', 'vertical');
  bar.setAttribute('aria-label', 'Resize the deck board. Arrow keys move it, double click resets.');
  bar.tabIndex = 0;
  floor.appendChild(bar);

  const boardWidth = () => floor.querySelector('.board').getBoundingClientRect().width;
  bar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('on');
    const right = floor.getBoundingClientRect().right;
    const drag = new AbortController();
    const up = () => {
      bar.classList.remove('on');
      drag.abort();
      save(prefs);
    };
    bar.addEventListener('pointermove', (ev) => setBoard(right - ev.clientX, false), { signal: drag.signal });
    bar.addEventListener('pointerup', up, { signal: drag.signal });
    bar.addEventListener('pointercancel', up, { signal: drag.signal });
  });
  bar.addEventListener('dblclick', () => setBoard(null));
  bar.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setBoard(boardWidth() + 24); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setBoard(boardWidth() - 24); }
  });

  let size = SIZES.includes(prefs.tile) ? prefs.tile : 148;
  sizeMount.innerHTML = `<div class="tsize" role="group" aria-label="Card size"><button type="button" class="key icon small" data-size="-1" aria-label="Smaller cards">−</button><button type="button" class="key icon small" data-size="1" aria-label="Larger cards">+</button></div>`;
  const applySize = () => {
    rootStyle.setProperty('--tile', `${size}px`);
    sizeMount.querySelector('[data-size="-1"]').disabled = size === SIZES[0];
    sizeMount.querySelector('[data-size="1"]').disabled = size === SIZES[SIZES.length - 1];
  };
  sizeMount.addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    size = SIZES[Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(size) + Number(b.dataset.size)))];
    prefs.tile = size; save(prefs); applySize();
  });
  applySize();
}
