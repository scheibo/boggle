#!/usr/bin/env node
'use strict';

const Game = require('./js/game').Game;
const Trie = require('./js/trie').Trie

const DICT = require('./data/dict.json');
const TRIE = Trie.create(DICT);
const STATS = require('./data/stats.json');
const HISTORY = require('./history.json');

const possible = {};
const found = {};

for (const json of HISTORY) {
  const game = Game.fromJSON(json, TRIE, DICT, STATS);
  const valid= new Set();

  const stats = {invalid: 0, total: 0, score: 0};
  let last = game.start;
  for (const w in game.played) {
    stats.total++;
    const t = game.played[w];
    last = Math.abs(t);
    if (t < 0) {
      stats.invalid++;
    } else {
      found[w] = (found[w] || 0) + 1;
      stats.score += Game.score(w);
      valid.add(w);
    }
  }

  if (stats.score < 10 ||
    (stats.score / json.goal.D < 0.25) ||
    (last - game.start < 90 * 1000)) {
    continue;
  }

  const anagrams = {};
  for (const w in game.possible) {
    possible[w] = (possible[w] || 0) + 1;
    const anagram = w.split('').sort().join('');
    anagrams[anagram] = anagrams[anagram] || [];
    anagrams[anagram].push(w);
  }
}

const anadromes = {};
const ratio = {};
for (const w in possible) {
  ratio[w] = DICT[w].n * (1 - ((found[w] || 0) / possible[w]));

  const r = w.split('').reverse().join('');
  if (r === w) continue;
  if (possible[r]) {
    const k = [w, r].sort()[0];
    if ((found[r] || 0) > (found[w] || 0)) {
      anadromes[k] = DICT[k].n * ((found[r] || 0) - (found[w] || 0));
    } else {
      anadromes[k] = DICT[k].n * ((found[w] || 0) - (found[r] || 0));
    }
  }
}

for (const e of Object.entries(ratio).sort((a, b) => b[1] - a[1])) {
  if (found[e[0]] === possible[e[0]]) break;
  console.log(`${e[0]} ${found[e[0]] || 0}/${possible[e[0]]}`);
}

console.log('---');


for (const e of Object.entries(anadromes).sort((a, b) => b[1] - a[1])) {
  if (!e[1]) break;

  const k = e[0];
  const r = k.split('').reverse().join('');
  if ((found[r] || 0) > (found[k] || 0)) {
    console.log(`${k} ${found[k] || 0}/${found[r] || 0} ${r} (${DICT[k].n})`);
  } else {
    console.log(`${r} ${found[r] || 0}/${found[k] || 0} ${k} (${DICT[k].n})`);
  }
}

