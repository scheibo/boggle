export interface Dictionary {
  [word: string]: Entry;
}

export interface Entry {
  defn: string;
  twl?: string;
  csw?: string;
}

export type Type = 'TWL' | 'CSW';

export type Grade = 'A' | 'B' | 'C' | 'D' | ' ';
