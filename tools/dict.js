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

function toAnagram(word) {
  return word.split('').sort().join('');
}

const DICTS = ['NWL', 'ENABLE', 'CSW'];

async function anagrams(file, dict) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, file)),
    crlfDelay: Infinity
  });

  const data = {};
  for (const d of DICTS) {
    data[d] = {words: {}, anagrams: {}, total: 0};
  }

  const words = {};
  for await (const line of lines) {
    const [word, s] = splitFirst(line, ' ');
    const score = Number(s);
    const anagram = toAnagram(word);

    words[word] = score;

    const val = dict[word];
    if (!val) continue;
    for (const d of DICTS) {
      if (val.dict.includes(d.charAt(0))) {
        data[d].words[word] = score;
        data[d].anagrams[anagram] = (data[d].anagrams[anagram] || 0) + score;
        data[d].total += score;
      }
    }
  }

  const stats = {};
  for (const d of DICTS) {
    stats[d] = {
      words: percentiles(Object.values(data[d].words), data[d].total),
      anagrams: percentiles(Object.values(data[d].anagrams), data[d].total),
      total: data[d].total,
    };
  }

  return {words, stats};
}

async function addWordList(dict, list, id) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, list)),
    crlfDelay: Infinity
  });

  for await (const word of lines) {
    const w = word.toUpperCase();
    if (dict[w]) {
      dict[w].dict += id;
    } else {
      dict[w] = {dict: id};
    }
  }
}

async function buildDictionary() { 
  let lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'clean_1w.txt')),
    crlfDelay: Infinity
  });

  const freqs = {};
  let total = 0;
  for await (const line of lines) {
    const [word, freq] = splitFirst(line, '\t');
    const f = Number(freq);
    total += f;
    freqs[word.toUpperCase()] = f;
  }

  const dict = {};
  await addWordList(dict, 'nwl.2018.txt', 'N');
  await addWordList(dict, 'enable.txt', 'E');

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'csw.2019.txt')),
    crlfDelay: Infinity
  });

  for await (const line of lines) {
    const [word, defn] = splitFirst(line, '\t');
    if (dict[word]) {
      dict[word].dict += 'C';
      dict[word].defn = defn;
    } else {
      dict[word] = {dict: 'C', defn};
    }
  }

  const [n, o, b] = await Promise.all([
    anagrams('new4x4.txt', dict),
    anagrams('old4x4.txt', dict),
    anagrams('5x5.txt', dict)
  ]);

  for (const word in dict) {
    const val = dict[word];

    if (freqs[word]) val.freq = freqs[word];

    if (n.words[word]) val.n = n.words[word];
    if (o.words[word]) val.o = o.words[word];
    if (b.words[word]) val.b = b.words[word];

    if (val.dict === 'NEC') delete val.dict;
  }

  const stats = {
    New: n.stats,
    Old: o.stats,
    Big: b.stats,
    freqs: percentiles(Object.values(freqs)),
    total,
  };
  return {dict, stats};
}

function percentiles(arr, n) {
  const ptiles = [];
  arr = arr.sort((a, b) => b - a);

  let i = 1;
  let tot = 0;
  for (const v of arr) {
    if (i > 100) break;

    let cond;
    if (n) {
      tot += v;
      cond = tot >= i / 100 * n;
    } else {
      tot++;
      cond = tot >= i / 100 * arr.length;
    }
    if (cond) {
      i++;
      ptiles.push(v);
    }
  }

  return ptiles;
}

(async () => {
  const {dict, stats} = await buildDictionary();
  fs.writeFileSync(path.join(DATA, 'dict.json'), JSON.stringify(dict));
  fs.writeFileSync(path.join(DATA, 'stats.json'), JSON.stringify(stats));
})();
