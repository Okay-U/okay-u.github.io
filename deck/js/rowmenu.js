// Row menu on the deck board: right click a row (or its ⋯ key) to add, remove or move copies between zones.
const ITEMS = {
  main: [['inc', 'Add one'], ['dec', 'Remove one'], ['to:side', 'Move to sideboard'], ['to:bench', 'Move to bench'], ['open', 'Card details'], ['partners', 'Show partners']],
  champion: [['inc', 'Add a copy'], ['dec', 'Remove a copy'], ['open', 'Card details'], ['partners', 'Show partners']],
  side: [['inc', 'Add one'], ['dec', 'Remove one'], ['to:main', 'Move to main deck'], ['to:bench', 'Move to bench'], ['open', 'Card details']],
  bench: [['inc', 'Add one'], ['dec', 'Remove one'], ['to:main', 'Move to main deck'], ['to:side', 'Move to sideboard'], ['open', 'Card details'], ['partners', 'Show partners']],
  bf: [['dec', 'Remove'], ['open', 'Card details']],
};

export function createRowMenu({ ui, store }) {
  const el = document.createElement('div');
  el.className = 'rmenu';
  el.setAttribute('role', 'menu');
  el.hidden = true;
  document.body.appendChild(el);
  let target = null;
  let opener = null;

  function close(restore = false) {
    if (el.hidden) return;
    el.hidden = true;
    target = null;
    if (restore && opener?.isConnected) opener.focus();
  }

  function open(id, zone, x, y, { focus = false } = {}) {
    const items = ITEMS[zone];
    if (!items) return;
    opener = document.activeElement;
    target = { id, zone };
    const n = zone === 'champion' ? 1 : store.getDeck()[zone]?.[id] || 0;
    el.innerHTML = items.map(([k, label]) => `<button type="button" role="menuitem" data-act="${k}">${label}${k.startsWith('to:') && n > 1 ? ` <b>×${n}</b>` : ''}</button>`).join('');
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`;
    el.style.top = `${Math.max(8, y + h + 8 > innerHeight ? y - h : y)}px`;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 200, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    if (focus) el.querySelector('button')?.focus();
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !target) return;
    const { id, zone } = target;
    const act = b.dataset.act;
    close(true);
    if (act === 'inc') ui.addCard(id, zone === 'champion' ? 'main' : zone);
    else if (act === 'dec') ui.removeCard(id, zone);
    else if (act === 'open') ui.openCard(id);
    else if (act === 'partners') ui.showPartners(id);
    else if (act.startsWith('to:')) ui.moveCard(id, zone, act.slice(3));
  });
  el.addEventListener('keydown', (e) => {
    const items = [...el.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === 'Tab') close(true);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(true); });
  document.addEventListener('pointerdown', (e) => { if (!el.contains(e.target)) close(); });
  addEventListener('scroll', () => close(), true);
  addEventListener('resize', () => close());

  return { open, close };
}
