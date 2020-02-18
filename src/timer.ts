export interface TimerJSON {
  duration: number;
  elapsed: number;
}

export class Timer {
  private readonly display: HTMLElement;
  private readonly duration: number;

  private elapsed: number;
  private interval: number | null;
  private begin: number | undefined;
  private last: number | undefined;
  private expireFn: (() => void) | null;
  private updateFn: (() => void) | null;

  constructor(
    display: HTMLElement,
    duration: number,
    elapsed = 0,
    expireFn: (() => void) | null = null,
    updateFn: (() => void) | null = null
  ) {
    this.duration = duration;
    this.display = display;

    this.elapsed = elapsed;
    this.interval = null;
    this.expireFn = expireFn;
    this.updateFn = updateFn;

    const remaining = this.duration - this.elapsed;
    if (remaining < 0) {
      this.display.classList.add('expired');
    } else {
      this.display.classList.remove('expired');
    }

    this.render(remaining);
  }

  toJSON(): TimerJSON {
    return { duration: this.duration, elapsed: this.elapsed };
  }

  start() {
    if (this.interval) return;
    this.begin = new Date().getTime();
    this.last = this.begin;
    this.interval = setInterval(() => this.update(), 100);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.begin = new Date().getTime();
    this.elapsed += this.begin - this.last!;
    this.last = this.begin;
  }

  toggle() {
    if (this.interval) {
      this.stop();
    } else {
      this.start();
    }
  }

  expired() {
    return this.elapsed >= this.duration;
  }

  update() {
    const now = new Date().getTime();
    this.elapsed += now - this.last!;
    this.last = now;

    let distance;
    if (this.expired()) {
      this.display.classList.add('expired');
      distance = this.elapsed - this.duration;
      if (this.expireFn) {
        this.expireFn();
        this.expireFn = null;
      }
    } else {
      distance = this.duration - this.elapsed;
    }

    const before = this.display.textContent;
    this.render(distance);
    if (before !== this.display.textContent && this.updateFn) {
      this.updateFn();
    }
  }

  private render(distance: number) {
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = `${Math.floor((distance % (1000 * 60)) / 1000)}`.padStart(2, '0');
    this.display.textContent = `${minutes}:${seconds}`;
  }
}
