#!/usr/bin/env node
'use strict';

const fs = require('fs');

const Game = require('./js/game').Game;
const Stats = require('./js/stats').Stats;
const Trie = require('./js/trie').Trie

const DICT = require('./data/dict.json');
const TRIE = Trie.create(DICT);
const HISTORY = require('./history.json');
const STATS = require('./data/stats.json');
const stats = new Stats(STATS, DICT);



// all possible, all found, found anadrome but not this, found anagram but not, score
//
// SCORE: = track how many words on board + how many words found - not punished as much if lots of words and miss some due to timing?


const possible = {};
const found = {};
const anadromes = {};
const anagrams = {};

for (const json of HISTORY) {
  const game = Game.fromJSON(json, TRIE, DICT, STATS);
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
    possible[w] = (possible[w] || 0) + 1;
    const a = Stats.toAnagram(w);
    as[a] = as[a] || [];
    as[a].push(w);

    if (valid.has(w)) {
      found[w] = (found[w] || 0) + 1;

      const r = w.split('').reverse().join('');
      if (r !== w && game.possible[r] && !valid.has(r)) {
        const k = [w, r].sort()[0];
        anadromes[k] = (anadromes[w] || 0) + 1;
      }
    }
  }

  for (const a in as) {
    const group = as[a];
    const f = group.filter(w => valid.has(w)).length;
    if (!f) continue;
    for (const w of group) {
      if (!valid.has(w)) {
        anagrams[w] = (anagrams[w] || 0) + 1;
      }
    }
  }
}

for (const [w] of Object.entries(possible).sort((a, b) => b[1] - a[1])) {
  console.log(`${w} ${found[w] || 0}/${possible[w]} ${anadromes[w] || 0} ${anagrams[w] || 0}`);
}
