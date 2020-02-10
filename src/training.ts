import { Type } from './dict';
import { Stats } from './stats';
import { Store } from './store';
import { Dice } from './settings';

const PERIOD = 3;
const DAY = 24 * 60 * 60 * 1000;

type Comparator<T> = (a: T, b: T) => number;

function defaultCompare<T>(a: T, b: T) {
  return a < b ? -1 : a > b ? 1 : 0;
}

class Queue<T> {
  length: number;
  data: T[];
  compare: Comparator<T>;

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

interface TrainingStats {
  k: string; // key
  e: number; // easiness
  c: number; // correct
  n: number; // encounters
  d: number; // due date
  p: number; // previous
}

export class TrainingPool {
  readonly type: Type;

  private readonly unlearned: string[];
  private readonly learned: Queue<TrainingStats>;
  private readonly store: Store;
  private readonly stats: Stats;

  static async create(stats: Stats, dice: Dice, type: Type, store: Store) {
    const d = dice.toLowerCase()[0] as 'n' | 'o' | 'b';
    // NOTE: learned is shared across dice...
    const learned = new Queue<TrainingStats>([] /* filled in */, (a, b) => a.d - b.d);

    const queued = new Set();
    const stored: TrainingStats[] | undefined = await store.get('data');
    if (stored) {
      learned.data = stored;
      learned.length = stored.length;
      for (const s of stored) queued.add(s.k);
    }

    const raw = [];
    for (const k in stats.mixed) {
      if (!queued.has(k)) raw.push({ k, w: stats.anagrams(k, type)[d] || 0 });
    }
    raw.sort((a, b) => a.w - b.w);
    const unlearned = raw.map(e => e.k);

    return new TrainingPool(unlearned, learned, type, store, stats);
  }

  private constructor(
    unlearned: string[],
    learned: Queue<TrainingStats>,
    type: Type,
    store: Store,
    stats: Stats
  ) {
    this.unlearned = unlearned;
    this.learned = learned;
    this.type = type;
    this.store = store;
    this.stats = stats;
  }

  size() {
    return this.learned.length;
  }

  next() {
    const now = +new Date();
    const backfill = () => {
      if (!this.unlearned.length) return undefined;
      return {
        k: this.unlearned.pop()!,
        e: 2.5,
        c: 0,
        n: 0,
        d: 0,
        p: 0,
      };
    };

    // TODO: consider introducing new words from backfill even if queue has valid word to practice?
    let next: TrainingStats | undefined = this.learned.pop();
    if (next) {
      if (next.d > now) {
        const fill = backfill();
        if (fill) {
          this.learned.push(next);
          next = fill;
        }
      }
    } else {
      next = backfill();
    }
    if (!next) throw new RangeError();

    const update = async (q: number) => {
      this.learned.push(adjust(next!, q, now));
      await this.store.set('data', this.learned.data);
    };

    let key = next.k;
    const group = this.stats.anagrams(key, this.type).words;

    // @ts-ignore FIXME
    const random = new Random(this.size());
    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    // @ts-ignore FIXME
    const o = order;
    return { label: key, group: o(random.shuffle(group)), update };
  }
}

function adjust(v: TrainingStats, q: number, now: number) {
  // Standard update from SM2: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
  let mod = -0.8 + 0.28 * q - 0.02 * q * q;
  // During the initial learning phase (n < 5), only apply a fraction of the modifier if negative
  // https://apps.ankiweb.net/docs/manual.html#what-spaced-repetition-algorithm-does-anki-use
  if (mod < 0) mod *= Math.min(Math.pow(2, v.n + 1) * 2.5, 100) / 100;
  // SM2 uses a minimum easiness of 1.3
  const min = 1.3;

  if (q >= 3) {
    // http://www.blueraja.com/blog/477/a-better-spaced-repetition-learning-algorithm-sm2
    const bonus = v.d ? Math.min(2, (v.d - v.p) / DAY / (v.c ? PERIOD : 1)) : 1;
    v.c++;
    v.e = Math.max(min, v.e + mod * bonus);
    v.d = now + DAY * PERIOD * Math.pow(v.e, v.c - 1) * bonus;
  } else {
    v.c = 0;
    v.e = Math.max(min, v.e + mod);
    v.d = now + DAY;
  }
  v.n++;
  v.p = now;

  return v;
}
