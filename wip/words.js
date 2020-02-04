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

const DECAY = 10;

const WEIGHTS = {};
for (const json of HISTORY) {
  const game = Game.fromJSON(json, TRIE, DICT, stats);

  const d = 'n'; // TODO
 
  const weights = {};
  for (const w in game.possible) {
    const weight = DICT[w][d] || 0;
    weights[w] = weight * (Game.score(w) / game.totals.s);
  }

  // expensive :|
  for (const w in WEIGHTS) WEIGHTS[w] = WEIGHTS[w] * (1 - (1 / DECAY));
  for (const w in weights) WEIGHTS[w] = (WEIGHTS[w] || 0) + (weights[w] / DECAY);
}

const K = Math.log(DECAY) {
for (const w in WEIGHTS) {
  ratio[w] += K * DICT[w].n * Math.pow(1 - ((found[w] || 0) / possible[w]), 2);
}

for (const e of Object.entries(WEIGHTS).sort((a, b) => b[1] - a[1])) {
  console.log(e[0], e[1]);
}
