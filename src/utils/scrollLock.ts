/** Clear leftover react-remove-scroll / Radix body lock after a Dialog closes. */
export function releaseRadixScrollLock(target: HTMLElement = document.body): void {
  target.style.removeProperty('overflow');
  target.style.removeProperty('pointer-events');
  target.style.removeProperty('padding-right');
  target.removeAttribute('data-scroll-locked');
}
