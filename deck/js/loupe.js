// Loupe: on desktop pointers, hovering a card in the gallery or a row on the board shows the full card beside it.
import { img } from './data.js';

export function createLoupe(idx) {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const el = document.createElement('div');
  el.className = 'loupe';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  let im = null;
  let current = null;
  let timer = null;

  function place(x, y, landscape) {
    const w = landscape ? 420 : 300;
    const h = landscape ? 300 : 419;
    const left = x + w + 28 > innerWidth ? x - w - 20 : x + 20;
    const top = Math.max(12, Math.min(innerHeight - h - 12, y - h / 2));
    el.style.width = `${w}px`;
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  function show(id, x, y) {
    const c = idx.byId.get(id);
    if (!c?.image) return;
    if (current !== id) {
      current = id;
      if (!im) { im = new Image(); im.alt = ''; el.appendChild(im); }
      im.src = img(c, c.landscape ? 744 : 520);
      el.classList.toggle('wide', !!c.landscape);
    }
    place(x, y, c.landscape);
    el.classList.add('on');
  }
  function hide() { current = null; el.classList.remove('on'); clearTimeout(timer); }

  function bind(root, selector, idOf) {
    root.addEventListener('pointerover', (e) => {
      if (!fine.matches || e.pointerType !== 'mouse') return;
      const t = e.target.closest(selector);
      clearTimeout(timer);
      if (!t) return;
      timer = setTimeout(() => show(idOf(t), e.clientX, e.clientY), 260);
    });
    root.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('on')) return;
      const t = e.target.closest(selector);
      if (!t) { hide(); return; }
      show(idOf(t), e.clientX, e.clientY);
    });
    root.addEventListener('pointerleave', hide);
    root.addEventListener('pointerdown', hide);
  }
  addEventListener('scroll', hide, true);
  return { bind, hide };
}
