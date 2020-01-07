#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA = path.resolve(__dirname, '../data');

function splitFirst(str, delimiter, limit = 1) {
  const splitStr = [];
  while (splitStr.length < limit) {
    const delimiterIndex = str.indexOf(delimiter);
    if (delimiterIndex >= 0) {
      splitStr.push(str.slice(0, delimiterIndex));
      str = str.slice(delimiterIndex + delimiter.length);
    } else {
      splitStr.push(str);
      str = '';
    }
  }
  splitStr.push(str);
  return splitStr;
}

(async () => {
  let lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'csw.txt')),
    crlfDelay: Infinity
  });

  const dict = {};
  for await (const line of lines) {
    const [word, def] = splitFirst(line, ' ');
    dict[word] = def;
  }

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'count_1w.txt')),
    crlfDelay: Infinity
  });

  const out = fs.createWriteStream(path.join(DATA, 'clean_1w.txt'));
  for await (const line of lines) {
    const [word, freq] = splitFirst(line, '\t');
    if (dict[word.toUpperCase()]) out.write(line + '\n');
  }
  out.end();
})();
