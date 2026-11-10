// Scrolling the code window to the lines (or cells) in focus.

/**
 * Brings a block into view: centered when there is room to spare, otherwise as much of it as fits,
 * starting a little below the top. `top` and `height` are the block's offset and size inside the scroller.
 */
export function scrollToFocus(scroller: HTMLElement, top: number, height: number, smooth: boolean): void {
  const slack = scroller.clientHeight - height;
  const target = Math.max(0, top - (slack >= 48 ? slack / 2 : Math.max(8, slack)));
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollTo({ top: target, left: 0, behavior: smooth && !calm ? 'smooth' : 'auto' });
}
