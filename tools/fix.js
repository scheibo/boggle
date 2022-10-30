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
  const dict = new Set();
  await addWordList(dict, 'nwl.2020.txt', line => line.toUpperCase());
  await addWordList(dict, 'enable.txt', line => line.toUpperCase());
  await addWordList(dict, 'csw.2019.txt', line => splitFirst(line, '\t')[0]);

  let lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'freq.ngram.txt')),
    crlfDelay: Infinity
  });

  const ngram = {words: {}, total: 0};
  for await (const line of lines) {
    const [word, freq] = splitFirst(line, '\t');
    const w = word.toUpperCase();
    const f = Number(freq)
    if (dict.has(w) && !isNaN(f)) {
      ngram.words[w] = f;
      ngram.total += f;
    }
  }

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'freq.bnc.txt')),
    crlfDelay: Infinity
  });

  const bnc = {words: {}, total: 0};
  for await (const line of lines) {
    const [freq, word] = splitFirst(line, ' ', 2);
    const w = word.toUpperCase();
    const f = Number(freq)
    if (dict.has(w) && !isNaN(f) && !bnc.words[w]) {
      bnc.words[w] = f;
      bnc.total += f;
    }
  }

  const freqs = {};
  for (const w in ngram.words) {
    freqs[w] = (ngram.words[w] / ngram.total) + ((bnc.words[w] || 0) / bnc.total) * 1e20;
  }

  for (const w in bnc.words) {
    if (freqs[w]) continue;
    freqs[w] = (bnc.words[w] / bnc.total) * 1e20;
  }

  const entries = Object.entries(freqs);
  const len = entries.length;
  const out = fs.createWriteStream(path.join(DATA, 'freqs.txt'));
  for (const [i, [word]] of entries.sort((a, b) => b[1] - a[1]).entries()) {
    out.write(`${word} ${len - i}\n`);
  }
  out.end();
})();
