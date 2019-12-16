#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA = path.resolve(__dirname, '../data');
const CUTOFF = 100;
const MIN_LENGTH = 3;

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

async function anagrams(file) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, file)),
    crlfDelay: Infinity
  });

  const anagrams = new Set();
  let same = null;
  let i = 0;
  for await (const line of lines) {
    if (same) {
      if (same.split('').sort().join('') !== line.split('').sort().join('')) {
        if (++i > CUTOFF) break;
        same = line;
      }
    } else {
      same = line;
    }
    anagrams.add(line);
  }
  return anagrams;
}

const NEW = anagrams('new4x4.txt');
const OLD = anagrams('old4x4.txt');
const BIG = anagrams('5x5.txt');

async function buildDictionary() { 
  let lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'count_1w.txt')),
    crlfDelay: Infinity
  });

  const freqs = {};
  let i = 0;
  for await (const line of lines) {
    i++;
    const [word, freq] = splitFirst(line, '\t');
    if (word.length < MIN_LENGTH) continue;
    freqs[word.toUpperCase()] = [i, Number(freq)];
  }

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'csw.txt')),
    crlfDelay: Infinity
  });

  const [n, o, b] = await Promise.all([NEW, OLD, BIG]);

  const dict = {};
  i = 0;
  for await (const line of lines) {
    const [word, def] = splitFirst(line, ' ');
    const defn = def.replace(/\{(.*?)=.*?\}/g, '$1')
      .replace(/<(.*?)=.*?>/g, '$1')
      .replace(/\s*?\[.*?\]\s*?/g, '')
    if (word.length < MIN_LENGTH) continue;
    const val = {defn};

    const freq = freqs[word];
    if (freq) val.freq = freq;

    let type = '';
    if (n.has(word)) type += 'n';
    if (o.has(word)) type += 'o';
    if (b.has(word)) type += 'b';
    if (type) val.type = type;

    dict[word] = val;
  }

  return dict;
}

(async () => {
  const dict = await buildDictionary();
  fs.writeFileSync(path.join(DATA, 'dict.json'), JSON.stringify(dict));
})();
