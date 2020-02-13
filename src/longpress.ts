/*! Modified from John Doherty's MIT-licensed https://github.com/john-doherty/long-press-event */
(() => {
  'use strict';
  const TOUCH =
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

  const mouseDown = TOUCH ? 'touchstart' : 'mousedown';
  const mouseUp = TOUCH ? 'touchend' : 'mouseup';
  const mouseMove = TOUCH ? 'touchmove' : 'mousemove';

  const MAX_DIFF = 10;
  const TIMEOUT = 500;

  let timer: { value: number } | null = null;
  let startX = 0;
  let startY = 0;

  if (typeof window.CustomEvent !== 'function') {
    // @ts-ignore
    window.CustomEvent = (event: string, params: any) => {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return e;
    };

    // @ts-ignore
    window.CustomEvent.prototype = window.Event.prototype;
  }

  function isTouch(e: MouseEvent | TouchEvent): e is TouchEvent {
    return 'touches' in e;
  }

  function fireLongPressEvent(element: EventTarget, e: MouseEvent | TouchEvent) {
    clearLongPressTimer(e);

    const clientX = isTouch(e) ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch(e) ? e.touches[0].clientY : e.clientY;

    const longPress = element.dispatchEvent(
      new CustomEvent('long-press', {
        bubbles: true,
        cancelable: true,
        detail: { clientX, clientY },
      })
    );

    if (longPress) {
      const longPressUp = (e: Event) => {
        document.removeEventListener(mouseUp, longPressUp, true);

        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();

        element.dispatchEvent(
          new CustomEvent('long-press-up', {
            bubbles: true,
            cancelable: true,
            detail: { clientX, clientY },
          })
        );
      };

      document.addEventListener(mouseUp, longPressUp, true);
    }
  }

  function startLongPressTimer(e: MouseEvent | TouchEvent) {
    clearLongPressTimer(e);

    const start = new Date().getTime();
    const loop = () => {
      const current = new Date().getTime();
      const delta = current - start;

      if (delta >= TIMEOUT) {
        fireLongPressEvent(e.target!, e);
      } else {
        timer!.value = window.requestAnimationFrame(loop);
      }
    };

    timer = { value: window.requestAnimationFrame(loop) };
  }

  function clearLongPressTimer(e: Event) {
    if (timer) window.cancelAnimationFrame(timer.value);
    timer = null;
  }

  function mouseDownHandler(e: MouseEvent | TouchEvent) {
    const board = document.getElementById('board');
    if (!board || board.contains(e.target! as Node)) return;

    startX = isTouch(e) ? e.touches[0].clientX : e.clientX;
    startY = isTouch(e) ? e.touches[0].clientY : e.clientY;
    startLongPressTimer(e);
  }

  function mouseMoveHandler(e: MouseEvent | TouchEvent) {
    const diffX = Math.abs(startX - (isTouch(e) ? e.touches[0].clientX : e.clientX));
    const diffY = Math.abs(startY - (isTouch(e) ? e.touches[0].clientY : e.clientY));
    if (diffX >= MAX_DIFF || diffY >= MAX_DIFF) clearLongPressTimer(e);
  }

  document.addEventListener(mouseUp, clearLongPressTimer, true);
  document.addEventListener(mouseMove, mouseMoveHandler, true);
  document.addEventListener('wheel', clearLongPressTimer, true);
  document.addEventListener('scroll', clearLongPressTimer, true);

  document.addEventListener(mouseDown, mouseDownHandler, true);
})();
