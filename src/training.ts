import { Dictionary } from './dict';
import { Game } from './game';
import { Random } from './random';
import { Settings } from './settings';
import { Stats } from './stats';

class TrainingPool {
  private readonly random: Random;
  private readonly data: {
    less: { [anagram: string]: string[] };
    equal: { [anagram: string]: string[] };
    group: { less: Pool; equal: Pool };
    solo: { less: Pool; equal: Pool };
  };

  constructor(stats: Stats, dict: Dictionary, random: Random, settings: Settings) {
    const s: {
      less: { [anagram: string]: string[] };
      equal: { [anagram: string]: string[] };
      group: { less: string[]; equal: string[] };
      solo: { less: string[]; equal: string[] };
    } = {
      less: {},
      equal: {},
      group: { less: [], equal: [] },
      solo: { less: [], equal: [] },
    };

    const gr = (w: string) =>
      w.length >= settings.min ? stats.stats(w, settings.dice, settings.dict).grade : ' ';

    for (let [k, group] of Object.entries(stats.anagrams)) {
      if (k.length > 7) continue;
      group = group.filter(w => !dict[w].dict || dict[w].dict!.includes(settings.dict.charAt(0)));
      if (!group.length) continue;

      // Determine the lowest grade of the group
      let grade = ' ';
      for (const w of group) {
        const g = gr(w);
        if (g > grade) grade = g;
      }

      // If the grade is too high = move on; otherwise figure out where to sort
      if (grade < settings.grade) continue;
      const type = grade > settings.grade ? 'less' : 'equal';
      s[type][k] = group;

      // Only members of the group that are of the correct grade count
      const fn =
        type === 'equal' ? (g: string) => g === settings.grade : (g: string) => g > settings.grade;
      const gs = group.filter(w => fn(stats.stats(w, settings.dice, settings.dict).grade));
      if (gs.length > 1) {
        for (const g of gs) {
          s.group[type].push(k);
        }
      } else {
        s.solo[type].push(k);
      }
    }

    this.random = random;
    this.data = {
      less: s.less,
      equal: s.equal,
      group: {
        less: new Pool(s.group.less, random),
        equal: new Pool(s.group.equal, random),
      },
      solo: {
        less: new Pool(s.solo.less, random),
        equal: new Pool(s.solo.equal, random),
      },
    };
  }

  next() {
    const type = this.random.next(0, 100) < 90 ? 'group' : 'solo';
    const level = !this.data.less.length || this.random.next(0, 100) < 80 ? 'equal' : 'less';

    let key = this.data[type][level].choose();
    const group = this.data[level][key];

    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = this.random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    return { label: key, group: this.random.shuffle(group) }; // TODO pair anadromes in shuffled!
  }
}

class Pool {
  private readonly possible: string[];
  private readonly random: Random;
  private unused: Set<string>;
  private iter: Iterator<string> | null;

  constructor(possible: string[], random: Random) {
    this.possible = possible;
    this.random = random;

    this.unused = new Set();
    this.iter = null;
  }

  reset() {
    this.unused = new Set(this.random.shuffle(this.possible));
    this.iter = this.unused.values();
  }

  next(num?: number) {
    if (!num) return this.choose();
    const chosen = [];
    for (let i = 0; i < num; i++) {
      chosen.push(this.choose());
    }
    return chosen;
  }

  choose() {
    if (!this.unused.size) this.reset();

    // NOTE: this.unused.size <-> !this.iter.done
    const next = this.iter!.next();
    this.unused.delete(next.value);

    return next.value;
  }
}

/*
type TrainingData = {[anagram: string]: TrainingStats};

interface TrainingStats {
  k: number; //key
  e: number; // easiness
  m: number; // consecutive
  n: number; // total
  i: number; // interval
  h: boolean; // hold
}

class TrainingPool {
  private readonly data: Queue<TrainingStats>;
  private readonly store: Store;
  private readonly random: Random;

  private epoch: number;

  private constructor(epoch: number, data: TrainingData, store: Store, random: Random) {
    this.epoch = epoch;

    this.data = data;
    this.store = store;
    this.random = random;
  }

  static async create(stats: Stats, dict: Dictionary, random: Random, settings: Settings, store: Store) {
    let epoch = await store.get('epoch');
    if (!epoch) {
      epoch = 1;
      await storage.put('epoch', epoch);
    }
    let data = await store.get('data');
    if (!data) {
      data = {}; // TODO
      await storage.put('data', data);
    }

    return new TrainingPool(epoch, data, store);
  }

  async next() {
    const next = this.data.pop()!;

    // TODO await

    const group = Stats.anagrams[Stats.toAnagram(next.k)];

    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = this.random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    return { label: key, group: this.random.shuffle(group), update }; // TODO pair anadromes in shuffled!
  }
} */

type Comparator<T> = (a: T, b: T) => number;

class Queue<T> {
  length: number;

  private data: T[];
  private compare: Comparator<T>;

  constructor(data: T[] = [], compare: Comparator<T> = defaultCompare) {
    this.data = data;
    this.length = this.data.length;
    this.compare = compare;

    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this.down(i);
    }
  }

  push(item: T) {
    this.data.push(item);
    this.length++;
    this.up(this.length - 1);
  }

  pop(): T | undefined {
    if (this.length === 0) return undefined;

    const top = this.data[0]!;
    const bottom = this.data.pop()!;
    this.length--;

    if (this.length > 0) {
      this.data[0] = bottom;
      this.down(0);
    }

    return top;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  private up(pos: number) {
    const item = this.data[pos];

    while (pos > 0) {
      const parent = (pos - 1) >> 1;
      const current = this.data[parent];
      if (this.compare(item, current) >= 0) break;
      this.data[pos] = current;
      pos = parent;
    }

    this.data[pos] = item;
  }

  private down(pos: number) {
    const half = this.length >> 1;
    const item = this.data[pos];

    while (pos < half) {
      let left = (pos << 1) + 1;
      let best = this.data[left];
      const right = left + 1;

      if (right < this.length && this.compare(this.data[right], best) < 0) {
        left = right;
        best = this.data[right];
      }
      if (this.compare(best, item) >= 0) break;

      this.data[pos] = best;
      pos = left;
    }

    this.data[pos] = item;
  }
}

function defaultCompare<T>(a: T, b: T) {
  return a < b ? -1 : a > b ? 1 : 0;
}
