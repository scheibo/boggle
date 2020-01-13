import { Dictionary } from './dict';
import { Game } from './game';
import { Random } from './random';
import { Settings } from './settings';

class TrainingPool {
  private readonly random: Random;
  private readonly data: {
    less: { [anagram: string]: string[] };
    equal: { [anagram: string]: string[] };
    group: { less: Pool; equal: Pool };
    solo: { less: Pool; equal: Pool };
  };

  constructor(dict: Dictionary, random: Random, settings: Settings) {
    const anagrams: { [anagram: string]: string[] } = {};
    for (const word in dict) {
      if (word.length > 7) continue;
      if (settings.dict === 'TWL' && !dict[word].twl) continue;

      const anagram = word
        .split('')
        .sort()
        .join('');
      anagrams[anagram] = anagrams[anagram] || [];
      anagrams[anagram].push(word);
    }

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
      w.length >= settings.min ? Game.grade(w, dict, settings.dice, settings.dict) : ' ';

    for (const [k, group] of Object.entries(anagrams)) {
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
      const gs = group.filter(w => fn(Game.grade(w, dict, settings.dice, settings.dict)));
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
    const groups = [];
    for (let i = 0; i < 25; i++) {
      const type = this.random.next(0, 100) < 90 ? 'group' : 'solo';
      const level = !this.data.less.length || this.random.next(0, 100) < 80 ? 'equal' : 'less';

      let key = this.data[type][level].choose();
      const group = this.data[level][key];

      // try to find a permutation which isn't in the group
      for (let i = 0; i < 10; i++) {
        key = this.random.shuffle(key.split('')).join('');
        if (!group.includes(key)) break;
      }

      groups.push({ label: key, group: this.random.shuffle(group) });
    }

    return groups;
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
