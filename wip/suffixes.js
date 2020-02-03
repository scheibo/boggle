#!/usr/bin/env node
'use strict'

const dict = require('./data/dict.json');

let nd = 0;
let good = {};
const s = [];

// TODO: look in defn for -S/-ED/-ER/_ING etc
for (const w in dict) {
  //if (w.endsWith('S') && !w.endsWith('SS')) {
  if (w.endsWith('ER')) {
    const defn = dict[w].defn;

    let match;
    if (!defn) {
      nd++;
    } else if (match = defn.match(/^[A-Z]{2,}/)) {
      good[w] = match[0];
    } else {
      s.push(w);
      console.log(w, defn);
    }
  }
}

console.log(nd);;
console.log(Object.keys(good).length);
console.log(s.length);
