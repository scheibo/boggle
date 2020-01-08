'use strict';

class Random {
  constructor(n = 4 /* https://xkcd.com/221/ */) {
    // Hash: https://burtleburtle.net/bob/hash/integer.html
    // n = n ^ 61 ^ (n >>> 16);
    // n = n + (n << 3);
    // n = n ^ (n >>> 4);
    // n = Math.imul(n, 0x27d4eb2d);
    // n = n ^ (n >>> 15);
    this.seed = n /*>>> 0 */;
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
  constructor(dict) {
    const root = new Node(undefined, '');
    for (const word in dict) {
      let current = root;
      for (var i = 0; i < word.length; i++) {
          const letter = word[i];
          const ord = letter.charCodeAt(0);
          let next = current.children[ord - 65];
          if (next === undefined) next = new Node(current, letter);
          current = next;
      }
      current.isWord = dict[word].twl ? 'TWL' : 'CSW';
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

function subs(word, min) {
  const words = new Set();

  for (let b = 0; b < word.length; b++) {
    for (let e = 1; e <= word.length - b; e++) {
      const s = word.substr(b, e);
      if (s.length >= min) words.add(s);
    }
  }

  return words;
}

function toAnagram(word) {
  return word.split('').sort().join('');
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
  constructor(trie, dict, random, settings = {dice: 'New', dict: 'TWL'}) {
    this.trie = trie;
    this.dict = dict;
    this.settings = settings;

    this.dice = this.settings.dice === 'Big' ? BIG_DICE :
      this.settings.dice === 'Old' ? OLD_DICE : NEW_DICE;
    this.size = Math.sqrt(this.dice.length);
    this.settings.min = this.settings.min || this.size - 1;

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
    } while (!Object.keys(this.possible).length);

    this.id = Game.encodeID(this.settings, this.seed);
    this.played = {};
    this.overtime = new Set();
    this.score = {regular: 0, overtime: 0};

    this.start = +new Date();
    this.expired = null; // set to timestamp!
  }

  play(word) {
    if (!this.played[word] && word.length >= this.settings.min) {
      if (this.possible[word]) {
        this.played[word] = +new Date();
        const score = Game.score(word);
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
      goal: {
        S: this.totals.s,
        A: this.totals.a,
        B: this.totals.b,
        C: this.totals.c,
        D: this.totals.d
      }
    }
  }

  static encodeID(s, seed) {
    return `${s.dict.charAt(0)}${s.min}${s.dice.charAt(0)}${seed}`;
  }

  static decodeID(id) {
    if (id.charAt(0) !== 'T' && id.charAt(0) !== 'C') {
      // Legacy
      const dice = id.charAt(0) === 'B' ? 'Big' : id.charAt(2) === 'O' ? 'Old' : 'New';

      const seed = Number(id.slice(1));

      return [{dice, dict: 'TWL'}, seed];
    } else {
      const dict = id.charAt(0) === 'T' ? 'TWL' : 'CSW';
      const min = Number(id.charAt(1));
      const dice = id.charAt(2) === 'B' ? 'Big' : id.charAt(2) === 'O' ? 'Old' : 'New';

      const seed = Number(id.slice(3));

      return [{dict, min, dice}, seed];
    }
  }

  static fromJSON(json, trie, dict) {
    const [settings, seed] = Game.decodeID(json.seed);
    const random = new Random(seed);
    const game = new Game(trie, dict, random, settings);

    game.start = json.start;
    game.expired = json.expired;
    game.played = json.words;

    return game;
  }

  static grade(word, dict, dice = 'New', type = 'TWL') {
    const val = dict[word];
    if (!val) return ' ';
    // val.csw gets dropped if its the same as val.twl or empty
    const encoded = type === 'CSW' ? (val.csw || val.twl || ' ') : val.twl;
    // duplicate grades get encoded as as a single value
    if (!encoded || encoded.length === 1) return encoded || ' ';
    const d = dice.charAt(0).toLowerCase();
    const i = d === 'n' ? 0 : d === 'o' ? 1 : 2;
    return encoded.charAt(i);
  }

  get totals() {
    if (this.totals_) return this.totals_;

    const anagrams = {};
    const grades = {};
    for (const word in this.possible) {
      const anagram = toAnagram(word);
      anagrams[anagram] = anagrams[anagram] || []
      anagrams[anagram].push(word);

      const g = Game.grade(word, this.dict, this.settings.dice, this.settings.dict);
      grades[g] = (grades[g] || 0) + Game.score(word);
    }

    const d = grades.D || 0;
    const c = d + (grades.C || 0);
    const b = c + (grades.B || 0);
    const a = b + (grades.A || 0);
    const s = a + (grades[' '] || 0);

    return this.totals_ = { s, a, b, c, d, anagrams };
  }

  progress() {
    let total = 0;
    let invalid = 0;
    let valid = 0;
    let suffixes = [];
    let subwords = [];

    const anagrams = {};
    for (const word in this.played) {
      total++;
      if (this.played[word] < 0) {
        invalid++;
        continue;
      }
      valid++;

      for (const suffix of SUFFIXES) {
        const suffixed = `${word}${suffix}`;
        if (this.possible[suffixed] && !this.played[suffixed]) suffixes.push(suffixed);
      }

      const anagram = toAnagram(word);
      anagrams[anagram] = anagrams[anagram] || [];
      anagrams[anagram].push(word);

      for (const sub of subs(word, this.settings.min)) {
        if (this.possible[sub] && !this.played[sub]) subwords.push(sub);
      }
    }

    let missing = [];
    for (const anagram in anagrams) {
      missing = missing.concat(this.totals.anagrams[anagram].filter(w => !anagrams[anagram].includes(w)));
    }

    return {
      invalid, valid, total,
      suffixes: suffixes.length,
      subwords: subwords.length,
      anagrams: missing.length,
      missing: new Set([...suffixes, ...subwords, ...missing])
    };
  }

  state() {
    const progress = this.progress();
    const gr = w => Game.grade(w, this.dict, this.settings.dice, this.settings.dict);
    // missing, grade, length, anagrams, alphabetical
    const fn = (a, b) => {
      const ma = progress.missing.has(a);
      const mb = progress.missing.has(b);
      if (ma && !mb) return -1;
      if (mb && !ma) return 1;

      const ga = gr(a);
      const gb = gr(b);
      if (ga > gb) return -1;
      if (gb > ga) return 1;

      if (a.length > b.length) return 1;
      if (b.length > a.length) return -1;

      return toAnagram(a).localeCompare(toAnagram(b));
    };

    const self = this;
    const augment = w => {
      const val = self.dict[w];
      return {
        word: w, 
        grade: gr(w),
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
      remaining: Object.keys(this.possible).filter(w => !this.played[w]).sort(fn).map(w => {
        const v = augment(w);
        if (progress.missing.has(w)) v.missing = true;
        return v;
      }),
      progress,
      totals: this.totals,
    };
  }

  solve() {
    const words = {};
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
            const isWord = this.settings.dict === 'TWL' ? node2.isWord === 'TWL' : node2.isWord;
            if (isWord && s2.length >= this.settings.min) words[s2] = hist;
            queue.push([x2, y2, s2, node2, hist]);
          }
        }
      }
    }
    return words;
  }

  static score(word) {
    if (word.length < 3) return 0;
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
