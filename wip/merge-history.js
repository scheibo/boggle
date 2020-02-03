#!/usr/bin/env node
'use strict';

const fs = require('fs');

const HISTORIES = [];
for (const f of process.argv.slice(2)) {
  HISTORIES.push(JSON.parse(fs.readFileSync(f)));
}

const HISTORY = [];
for (const h of HISTORIES) {
  for (const g of h) {
    if (!Object.keys(g.words).length) continue;

    const i = HISTORY.findIndex(v => v.seed === g.seed)
    if (i !== -1) {
      const e = HISTORY[i];
      if (Object.keys(e.words).length > Object.keys(g.words).length) {
        console.error(`${e.seed}: ${Object.keys(e.words).length} > ${Object.keys(g.words).length}`);
      } else {
        console.error(`${e.seed}: ${Object.keys(e.words).length} <= ${Object.keys(g.words).length}`);
        HISTORY.splice(i, 1);
        HISTORY.push(g);
      }
    } else {
      HISTORY.push(g);
    }
  }
}

console.error(HISTORY.length);

console.log(JSON.stringify(HISTORY));

