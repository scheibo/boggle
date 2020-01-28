#!/usr/bin/env node
'use strict';

const fs = require('fs');

const Game = require('./js/game').Game;
const Stats = require('./js/stats').Stats;
const Trie = require('./js/trie').Trie
const define = require('./js/dict').define;

const DICT = require('./data/dict.json');
const TRIE = Trie.create(DICT);
const HISTORY = require('./history.json');
const STATS = require('./data/stats.json');
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


let out = fs.createWriteStream('history-words');
for (const e of Object.entries(ratio).sort((a, b) => b[1] - a[1])) {
  if (found[e[0]] === possible[e[0]]) break;
  out.write(`${e[0]} ${found[e[0]] || 0}/${possible[e[0]]}: ${define(e[0], DICT)}\n`);
}
out.close();


out = fs.createWriteStream('history-anadromes');
for (const e of Object.entries(anadromes).sort((a, b) => b[1] - a[1])) {
  if (!e[1]) break;

  const k = e[0];
  const r = k.split('').reverse().join('');
  const [n, d] = (found[r] || 0) > (found[k] || 0) ? [k, r] : [r, k];

  out.write(`${n} ${found[n] || 0}/${found[d] || 0} ${d}\n`);
}
out.close();

out = fs.createWriteStream('history-anagrams');
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

out = fs.createWriteStream('threes');
for (const w in DICT) {
  if (w.length === 3) {
    out.write(`${w} ${define(w, DICT)}\n`);
  }
}
out.close();

out = fs.createWriteStream('anadromes');
{
  const anadromes = new Map();
  for (const w in DICT) {
    if (DICT[w].dict && !DICT[w].dict.includes('N')) continue;

    const a = w.split('').reverse().join('');
    if (a === w) continue;

    if (DICT[a] && (!DICT[a].dict || DICT[a].dict.includes('N'))) {
      anadromes.set(`${[w, a].sort().join(' ')}`, (DICT[w].n || 0) + (DICT[a].n || 0));
    }
  }

  for (const e of Array.from(anadromes.entries()).sort((a, b) => b[1] - a[1])) {
    if (e[0].length < 7) continue;
    const [a, b] = e[0].split(' ');
    out.write(`${a} ${define(a, DICT)}\n${b} ${define(b, DICT)}\n\n`);
  }
}
out.close();

{

  const anagrams = {};
  for (const w in DICT) {
    if (DICT[w].dict && !DICT[w].dict.includes('N')) continue;
    const a = Stats.toAnagram(w);
    anagrams[a] = anagrams[a] || [];
    anagrams[a].push(w);
  }

  const totalScore = ws => ws.reduce((acc, w) => acc + DICT[w].n, 0);

  const fn = (a, b) => {
    if (b[1].length !== a[1].length) return b[1].length - a[1].length
    return totalScore(b[1]) - totalScore(a[1]);
  };

  for (const max of [2, 3, 4, 5, 6, 7]) {
    out = fs.createWriteStream(`anagrams-${max}`);
    let length = 0;
    for (const e of Array.from(Object.entries(anagrams)).sort(fn)) {
      if (e[0].length !== max) continue;
      if (e[1].length < 2) continue;
      if (!length) {
        length = e[1].length;
      } else if (length != e[1].length) {
        out.write('++++++++++++++++++++++++++++++\n\n');
        length = e[1].length;
      }
      const g = group(e[1]);
      out.write(`${g}\n----------\n`);
      for (const x of g.split(' ')) {
        if (!x) continue;
        const w = x.replace(/[^A-Z]/, '');
        out.write(`${w} ${define(w, DICT)}\n`);
      }
      out.write('\n');
    }
    out.close();
  }

  function group(words) {
    const solo = [];
    const anadromes = new Set();

    for (const w of words) {
      const r = w.split('').reverse().join('');
      if (r !== w && words.includes(r)) {
        anadromes.add(`(${[w, r].sort().join(' ')})`);
      } else {
        solo.push(w);
      }
    }

    return anadromes.size ? 
      `${Array.from(anadromes).join(' ')} ${solo.join(' ')}` :
      solo.join(' ');
  }

}

