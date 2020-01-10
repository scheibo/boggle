'use strict';

class Timer {
  constructor(duration) {
    this.elapsed = 0;
    this.duration = duration;
    this.display = document.getElementById('timer');
    this.display.classList.remove('expired');
    this.interval = null;
    this.paused = null;
  }

  start() {
    if (!this.elapsed) {
      this.begin = new Date().getTime();
      this.last = this.begin;
      this.interval = setInterval(() => this.update(), 100);
    }
  }

  stop() {
    if (this.interval) {
      this.interval = clearInterval(this.interval);
      this.inteval = null;
    }
  }

  pause() {
    if (this.interval) {
      this.interval = clearInterval(this.interval);
      this.interval = null;
      this.begin = new Date().getTime();
      this.elapsed += this.begin - this.last;
      this.last = this.begin;
    } else {
      this.begin = new Date().getTime();
      this.last = this.begin;
      this.interval = setInterval(() => this.update(), 100);
    }
  }

  expired() {
    return this.elapsed >= this.duration;
  }

  update() {
    const now = new Date().getTime();
    this.elapsed += now - this.last;
    this.last = now;

    let distance;
    if (this.expired()) {
      this.display.classList.add('expired');
      distance = this.elapsed - this.duration;
      if (!STATE.game.expired) STATE.game.expired = +new Date();
    } else {
      distance = this.duration - this.elapsed;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = `${Math.floor((distance % (1000 * 60)) / 1000)}`.padStart(2, '0');

    this.display.textContent = `${minutes}:${seconds}`;
  }
}

