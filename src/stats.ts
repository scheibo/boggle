import { Dice } from './settings';
import { Dictionary, Type, isValid } from './dict';

interface Data {
  New: DiceEntry;
  Old: DiceEntry;
  Big: DiceEntry;
  freqs: number[];
  total: number;
}

interface DiceEntry {
  NWL: TypeEntry;
  ENABLE: TypeEntry;
  CSW: TypeEntry;
}

interface TypeEntry {
  words: number[];
  anagrams: number[];
  total: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | ' ';

export class Stats {
  private readonly dict: Dictionary;
  private readonly percentiles: Data;
  // NOTE: contains ALL words!
  readonly mixed: { [anagram: string]: string[] };

  constructor(percentiles: Data, dict: Dictionary) {
    this.dict = dict;
    this.percentiles = percentiles;

    this.mixed = {};
    for (const word in dict) {
      const anagram = Stats.toAnagram(word);
      this.mixed[anagram] = this.mixed[anagram] || [];
      this.mixed[anagram].push(word);
    }
  }

  anagrams(word: string, type: Type) {
    const a = Stats.toAnagram(word);
    const group = this.mixed[a];

    const result: { words: string[]; n?: number; o?: number; b?: number } = { words: [] };
    if (!group) return result;

    for (const w of group) {
      if (isValid(w, this.dict, type)) {
        result.words.push(w);
        const v = this.dict[w];
        for (const d of ['n', 'o', 'b'] as Array<'n' | 'o' | 'b'>) {
          if (v[d]) result[d] = (result[d] || 0) + v[d]!;
        }
      }
    }

    return result;
  }

  stats(word: string, dice: Dice = 'New', type: Type = 'NWL') {
    const val = this.dict[word];
    const a = this.anagrams(word, type);
    if (!isValid(word, this.dict, type) || !a.words.length) {
      return { grade: ' ' as Grade };
    }

    const pf = val.freq === undefined ? -1 : this.percentiles.freqs.findIndex(v => v <= val.freq!);
    const f = pf === -1 ? ' ' : gradeFreq(pf);

    const s = (this.percentiles[dice] as DiceEntry)[type];
    const d = dice.charAt(0).toLowerCase() as 'n' | 'o' | 'b';

    const vw = val[d] || 0;
    const pw = s.words.findIndex((v: number) => v <= vw);
    const rw = rank(pw);

    const va = a[d] || 0;
    const pa = s.anagrams.findIndex((v: number) => v <= va);
    const ra = rank(pa);

    const g = [' ', 'A', 'B', 'C', 'D'][Math.ceil((rw + ra) / 2)] as Grade;

    const pct = (v: number) => Math.round(((100 * v) / s.total) * 1000) / 1000;
    const result: {
      grade: Grade;
      freq?: number;
      word?: { p: number; v: number };
      anagram?: { p: number; v: number };
    } = { grade: g < f ? f : g };
    if (pf > -1) result.freq = pf;
    if (pw > -1) result.word = { p: pw, v: pct(val.freq!) };
    if (pa > -1) result.anagram = { p: pa, v: pct(va) };
    return result;
  }

  static history(games: Array<[Set<string>, Set<string>]>, dice: Dice, dict: Dictionary) {
    const d = dice.charAt(0).toLowerCase() as 'n' | 'o' | 'b';
    // prettier-ignore
    const reverse = (w: string) => w.split('').reverse().join('');

    const ratio: { [k: string]: number } = {};
    const anadromes: { [k: string]: number } = {};
    const anagrams: { [k: string]: number } = {};

    const all: { [k: string]: number } = {};
    const found: { [k: string]: number } = {};
    let n = games.length;
    for (const [possible, played] of games) {
      const as: { [k: string]: string[] } = {};
      for (const w of possible) {
        all[w] = (all[w] || 0) + 1;
        const a = Stats.toAnagram(w);
        as[a] = as[a] || [];
        as[a].push(w);

        if (played.has(w)) {
          found[w] = (found[w] || 0) + 1;

          const r = reverse(w);
          if (r !== w && possible.has(r) && !played.has(r)) {
            const k = [w, r].sort()[0];
            anadromes[k] = (anadromes[w] || 0) + (1 / n) * dict[k][d]!;
          }
        } else {
          ratio[w] = (ratio[w] || 0) + (1 / n) * dict[w][d]!;
        }
      }

      for (const a in as) {
        const group = as[a];
        if (group.length <= 1) continue;
        const f = group.filter(w => played.has(w)).length / group.length;
        if (!f) continue;
        const w = group.reduce((acc, w) => acc + dict[w][d]!, 0) / group.length;
        anagrams[a] = (anagrams[a] || 0) + (1 / n) * w * (1 - f);
      }
      n--;
    }

    const K = Math.log(games.length);
    for (const w in all) {
      ratio[w] += K * dict[w][d]! * Math.pow(1 - (found[w] || 0) / all[w], 2);
      if (anadromes[w]) {
        const r = reverse(w);
        const [a, b] = (found[r] || 0) > (found[w] || 0) ? [w, r] : [r, w];
        anadromes[w] += K * dict[w][d]! * 2 * Math.pow(1 - (found[a] || 0) / (all[b] || 1), 2);
      }

      const a = Stats.toAnagram(w);
      if (anagrams[a] && all[w]) {
        anagrams[w] += K * dict[w][d]! * Math.pow(1 - (found[w] || 0) / all[w], 2);
      }
    }

    const sorted = (obj: { [k: string]: number }, limit: number) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    return {
      words: sorted(ratio, 100),
      anadromes: sorted(ratio, 50),
      anagrams: sorted(ratio, 50),
    };
  }

  static toAnagram(word: string) {
    // prettier-ignore
    return word.split('').sort().join('');
  }
}

function gradeFreq(p: number) {
  if (p >= 99) return ' ';
  if (p >= 20) return 'A';
  if (p >= 10) return 'B';
  if (p >= 5) return 'C';
  return 'D';
}

function rank(p: number) {
  if (p >= 75) return 0;
  if (p >= 50) return 1;
  if (p >= 25) return 2;
  if (p >= 10) return 3;
  return 4;
}
