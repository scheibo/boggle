#!/usr/bin/env node
'use strict';

const fs = require('fs');

const Game = require('../js/game').Game;
const Stats = require('../js/stats').Stats;
const Trie = require('../js/trie').Trie

const DICT = require('../data/dict.json');
const TRIE = Trie.create(DICT);
const HISTORY = require('./history.json');
const STATS = require('../data/stats.json');
const stats = new Stats(STATS, DICT);

const games = new Map();
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

  if (score < 10 ||
    (score / json.goal.D < 0.25) ||
    (last - game.start < 90 * 1000)) {
    continue;
  }

  games.set(game, valid);
}

const ratio = {};
const anadromes = {};
const anagrams = {};

const possible = {};
const found = {};
let n = games.size;
for (const [game, valid] of games.entries()) {
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
        anadromes[k] = (anadromes[w] || 0) + (1 / n * DICT[k].n);
      }
    } else {
      ratio[w] = (ratio[w] || 0) + (1 / n * DICT[w].n);
    }
  }

  // TODO depends on how much you already get!
  for (const a in as) {
    const group = as[a];
    if (group.length <= 1) continue;
    const f = group.filter(w => valid.has(w)).length / group.length;
    if (!f) continue;
    const w = group.reduce((acc, w) => acc + DICT[w].n, 0) / group.length;
    anagrams[a] = (anagrams[a] || 0) + (1 / n * w * (1 - f));
  }
  n--;
}

const K = Math.log(games.size);
for (const w in possible) {
  ratio[w] += K * DICT[w].n * Math.pow(1 - ((found[w] || 0) / possible[w]), 2);
  if (anadromes[w]) {
    const r = w.split('').reverse().join('');
    const [n, d] = (found[r] || 0) > (found[w] || 0) ? [w, r] : [r, w];
    anadromes[w] += K * DICT[w].n * 2 * Math.pow(1 - ((found[n] || 0) / (possible[d] || 1)), 2);
  }

  const a = Stats.toAnagram(w);
  if (anagrams[a] && possible[w]) {
    anagrams[w] += K * DICT[w].n * Math.pow(1 - ((found[w] || 0) / possible[w]), 2);
  }
}


let out = fs.createWriteStream('words');
for (const e of Object.entries(ratio).sort((a, b) => b[1] - a[1])) {
  if (found[e[0]] === possible[e[0]]) break;
  out.write(`${e[0]} ${found[e[0]] || 0}/${possible[e[0]]}\n`);
}
out.close();


out = fs.createWriteStream('anadromes');
for (const e of Object.entries(anadromes).sort((a, b) => b[1] - a[1])) {
  if (!e[1]) break;

  const k = e[0];
  const r = k.split('').reverse().join('');
  const [n, d] = (found[r] || 0) > (found[k] || 0) ? [k, r] : [r, k];

  out.write(`${n} ${found[n] || 0}/${found[d] || 0} ${d}\n`);
}
out.close();

out = fs.createWriteStream('anagrams');
for (const e of Object.entries(anagrams).sort((a, b) => b[1] - a[1])) {
  if (!e[1]) break;

  let s = [];
  for (const w of stats.anagrams[e[0]]) {
    if (!possible[w]) continue;
    s.push(`${w} ${found[w] || 0}/${possible[w] || 0}`);
  }

  if (s.length > 1) out.write(`${s.join(' ')}\n`);
}
out.close();

