#!/usr/bin/env node
'use strict';

const define = require('../js/dict').define;
const DICT = require('../data/dict.json');
const STATS = require('../data/stats.json');
const Stats = require('../js/stats').Stats;
const stats = new Stats(STATS, DICT);

const data = require('./data.json');

const score = k => stats.anagrams(k, 'New').n || 0;
const keys = data
  .filter(w => w.e < 2.0)
  .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
  .map(w => w.k);

for (const k of keys) {
  let defns = [];
  for (const r of order(stats.anagrams(k, 'New').words)) {
    const w = r.replace(/[^A-Z]/, '');
    defns.push(`${r} ${define(w, DICT)}`);
  }
  console.log(`${defns.join('\n')}\n`);
}

function order(words) {
  const ordered = [];

  const anadromes = new Set();
  for (const w of words) {
    const r = w
      .split('')
      .reverse()
      .join('');
    if (r !== w && words.includes(r)) {
      const key = `${[w, r].sort().join(' ')}`;
      if (!anadromes.has(key)) {
        anadromes.add(key);
        ordered.push(`(${w}`, `${r})`);
      }
    } else {
      ordered.push(w);
    }
  }
  return ordered;
}
