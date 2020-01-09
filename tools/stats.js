#!/usr/bin/env node
'use strict';

const {Game, Random, Trie} = require('../boggle');

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DATA = path.resolve(__dirname, '../data');
const DICT = require('../data/dict.json');
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

async function anagrams(file) {
  const lines = readline.createInterface({
    input: fs.createReadStream(path.join(DATA, file)),
    crlfDelay: Infinity
  });

  const csw = {words: {}, anagrams: {}, total: 0};
  const twl = {words: {}, anagrams: {}, total: 0};
  for await (const line of lines) {
    const [word, s] = splitFirst(line, ' ');
    if (!DICT[word]) continue;
    const score = Number(s);
    const anagram = toAnagram(word);

    if (DICT[word].twl) {
      twl.words[word] = score;
      twl.anagrams[anagram] = (twl.anagrams[anagram] || 0) + 1;
      twl.total += score;
    }

    csw.words[word] = score;
    csw.anagrams[anagram] = (csw.anagrams[anagram] || 0) + 1;
    csw.total += score;
  }

  return {twl, csw};
}

function stats(dice, dict, data) {
  data = data[dict.toLowerCase()];

  const grades = {};
  for (const word in DICT) {
    if (dict === 'TWL' && !DICT[word].twl) continue;
    const grade = Game.grade(word, DICT, dice, dict);
    if (!grade) throw new Error(word);
    if (!grades[grade]) {
      grades[grade] = {count: 0, score: 0, anagrams: {}};
    }
    const tot = grades[grade];
    tot.count++;
    tot.score += (data.words[word] || 0);
    const a = data.anagrams[toAnagram(word)] || 0;
    tot.anagrams[a] = (tot.anagrams[a] || 0) + 1;
  }

  const dc = grades.D.count || 0;
  const cc = dc + (grades.C.count || 0);
  const bc = cc + (grades.B.count || 0);
  const ac = bc + (grades.A.count || 0);
  const sc = ac + (grades[' '].count || 0);

  const ds = grades.D.score || 0;
  const cs = ds + (grades.C.score || 0);
  const bs = cs + (grades.B.score || 0);
  const as = bs + (grades.A.score || 0);
  const ss = as + (grades[' '].score || 0);

  const pct = v => Number((v * 100 / data.total).toFixed(2));
  // TODO: note anagrams are not cumulative...
  console.log(dice, dict, {
    D: [dc, pct(ds), /*grades.D.anagrams*/],
    C: [cc, pct(cs), /*grades.C.anagrams*/],
    B: [bc, pct(bs), /*grades.B.anagrams*/],
    A: [ac, pct(as), /*grades.A.anagrams*/],
    S: [sc, pct(ss), /*grades[' '].anagrams*/],
  });
}

(async () => {
  const [n, o, b] = await Promise.all([
    anagrams('new4x4.txt'),
    anagrams('old4x4.txt'),
    anagrams('5x5.txt')
  ]);

  stats('New', 'TWL', n);
  stats('Old', 'TWL', o);
  stats('Big', 'TWL', b);
  stats('New', 'CSW', n);
  stats('Old', 'CSW', o);
  stats('Big', 'CSW', b);
})();
