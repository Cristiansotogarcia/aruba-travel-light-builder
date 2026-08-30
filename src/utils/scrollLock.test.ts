import { beforeEach, describe, expect, it } from 'vitest';
import { releaseRadixScrollLock } from './scrollLock';

describe('releaseRadixScrollLock', () => {
  beforeEach(() => {
    document.body.style.cssText = '';
    document.body.removeAttribute('data-scroll-locked');
  });

  it('clears leftover Radix RemoveScroll styles on document.body', () => {
    document.body.style.overflow = 'hidden';
    document.body.style.pointerEvents = 'none';
    document.body.style.paddingRight = '15px';
    document.body.setAttribute('data-scroll-locked', '1');

    releaseRadixScrollLock();

    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.body.style.paddingRight).toBe('');
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });
});
