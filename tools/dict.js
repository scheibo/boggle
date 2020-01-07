#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA = path.resolve(__dirname, '../data');
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

function toAnagram(word) {
  return word.split('').sort().join('');
}

async function anagrams(file, TWL) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, file)),
    crlfDelay: Infinity
  });

  const csw = {words: {}, anagrams: {}, total: 0};
  const twl = {words: {}, anagrams: {}, total: 0};
  for await (const line of lines) {
    const [word, s] = splitFirst(line, ' ');
    const score = Number(s);
    const anagram = toAnagram(word);

    if (TWL.has(word)) {
      twl.words[word] = score;
      twl.anagrams[anagram] = (twl.anagrams[anagram] || 0) + score;
      twl.total += score;
    }

    csw.words[word] = score;
    csw.anagrams[anagram] = (csw.anagrams[anagram] || 0) + score;
    csw.total += score;
  }

  percentilize(twl.words, twl.total);
  percentilize(twl.anagrams, twl.total);
  percentilize(csw.words, csw.total);
  percentilize(csw.anagrams, csw.total);
  
  return {twl, csw};
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
    if (word.length < MIN_LENGTH) continue;
    const f = Number(freq);
    total += f;
    freqs[word.toUpperCase()] = f;
  }
  percentilize(freqs, total);

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'twl.txt')),
    crlfDelay: Infinity
  });

  const twl = new Set();
  for await (const word of lines) {
    if (word.length < MIN_LENGTH) continue;
    twl.add(word.toUpperCase());
  }

  const [n, o, b] = await Promise.all([
    anagrams('new4x4.txt', twl),
    anagrams('old4x4.txt', twl),
    anagrams('5x5.txt', twl)
  ]);

  lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, 'csw.txt')),
    crlfDelay: Infinity
  });

  const fd = p => {
    if (p === undefined || p >= 99) return ' ';
    if (p >= 96) return 'A';
    if (p >= 93) return 'B';
    if (p >= 86) return 'C';
    return 'D';
  }

  const dict = {};
  for await (const line of lines) {
    const [word, def] = splitFirst(line, ' ');
    const defn = def.replace(/\{(.*?)=.*?\}/g, '$1')
      .replace(/<(.*?)=.*?>/g, '$1')
      .replace(/\s*?\[.*?\]\s*?/g, '')
    if (word.length < MIN_LENGTH) continue;
    const val = {defn};
    const f = fd(freqs[word]);
    if (twl.has(word)) val.twl = encode(n.twl, o.twl, b.twl,  word, f);
    const v = encode(n.csw, o.csw, b.csw, word, f);
    if (v !== ' ' && v !== val.twl) val.csw = v;

    dict[word] = val;
  }

  return dict;
}

function encode(n, o, b, w, f) {
  const a = toAnagram(w);
  const grade = p => {
    if (p === undefined || p >= 75) return ' ';
    if (p >= 50) return 'A';
    if (p >= 25) return 'B';
    if (p >= 10) return 'C';
    return 'D';
  }
  const combine = (p1, p2) => {
    const g1 = grade(p1);
    const g2 = grade(p2);
    const g = g1 < g2 ? g2 : g1;
    return g < f ? f : g;
  }
  const encoded =
    `${combine(n.words[w], n.anagrams[a])}` +
    `${combine(o.words[w], o.anagrams[a])}` +
    `${combine(b.words[w], b.anagrams[a])}`;
  return encoded.split('').every(c => c === encoded[0]) ? encoded[0] : encoded;
}

function percentilize(obj, n) {
  const ptiles = percentiles(Object.values(obj), n);
  for (const k in obj) {
    obj[k] = ptiles.findIndex(v => v <= obj[k]);
  }
}

function percentiles(arr, n) {
  const ptiles = [];
  arr = arr.sort((a, b) => b - a);

  let i = 1;
  let tot = 0;
  for (const v of arr) {
    if (i > 100) break;
    tot += v;
    if (tot >= i / 100 * n) {
      i++;
      ptiles.push(v);
    }
  }

  return ptiles;
}

(async () => {
  const dict = await buildDictionary();
  fs.writeFileSync(path.join(DATA, 'dict.json'), JSON.stringify(dict));
})();
