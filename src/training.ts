import { Dictionary } from './dict';
import { Game } from './game';
import { Random } from './random';
import { Settings } from './settings';
import { Stats } from './stats';
import { Storage } from './store';

interface TrainingStats {
  e: number; // easiness
  n: number; // consecutive
  i: number; // interval
  h: boolean; // hold
}

class TrainingPool {
  private readonly random: Random;
  private readonly data: {
    less: { [anagram: string]: string[] };
    equal: { [anagram: string]: string[] };
    group: { less: Pool; equal: Pool };
    solo: { less: Pool; equal: Pool };
  };

  constructor(
    stats: Stats,
    dict: Dictionary,
    random: Random,
    settings: Settings,
    storage: Storage<TrainingStats>
  ) {
    const s: {
      less: { [anagram: string]: string[] };
      equal: { [anagram: string]: string[] };
      group: { less: PoolValue[]; equal: PoolValue[] };
      solo: { less: PoolValue[]; equal: PoolValue[] };
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

      const fn =
        type === 'equal' ? (g: string) => g === settings.grade : (g: string) => g > settings.grade;
      const gs = group.filter(w => fn(stats.stats(w, settings.dice, settings.dict).grade));

      const stored = storage.get(k);
      const val = stored
        ? { k, e: stored.e, n: stored.n, i: stored.i, h: stored.h }
        : { k, e: 2.5, n: 0, i: 0, h: false };

      if (gs.length > 1) {
        for (const g of gs) {
          s.group[type].push(val);
        }
      } else {
        s.solo[type].push(val);
      }
    }

    this.random = random;
    this.data = {
      less: s.less,
      equal: s.equal,
      group: {
        less: new Pool(random.shuffle(s.group.less), storage),
        equal: new Pool(random.shuffle(s.group.equal), storage),
      },
      solo: {
        less: new Pool(random.shuffle(s.solo.less), storage),
        equal: new Pool(random.shuffle(s.solo.equal), storage),
      },
    };
  }

  async next() {
    const groups = [];
    const type = this.random.next(0, 100) < 90 ? 'group' : 'solo';
    const level = !this.data.less.length || this.random.next(0, 100) < 80 ? 'equal' : 'less';

    let [key, update] = await this.data[type][level].next();
    const group = this.data[level][key];

    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = this.random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    return { label: key, group: this.random.shuffle(group), update };
  }
}

interface PoolValue extends TrainingStats {
  k: string; // key
}

class Pool {
  private readonly possible: PoolValue[];
  private readonly storage: Storage<TrainingStats>;
  private readonly n: number;

  private active: Queue<PoolValue>;
  private hold: PoolValue[];

  constructor(possible: PoolValue[], storage: Storage<TrainingStats>, n = 100) {
    this.possible = possible;
    this.storage = storage;
    this.n = n;

    this.active = new Queue<PoolValue>([], (a, b) => a.i - b.i);
    this.hold = [];

    for (const v of possible) {
      if (v.h) {
        this.hold.push(v);
      } else {
        this.active.push(v);
      }
    }
  }

  async reset() {
    const ps = [];
    for (const v of this.hold) {
      v.h = false;
      ps.push(this.storage.set(v.k, v));
      this.active.push(v);
    }
    this.hold = [];
    await Promise.all(ps);
  }

  async next(): Promise<[string, (q: number) => Promise<void>]> {
    if (!this.active.length || this.hold.length >= this.n) await this.reset();
    const next = this.active.pop()!;
    next.h = true;
    this.hold.push(next);
    return [next.k, (q: number) => this.update(next, q)];
  }

  private update(v: PoolValue, q: number) {
    // Standard update from SM2: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
    let mod = -0.8 + 0.28 * q - 0.02 * q * q;
    // During the initial learning phase (n < 6), only apply a fraction of the modifier if negative
    if (mod < 0) mod *= Math.max(Math.pow(2, v.n) * 2.5, 100);
    // SM2 uses a minimum of 1.3
    v.e = Math.max(1.3, v.e - mod);

    if (q < 3) {
      v.n = 0;
      v.i = 1;
    } else {
      v.n++;
      v.i = 6 * Math.pow(v.e, v.n - 1);
    }

    return this.storage.set(v.k, v);
  }
}

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
