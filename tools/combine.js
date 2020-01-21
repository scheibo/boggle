#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const DICT = require('../data/dict.json');
const DICTS = ['NWL', 'ENABLE', 'CSW'];

const stats = {};
const results = path.join(__dirname, 'results');
for (const f of fs.readdirSync(results)) {
  if (!f.endsWith('.json')) continue;

  const dice = f.split('-')[0];
  stats[dice] = stats[dice] || {};
  for (const dict of DICTS) {
    stats[dice][dict] = stats[dice][dict] || {};
  }

  const data = JSON.parse(fs.readFileSync(path.join(results, f)));
  for (const word in data) {
    for (const dict of DICTS) {
      const isWord = !DICT[word].dict || DICT[word].dict.includes(dict.charAt(0));
      if (isWord) stats[dice][dict][word] = (stats[dice][dict][word] || 0) + (data[word] * score(word));
    }
  }
}

for (const dice in stats) {
  for (const dict of DICTS) {
    const words = Object.entries(stats[dice][dict]).sort((a, b) => b[1] - a[1]).map(e => e.join(' ')).join('\n');
    fs.writeFileSync(path.join(results, `${dice}-${dict}.txt`), words);
  }
}

function score(word) {
  if (word.length < 3) return 0;
  if (word.length <= 4) return 1;
  if (word.length === 5) return 2;
  if (word.length === 6) return 3;
  if (word.length === 7) return 5;
  /* if (word.length >= 8) */ return 11;
}
