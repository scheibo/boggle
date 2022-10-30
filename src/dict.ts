export interface Dictionary {
  [word: string]: Entry;
}

export interface Entry {
  defn: string;

  freq?: number;
  dict?: string;

  n?: number;
  o?: number;
  b?: number;
}

export type Type = 'NWL' | 'ENABLE' | 'CSW';

// TODO: linkify? recurse?
export function define(word: string, dict: Dictionary) {
  const val = dict[word];
  if (!val) return '';
  const re = /[{<](.*?)?=.*?[>}]/g;
  let def = dict[word].defn;
  if (!def) return '';
  const match = re.exec(def);
  if (match) {
    const m = dict[match[1].toUpperCase()];
    if (!m || !m.defn) {
      def = match[1];
    } else {
      def = `${match[1]} (${m.defn})`;
    }
  }
  return def
    .replace(/\{(.*?)=.*?\}/g, '$1')
    .replace(/<(.*?)=.*?>/g, '$1')
    .replace(/\s*?\[.*?\]\s*?/g, '');
}

export function isValid(word: string, dict: Dictionary, type: Type) {
  const val = dict[word];
  return val && (!val.dict || val.dict.includes(type.charAt(0)));
}

export function order(words: string[]) {
  const ordered = [];

  const anadromes = new Set();
  for (const w of words) {
    const r = w.split('').reverse().join('');
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
