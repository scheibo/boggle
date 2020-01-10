/*! Modified from John Doherty's MIT-licensed https://github.com/john-doherty/long-press-event */
(() => {
  'use strict';
  const isTouch =
    (('ontouchstart' in window) ||
     (navigator.MaxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));

  const mouseDown = isTouch ? 'touchstart' : 'mousedown';
  const mouseUp = isTouch ? 'touchend' : 'mouseup';
  const mouseMove = isTouch ? 'touchmove' : 'mousemove';

  const MAX_DIFF = 10;
  const TIMEOUT = 500;

  let timer = null;
  let startX = 0;
  let startY = 0;

  if (typeof window.CustomEvent !== 'function') {
    window.CustomEvent = (event, params) => {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return e;
    };

    window.CustomEvent.prototype = window.Event.prototype;
  }

  function fireLongPressEvent(element, e) {
    clearLongPressTimer();

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    const longPress = element.dispatchEvent(
      new CustomEvent(
        'long-press', {
          bubbles: true,
          cancelable: true,
          detail: { clientX: clientX, clientY: clientY }
        }));

    if (longPress) {
      const longPressUp = e => {
        document.removeEventListener(mouseUp, longPressUp, true);

        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();

        element.dispatchEvent(
          new CustomEvent('long-press-up', {
            bubbles: true,
            cancelable: true,
            detail: { clientX: clientX, clientY: clientY }
          }));
      };

      document.addEventListener(mouseUp, longPressUp, true);
    }
  }

  function startLongPressTimer(e) {
    clearLongPressTimer(e);

    const start = new Date().getTime();
    const loop = () => {
      const current = new Date().getTime();
      const delta = current - start;

      if (delta >= TIMEOUT) {
        fireLongPressEvent(e.target, e);
      } else {
        timer.value = window.requestAnimationFrame(loop);
      }
    };

    timer = {value: window.requestAnimationFrame(loop)};
  }

  function clearLongPressTimer(e) {
    if (timer) window.cancelAnimationFrame(timer.value);
    timer = null;
  }

  function mouseDownHandler(e) {
    if (!document.getElementById('board').contains(e.target)) {
      startX = e.clientX;
      startY = e.clientY;
      startLongPressTimer(e);
    }
  }

  function mouseMoveHandler(e) {
    const diffX = Math.abs(startX - e.clientX);
    const diffY = Math.abs(startY - e.clientY);
    if (diffX >= MAX_DIFF || diffY >= MAX_DIFF) clearLongPressTimer(e);
  }

  document.addEventListener(mouseUp, clearLongPressTimer, true);
  document.addEventListener(mouseMove, mouseMoveHandler, true);
  document.addEventListener('wheel', clearLongPressTimer, true);
  document.addEventListener('scroll', clearLongPressTimer, true);

  document.addEventListener(mouseDown, mouseDownHandler, true);
})();
