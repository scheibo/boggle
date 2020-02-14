#!/usr/bin/env node
'use strict';

const data = require('./backup.json')

const DICT = require('../data/dict.json');
const STATS = require('../data/stats.json');
const Stats = require('../js/stats').Stats;
const stats = new Stats(STATS, DICT);

const anagrams = {};
const played = {};
for (const game of data.history) {
  for (const word in game.words) {
    if (game.words[word] > 0) {
      played[word] = (played[word] || 0) + 1;
      const a = Stats.toAnagram(word);
      anagrams[a] = stats.anagrams(a, 'NWL', 3).words.length;
    }
  }
}
console.log(
  Object.keys(played).length,
  Object.keys(anagrams).length,
  Object.values(anagrams).reduce((acc, n) => acc + n, 0));

for (const config of [['n', 3], ['b', 4]]) {
  let total = 0;
  for (const k in stats.mixed) {
    total += stats.anagrams(k, 'NWL', config[1])[config[0]] || 0;
  }

  let demonstrated = 0;
  for (const w in played) {
    if (w.length >= config[1]) demonstrated += DICT[w][config[0]] || 0;
  }

  let potential = 0;
  for (const k in anagrams) {
    potential += stats.anagrams(k, 'NWL', config[1])[config[0]] || 0;
  }

  let words = 0;
  let learned = 0;
  for (const e of data.NWL) {
    const a = stats.anagrams(e.k, 'NWL', config[1]);
    const w = a[config[0]] || 0;
    if (w) {
      words += a.words.length;
      learned += w;
    }
  }

  console.log(
    config,
    words, learned, demonstrated, potential, total,
    (learned/total*100).toFixed(2),
    (demonstrated/total*100).toFixed(2),
    (potential/total*100).toFixed(2));
}