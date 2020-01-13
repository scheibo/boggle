"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Timer {
    constructor(duration, expireFn = null) {
        this.duration = duration;
        this.display = document.getElementById('timer');
        this.display.classList.remove('expired');
        this.elapsed = 0;
        this.interval = null;
        this.expireFn = expireFn;
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
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    pause() {
        if (this.interval) {
            this.stop();
            this.begin = new Date().getTime();
            this.elapsed += this.begin - this.last;
            this.last = this.begin;
        }
        else {
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
            if (this.expireFn) {
                this.expireFn();
                this.expireFn = null;
            }
        }
        else {
            distance = this.duration - this.elapsed;
        }
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = `${Math.floor((distance % (1000 * 60)) / 1000)}`.padStart(2, '0');
        this.display.textContent = `${minutes}:${seconds}`;
    }
}
exports.Timer = Timer;
//# sourceMappingURL=timer.js.map