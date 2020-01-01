#!/usr/bin/env node
'use strict'
const {Game, Random, Trie} = require('../boggle');
const DICT = require('../data/dict.json');
const TRIE = new Trie(DICT, false); // No CSW!
const TYPE = 'N';
const RANDOM = new Random();

const anagrams = {};
const begin = new Date();
for (let i = 0; i < 10000; i++) {
    const game = new Game(TRIE, DICT, RANDOM, TYPE);
    for (const word of game.possible) {
        const anagram = word.split('').sort().join('');
        anagrams[anagram] = (anagrams[anagram] || 0) + 1;
    }
}

for (let a in anagrams) {
    anagrams[a] *= Game.score(a, TYPE);
}

console.log(Array.from(Object.entries(anagrams)).sort((a, b) => b[1] - a[1]).slice(0, 275));
console.log(new Date() - begin);