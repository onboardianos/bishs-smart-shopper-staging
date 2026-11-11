// Keep a focused field above the on-screen keyboard. visualViewport shrinks when the
// keyboard opens; scroll the field to the center of that visible area, and drop sticky
// bars so they cannot cover it. Inputs stay >=16px so iOS does not zoom.
export function focusIntoView(el: HTMLElement) {
  document.body.classList.add('kb-open');
  const place = () => {
    const vv = window.visualViewport;
    const rect = el.getBoundingClientRect();
    const viewTop = vv ? vv.offsetTop : 0;
    const viewH = vv ? vv.height : window.innerHeight;
    const target = viewTop + viewH * 0.38;
    const delta = rect.top - target;
    if (Math.abs(delta) > 12) window.scrollBy({ top: delta, left: 0 });
  };
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  requestAnimationFrame(place);
  window.setTimeout(place, 280);
  const vv = window.visualViewport;
  if (!vv) return;
  const on = () => place();
  vv.addEventListener('resize', on);
  vv.addEventListener('scroll', on);
  const off = () => {
    vv.removeEventListener('resize', on);
    vv.removeEventListener('scroll', on);
    document.body.classList.remove('kb-open');
  };
  el.addEventListener('blur', off, { once: true });
}
