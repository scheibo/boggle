import { Type } from './dict';
import { Random } from './random';
import { Stats } from './stats';
import { Store } from './store';
import { Dice } from './settings';

const EPOCH = 50;

type Comparator<T> = (a: T, b: T) => number;

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

function defaultCompare<T>(a: T, b: T) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function adjust(q: number) {
  q = 5 - q; // invert
  // Standard update from SM2: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
  const sm2 = -0.8 + 0.28 * q - 0.02 * q * q;
  return 1 - sm2;
}

interface TrainingStats {
  k: string; // key
  m: number; // modifer
  e?: number; // epoch
}

export class TrainingPool {
  readonly type: Type;

  private readonly max: number;
  private readonly queue: Queue<TrainingStats>;
  private readonly store: Store;
  private readonly stats: Stats;
  private readonly random: Random;

  private epoch: number;

  static async create(stats: Stats, dice: Dice, type: Type, store: Store, random: Random) {
    let epoch: number | undefined = await store.get('epoch');
    if (epoch === undefined) {
      epoch = 0;
      await store.set('epoch', epoch);
    }

    const max = stats.max(type);
    const clamp = (n: number) => Math.min(max, Math.max(1, n));
    const d = dice.toLowerCase()[0] as 'n' | 'o' | 'b';
    // NOTE: queue is shared across dice...
    const queue = new Queue<TrainingStats>(
      [] /* filled in */,
      (a, b) =>
        clamp(stats.anagrams(b.k, type)[d] || 0) * b.m -
        clamp(stats.anagrams(a.k, type)[d] || 0) * a.m
    );

    const stored: { data: TrainingStats[]; type: Type } | undefined = await store.get('data');
    if (stored) {
      // If the types match then the queue can be used as is, otherwise we need to rebuild to sort it again
      if (stored.type === type) {
        queue.data = stored.data;
        queue.length = stored.data.length;
      } else {
        for (const s of stored.data) {
          queue.push(s);
        }
      }
    } else {
      for (const k in stats.mixed) {
        if (k.length <= 7 && stats.anagrams(k, type).words.length) {
          queue.push({ k, m: 1 });
        }
      }

      await store.set('data', { data: queue.data, type });
    }

    return new TrainingPool(epoch, queue, type, store, stats, random);
  }

  private constructor(
    epoch: number,
    max: number,
    queue: Queue<TrainingStats>,
    type: Type,
    store: Store,
    stats: Stats,
    random: Random
  ) {
    this.epoch = epoch;
    this.max = max;
    this.queue = queue;
    this.type = type;
    this.store = store;
    this.stats = stats;
    this.random = random;
  }

  getEpoch() {
    return this.epoch;
  }

  next() {
    let next: TrainingStats;
    const nexts: TrainingStats[] = [];
    do {
      next = this.queue.pop()!;
      nexts.push(next);
    } while (next.e && this.epoch - next.e < EPOCH);

    const e = ++this.epoch;
    const update = async (q: number) => {
      next.m = next.m * adjust(q);
      next.e = e;
      for (const n of nexts) {
        this.queue.push(n);
      }
      await this.store.set('epoch', e);
      await this.store.set('data', { data: this.queue.data, type: this.type });
    };

    let key = next.k;
    const group = this.stats.anagrams(key, this.type).words;

    // @ts-ignore FIXME
    const random = new this.random.constructor(e);
    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    return { label: key, group: order(random.shuffle(group)), update };
  }
}

function order(words: string[]) {
  const ordered = [];

  const anadromes = new Set();
  for (const w of words) {
    const r = w
      .split('')
      .reverse()
      .join('');
    if (r !== w && words.includes(r)) {
      const key = `${[w, r].sort().join(' ')}`;
      if (!anadromes.has(key)) {
        anadromes.add(key);
        ordered.push(`(${w}`, `${r})`);
      }
    } else {
      ordered.push(w);
    }
  }
  return ordered;
}
