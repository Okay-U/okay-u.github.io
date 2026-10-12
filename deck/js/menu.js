// Context menu shared by the deck board rows and the gallery tiles: right click, long press or the ⋯ key.
// Items are { label, badge?, run, disabled? } or null for a divider.
export function createMenu() {
  const el = document.createElement('div');
  el.className = 'rmenu';
  el.setAttribute('role', 'menu');
  el.hidden = true;
  document.body.appendChild(el);
  let actions = [];
  let opener = null;

  function close(restore = false) {
    if (el.hidden) return;
    el.hidden = true;
    actions = [];
    if (restore && opener?.isConnected) opener.focus();
  }

  function open(items, x, y, { focus = false } = {}) {
    // false/undefined entries are conditional items that did not apply; null is a divider
    const list = items.filter((it) => it !== false && it !== undefined).filter((it, i, a) => it || (i > 0 && a[i - 1] && i < a.length - 1));
    if (!list.some(Boolean)) return;
    opener = document.activeElement;
    actions = [];
    el.innerHTML = list.map((it) => {
      if (!it) return '<hr>';
      actions.push(it.run);
      return `<button type="button" role="menuitem" data-i="${actions.length - 1}" ${it.disabled ? 'disabled' : ''}>${it.label}${it.badge ? ` <b>${it.badge}</b>` : ''}</button>`;
    }).join('');
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`;
    el.style.top = `${Math.max(8, y + h + 8 > innerHeight ? y - h : y)}px`;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 200, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
    if (focus) el.querySelector('button:not([disabled])')?.focus();
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b || b.disabled) return;
    const run = actions[+b.dataset.i];
    close(true);
    run?.();
  });
  el.addEventListener('keydown', (e) => {
    const items = [...el.querySelectorAll('button:not([disabled])')];
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
