#!/usr/bin/env node
'use strict';

const Stats = require('../js/stats').Stats;

const DICT = require('../data/dict.json');
const STATS = require('../data/stats.json');

const stats = new Stats(STATS, DICT);

const MAX = 137050710;
const clamp = n => Math.min(MAX, Math.max(1, n));
const Q = 3; // TODO
const N = 10;

const SM2 = q => -0.8 + 0.28 * q - 0.02 * q * q;
const adjust = q => 1 + SM2(5 - q);

class Queue {
  constructor(data = [], compare = defaultCompare) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare;

    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this.down(i);
    }
  }

  push(item) {
    this.data.push(item);
    this.length++;
    this.up(this.length - 1);
  }

  pop() {
    if (this.length === 0) return undefined;

    const top = this.data[0];
    const bottom = this.data.pop();
    this.length--;

    if (this.length > 0) {
      this.data[0] = bottom;
      this.down(0);
    }

    return top;
  }

  peek() {
    return this.data[0];
  }

  up(pos) {
    const item = this.data[pos];

    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const current = this.data[parent];
      if (this.compare(item, current) >= 0) break;
      this.data[pos] = current;
      pos = parent;
    }

    this.data[pos] = item;
  }

  down(pos) {
    const half = this.length >> 1;
    const item = this.data[pos];

    while (pos < half) {
      let left = (pos << 1) + 1;
      let best = this.data[left];
      const right = left + 1;

      if (right < this.length && this.compare(this.data[right], best) < 0) {
        left = right;
        best = this.data[right];
      }
      if (this.compare(best, item) >= 0) break;

      this.data[pos] = best;
      pos = left;
    }

    this.data[pos] = item;
  }
}

function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const queue = new Queue([], (a, b) => b.score - a.score);
for (const k in stats.anagrams) {
  if (k.length > 7) continue;
  const anagrams = stats.anagrams[k];
  const score = anagrams.reduce((acc, w) => acc + DICT[w].n, 0);
  if (!score) continue;
  queue.push({k, score});
}


let u = 0;
const seen = {};
for (let i = 1; i <= (Number(process.argv[2]) || 25); i++) {

  let next;
  const nexts = [];
  do {
    next = queue.pop();
    nexts.push(next);
  } while (next.last && (i - next.last) < N);


  if (!seen[next.k]) u++;
  const count = seen[next.k] = (seen[next.k] || 0) + 1;
  console.log(`${u} (${count}): ${next.k} (${next.score})`);

  next.score = clamp(next.score * adjust(Q));
  next.last = i;

  for (const n of nexts) {
    queue.push(n);
  }
}
