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

async function addWordList(dict, f, fn) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, f)),
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    dict.add(fn(line));
  }
}

(async () => {
  let lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'csw.2019.txt')),
    crlfDelay: Infinity
  });

  const dict = new Set();
  addWordList(dict, 'nwl.2018.txt', line => line.toUpperCase());
  addWordList(dict, 'enable.txt', line => line.toUpperCase());
  addWordList(dict, 'csw.2019.txt', line => splitFirst(line, '\t')[0]);

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'count_1w.txt')),
    crlfDelay: Infinity
  });

  const out = fs.createWriteStream(path.join(DATA, 'clean_1w.txt'));
  for await (const line of lines) {
    const [word, freq] = splitFirst(line, '\t');
    if (dict.has(word.toUpperCase())) out.write(line + '\n');
  }
  out.end();
})();
