#!/usr/bin/env node
'use strict';

const Trie = require('../js/trie').Trie;
const Random = require('../js/random').Random;

const dict = require('../data/dict.json');
const trie = Trie.create(dict);

const NUM = 1e9; // 1e7 for testing
const EPOCH = Number(process.argv[3]);
const OFFSET = (EPOCH * NUM) + Number(process.argv[4]) / 5 * NUM;

// OPTIMIZED

const NEW_DICE = [
  'AAEEGN', 'ELRTTY', 'AOOTTW', 'ABBJOO',
  'EHRTVW', 'CIMOTU', 'DISTTY', 'EIOSST',
  'DELRVY', 'ACHOPS', 'HIMNQU', 'EEINSU',
  'EEGHNW', 'AFFKPS', 'HLNNRZ', 'DEILRX',
];

const OLD_DICE = [
  'AACIOT', 'AHMORS', 'EGKLUY', 'ABILTY',
  'ACDEMP', 'EGINTV', 'GILRUW', 'ELPSTU',
  'DENOSW', 'ACELRS', 'ABJMOQ', 'EEFHIY',
  'EHINPS', 'DKNOTU', 'ADENVZ', 'BIFORX',
];

const BIG_DICE = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCNSTW',
  'CEIILT', 'CEILPT', 'CEIPST', 'DDLNOR', 'DHHLOR',
  'DHHNOT', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU',
  'FIPRSY', 'GORRVW', 'HIPRRY', 'NOOTUW', 'OOOTTU',
];


class Game {
  constructor(random, dice) {
    this.stats = stats;

    this.dice = dice === 'Big' ? BIG_DICE : dice === 'Old' ? OLD_DICE : NEW_DICE;
    this.size = Math.sqrt(this.dice.length);
    this.min = this.size - 1;

    this.board = [];
    for (const die of this.dice) {
      const c = random.sample(die.split(''));
      this.board.push(c === 'Q' ? 'Qu' : c);
    }
    random.shuffle(this.board);
    this.possible = this.solve();
  }

  solve() {
    const words = {};
    const queue = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let c = this.board[this.size * y + x];
        const ord = c.charCodeAt(0);
        let node = trie.children[ord - 65];
        if (c === 'Qu' && node !== undefined) {
          c = 'QU';
          node = node.children[20]; // ('U' = 85) - 65
        }
        if (node !== undefined) {
          queue.push([x, y, c, node, [[x, y]]]);
        }
      }
    }
    while (queue.length !== 0) {
      const [x, y, s, node, h] = queue.pop();
      for (const [dx, dy] of [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]]) {
        const [x2, y2] = [x + dx, y + dy];
        if (h.find(e => e[0] === x2 && e[1] === y2) !== undefined) continue;
        if (0 <= x2 && x2 < this.size && 0 <= y2 && y2 < this.size) {
          const hist = h.slice();
          hist.push([x2, y2]);

          let c = this.board[this.size * y2 + x2];
          let node2 = node.children[c.charCodeAt(0) - 65];
          if (c === 'Qu' && node2 !== undefined) {
            c = 'QU';
            node2 = node2.children[20]; // ('U' = 85) - 65
          }
          if (node2 !== undefined) {
            const s2 = s + c;
            const isWord = !!node2.isWord; // compute all at once
            if (isWord && s2.length >= this.min) words[s2] = 1;
            queue.push([x2, y2, s2, node2, hist]);
          }
        }
      }
    }
    return words;
  }
}

const stats = {};
for (let i = 0; i < NUM; i++) {
  const seed = OFFSET + i;
  const game = new Game(new Random(seed), process.argv[2]);
  for (const word in game.possible) {
    stats[word] = (stats[word] || 0) + 1;
  }
}
console.log(JSON.stringify(stats));
