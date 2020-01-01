'use strict';

class Random {
  constructor(seed = 4 /* https://xkcd.com/221/ */) {
    this.seed = seed;
  }

  // Mulberry32: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
  next(min, max) {
    if (min) min = Math.floor(min);
    if (max) max = Math.floor(max);

    let z = (this.seed += 0x6d2b79f5 | 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z = z ^ (z + Math.imul(z ^ (z >>> 7), z | 61));
    z = (z ^ (z >>> 14)) >>> 0;
    const n = z / 2 ** 32;

    if (min === undefined) return n;
    if (!max) return Math.floor(n * min);
    return Math.floor(n * (max - min)) + min;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  sample(arr, remove = false) {
    if (arr.length === 0) throw new RangeError('Cannot sample an empty array');
    const index = this.next(arr.length);
    const val = arr[index];
    if (remove) {
      arr[index] = arr[arr.length - 1];
      arr.pop();
    }
    if (val === undefined && !Object.prototype.hasOwnProperty.call(arr, index)) {
      throw new RangeError(`Cannot sample a sparse array`);
    }
    return val;
  }
}

class Trie {
  constructor(dict, csw) {
    const root = new Node(undefined, '');
    for (const word in dict) {
      if (!csw && dict[word].csw) continue;
      let current = root;
      for (var i = 0; i < word.length; i++) {
          const letter = word[i];
          const ord = letter.charCodeAt(0);
          let next = current.children[ord - 65];
          if (next === undefined) next = new Node(current, letter);
          current = next;
      }
      current.isWord = true;
    }
    return root;
  }
}

class Node {
  constructor(parent, value) {
    this.parent = parent;
    this.children = new Array(26);
    this.isWord = false;
    if (parent !== undefined) parent.children[value.charCodeAt(0) - 65] = this;
  }
}

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

const SUFFIXES = ['S', 'ER', 'ED', 'ING'];

const FREQUENCY = 10000;

class Game {
  constructor(trie, dict, random, type = 'n') {
    this.trie = trie;
    this.dict = dict;

    this.type = type;
    this.dice =
      this.type === 'd' || this.type ===  'b' ? BIG_DICE :
      this.type === 'o' ? OLD_DICE : NEW_DICE;
    this.size = Math.sqrt(this.dice.length);

    this.random = random;
    do {
      this.seed = this.random.seed;
      this.board = [];
      for (const die of this.dice) {
        const c = this.random.sample(die.split(''));
        this.board.push(c === 'Q' ? 'Qu' : c);
      }
      this.random.shuffle(this.board);
      this.possible = this.solve();
    } while (this.possible.size === 0);

    this.id = `${this.type.toUpperCase()}${this.seed}`;

    this.played = {};
    this.overtime = new Set();
    this.score = {regular: 0, overtime: 0};

    this.start = +new Date();
    this.expired = null; // set to timestamp!
  }

  play(word) {
    if (!this.played[word]) {
      if (this.possible.has(word)) {
        this.played[word] = +new Date();
        const score = Game.score(word, this.size);
        if (this.expired) this.overtime.add(word);

        const bucket = this.expired ? 'overtime' : 'regular';
        this.score[bucket] += score;
        return score;
      } else {
        this.played[word] = -new Date();
        if (this.expired) this.overtime.add(word);
      }
    }
    return 0;
  }

  toJSON() {
    return {
      seed: this.id,
      start: this.start,
      expired: this.expired,
      words: this.played,
      goal: this.totals.goal,
    }
  }

  static fromJSON(json, trie, dict) {
    const type = json.seed[0];
    const random = new Random(Number(json.seed.slice(1)));
    const game = new Game(trie, dict, random, type.toLowerCase());
    game.start = json.start;
    game.expired = json.expired;
    game.played = json.words;
    return game;
  }

  get totals() {
    if (this.totals_) return this.totals_;

    const suffixes = {};
    const anagrams = {};
    const groups = new Set();
    const easy = new Set();

    const goal = new Set();
    let total = 0;
    for (const word of this.possible) {
      // Suffixes
      for (const suffix of SUFFIXES) {
        if (word.endsWith(suffix)) {
          const root = word.slice(0, word.length - suffix.length);
          if (this.possible.has(root)) {
            suffixes[word] = root;
          } else if (suffix.startsWith('E') && this.possible.has(`${root}E`)) {
            suffixes[word] = `${root}E`;
          }
        }
      }

      // Anagrams
      const anagram = word.split('').sort().join('');
      anagrams[anagram] = (anagrams[anagram] || 0) + 1;

      const data = this.dict[word];

      // Groups
      if (this.type &&
        data.type &&
        (data.type.includes(this.type) ||
         this.type === 'd' && data.type.includes('b'))) {
        groups.add(word);
        goal.add(word);
      }

      // Easy
      if (data.freq && data.freq[0] <= FREQUENCY) {
        easy.add(word);
        goal.add(word);
      }
    }

    const g = Array.from(goal).reduce((sum, w) => sum + Game.score(w, this.size), 0);
    return this.totals_ = {suffixes, anagrams, groups, easy, goal: g};
  }

  progress() {
    // const anagrams = {};

    let total = 0;
    let invalid = 0;

    let suffixes = 0;
    let anagrams = 0;
    let groups = 0;
    let easy = 0;

    // let expected = 0;
    // let actual = 0;
    for (const word in this.played) {
      total++;
      if (this.played[word] < 0) {
        invalid++;
        continue;
      }

      // Suffixes
      /*
      for (const suffix of SUFFIXES) {
        if (this.totals.suffixes[word + suffix]) {
          expected++;
        }
        if (word.endsWith(suffix) && this.totals.suffixes[word]) {
          actual++;
        }
      }

      // Anagrams
      const anagram = word.split('').sort().join('');
      anagrams[anagram] = (anagrams[anagram] || 0) + 1; 
      */

      const score = Game.score(word, this.type);
      if (this.totals.suffixes[word]) suffixes += score;
      if (this.totals.anagrams[word]) anagrams += score;
      if (this.totals.groups.has(word)) groups += score;
      if (this.totals.easy.has(word)) easy += score;
    }

    // let a = {found: 0, expected: 0};
    // for (const anagram in anagrams) {
    //   a.found += anagrams[anagram];
    //   a.expected += this.totals.anagrams[anagram];
    // }

    return {
      invalid,
      total,

      suffixes,
      anagrams,
      groups,
      easy,
    };
  }

  state() {
    const fn = (a, b) => {
      if (a.length > b.length) return 1;
      if (b.length > a.length) return -1;
      const sa = a.split('').sort().join('');
      const sb = b.split('').sort().join('');
      return sa.localeCompare(sb);
    };

    const self = this;
    const augment = w => {
      const val = self.dict[w];
      return {
        word: w, 
        easy: self.totals.easy.has(w),
        group: self.totals.groups.has(w),
        root: self.totals.suffixes[w],
        defn: val ? val.defn : '',
      };
    };

    return {
      type: this.type,
      played: Array.from(Object.entries(this.played)).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1])).map(e => {
        const w = e[0];
        const v = augment(w);
        if (e[1] < 0) v.invalid = true;
        if (this.overtime.has(w)) v.overtime = true;
        return v;
      }),
      possible: Array.from(this.possible).filter(w => !this.played[w]).sort(fn).map(augment),
      possible2: this.possible, // TODO rename...
      progress: this.progress(),
      totals: this.totals,
    };
  }

  solve() {
    const words = new Set();
    const queue = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let c = this.board[this.size * y + x];
        let ord = c.charCodeAt(0);
        let node = this.trie.children[ord - 65];
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
            if (node2.isWord && s2.length >= this.size - (this.type !== 'd')) words.add(s2);
            queue.push([x2, y2, s2, node2, hist]);
          }
        }
      }
    }
    return words;
  }

  static score(word, size) {
    if (word.length < (size === 5 ? 4 : 3)) return 0;
    if (word.length <= 4) return 1;
    if (word.length == 5) return 2;
    if (word.length == 6) return 3;
    if (word.length == 7) return 5;
    /* if (word.length >= 8) */ return 11;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    Random,
    Trie,
    Game,
  }
}
