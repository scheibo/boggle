import { Dice } from './settings';
import { Dictionary, Type } from './dict';

interface Data {
  New: DiceEntry;
  Old: DiceEntry;
  Big: DiceEntry;
  freqs: number[];
}

interface DiceEntry {
  NWL: TypeEntry;
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
  // NOTE: contains CSW words!
  readonly anagrams: { [anagram: string]: string[] };

  constructor(percentiles: Data, dict: Dictionary) {
    this.dict = dict;
    this.percentiles = percentiles;

    this.anagrams = {};
    for (const word in dict) {
      const anagram = Stats.toAnagram(word);
      this.anagrams[anagram] = this.anagrams[anagram] || [];
      this.anagrams[anagram].push(word);
    }
  }

  stats(
    word: string,
    dice: Dice = 'New',
    type: Type = 'NWL'
  ): { grade: Grade; freq: number; word: number; anagram: number } {
    const val = this.dict[word];
    const a = this.anagrams[Stats.toAnagram(word)];
    if (!val || !a || (val.csw && type !== 'CSW')) {
      return { grade: ' ' as Grade, freq: -1, word: -1, anagram: -1 };
    }

    const pf = val.freq === undefined ? -1 : this.percentiles.freqs.findIndex(v => v <= val.freq!);
    const f = pf === -1 ? ' ' : gradeFreq(pf);

    const s = (this.percentiles[dice] as DiceEntry)[type];
    const d = dice.charAt(0).toLowerCase() as 'n' | 'o' | 'b';

    const vw = val[d] || 0;
    const pw = s.words.findIndex((v: number) => v <= vw);
    const rw = rank(pw);

    const va = a.reduce((acc, w) => {
      const v = this.dict[w];
      if (v.csw && type !== 'CSW') return acc;
      return acc + (v[d] || 0);
    }, 0);
    const pa = s.anagrams.findIndex((v: number) => v <= va);
    const ra = rank(pa);

    const g = [' ', 'A', 'B', 'C', 'D'][Math.ceil((rw + ra) / 2)] as Grade;
    return { grade: g < f ? f : g, freq: pf, word: pw, anagram: pa };
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
  if (p >= 96) return 'A';
  if (p >= 93) return 'B';
  if (p >= 86) return 'C';
  return 'D';
}

function rank(p: number) {
  if (p >= 75) return 0;
  if (p >= 50) return 1;
  if (p >= 25) return 2;
  if (p >= 10) return 3;
  return 4;
}
