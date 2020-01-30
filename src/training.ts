import { Dictionary, Type } from './dict';
import { Random } from './random';
import { Stats } from './stats';
import { Store } from './store';

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
  const sm2 = -0.8 + 0.28 * q - 0.02 * q * q;
  return 1 - sm2;
}

interface TrainingStats {
  k: string; // key
  w: number; // weight
  e?: number; // epoch
}

export class TrainingPool {
  readonly type: Type;

  private readonly max: number;
  private readonly queue: Queue<TrainingStats>;
  private readonly store: Store;
  private readonly dict: Dictionary;
  private readonly stats: Stats;
  private readonly random: Random;

  private epoch: number;

  static async create(stats: Stats, dict: Dictionary, type: Type, store: Store, random: Random) {
    let epoch: number | undefined = await store.get('epoch');
    if (epoch === undefined) {
      epoch = 0;
      await store.set('epoch', epoch);
    }

    const queue = new Queue<TrainingStats>([] /* filled in */, (a, b) => b.w - a.w);

    const data: TrainingStats[] | undefined = await store.get('data');
    if (data) {
      queue.data = data;
      queue.length = data.length;
    } else {
      const t = type.toLowerCase()[0] as 'n' | 'o' | 'b';
      for (const k in stats.anagrams) {
        if (k.length > 7) continue;
        const anagrams = stats.anagrams[k];
        const w = anagrams.reduce((acc, w) => acc + (dict[w][t] || 0), 0);
        if (!w) continue;
        queue.push({ k, w });
      }

      await store.set('data', queue.data);
    }

    const max = stats.max(type);
    return new TrainingPool(epoch, max, queue, type, store, dict, stats, random);
  }

  private constructor(
    epoch: number,
    max: number,
    queue: Queue<TrainingStats>,
    type: Type,
    store: Store,
    dict: Dictionary,
    stats: Stats,
    random: Random
  ) {
    this.epoch = epoch;
    this.max = max;
    this.queue = queue;
    this.type = type;
    this.store = store;
    this.dict = dict;
    this.stats = stats;
    this.random = random;
  }

  clamp(n: number) {
    return Math.min(this.max, Math.max(1, n));
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
      next.w = this.clamp(next.w * adjust(q));
      next.e = e;
      for (const n of nexts) {
        this.queue.push(n);
      }
      await this.store.set('epoch', e);
      await this.store.set('data', this.queue.data);
    };

    let key = next.k;
    const t = this.type.charAt(0);
    const group = this.stats.anagrams[key].filter(
      w => !this.dict[w].dict || this.dict[w].dict!.includes(t)
    );

    // @ts-ignore FIXME
    const random = new this.random.constructor(e);
    // try to find a permutation which isn't in the group
    for (let i = 0; i < 10; i++) {
      key = random.shuffle(key.split('')).join('');
      if (!group.includes(key)) break;
    }

    return { label: key, group: random.shuffle(group), update }; // TODO pair anadromes in shuffled!
  }
}
