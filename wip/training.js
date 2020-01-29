#!/usr/bin/env node
'use strict';

const Stats = require('./js/stats').Stats;

const DICT = require('./data/dict.json');
const STATS = require('./data/stats.json');

const stats = new Stats(STATS, DICT);

for (const k in Stats.anagrams) {
  const anagrams = Stats.anagrams[k];

}

const storage = {};
for (const w in DICT) {
  storage[w] = {
    difficulty: initialDifficulty(w),
    duration: 0,
    last: 0,


    possible: 0,
    found: 0,
    anadromes: 0,
    anagrams: 0,
  }
}

const GRADES = {' ': 1.0, 'A': 0.8, 'B': 0.6, 'C': 0.4, 'D': 0.2};
function initialDifficulty(w, settings) {
  const gr = (w: string) => GRADES[w.length >= settings.min ? Stats.grade(w, DICT, settings.dice, settings.dict) : ' '];
  const group = Stats.anagrams[Stats.toAnagram(w)];

  const size = Math.min(group.length / 10, 1);
  const avg = group.reduce((tot, w) tot + gr(w)) / size;
  const grade = gr(w);
  const length = Math.min(w.length / 10, 1);

  return (size + avg + grade + length) / 4;
}

function processGame(game) {
  const valid = new Set();

  let score = 0;
  let last = game.start;
  for (const w in game.played) {
    const t = game.played[w];
    last = Math.abs(t);
    if (t > 0) {
      score += Game.score(w);
      valid.add(w);
    }
  }

  // TODO better termination?
  if ((score / json.goal.D < 0.25) || (last - game.start < 90 * 1000)) {
    continue;
  }

  const as = {};
  for (const w in game.possible) {
    storage[w] = storage[w] || {};
    storage[w].possible = (storage[w].possible || 0) + 1;
    const a = Stats.toAnagram(w);
    as[a] = as[a] || [];
    as[a].push(w);

    if (valid.has(w)) {
      storage[w].found = (storage[w].found || 0) + 1;

      const r = w.split('').reverse().join('');
      if (r !== w && game.possible[r] && !valid.has(r)) {
        storage[w].anadromes = (storage[w].anadromes || 0) + 1;
      }
    }
  }

  for (const a in as) {
    const group = as[a];
    const f = group.filter(w => valid.has(w)).length;
    if (!f) continue;
    for (const w of group) {
      if (!valid.has(w)) {
        storage[w].anagrams[ = (storage[w].anagrams || 0) + 1;
      }
    }
  }

  // TODO update priorities of groups!
}
