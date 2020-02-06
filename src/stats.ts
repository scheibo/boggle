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

  static toAnagram(word: string) {
    return word
      .split('')
      .sort()
      .join('');
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
