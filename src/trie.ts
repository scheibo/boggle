import { Dictionary, Type } from './dict';

export class Trie {
  parent: Trie | null;
  children: Trie[];
  isWord: Type | false;

  private constructor(parent: Trie | null, value: string) {
    this.parent = parent;
    this.children = new Array(26);
    this.isWord = false;
    if (parent !== null) parent.children[value.charCodeAt(0) - 65] = this;
  }

  static create(dict: Dictionary) {
    const root = new Trie(null, '');
    for (const word in dict) {
      let current = root;
      for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const ord = letter.charCodeAt(0);
        let next = current.children[ord - 65];
        if (next === undefined) next = new Trie(current, letter);
        current = next;
      }
      current.isWord = dict[word].csw ? 'CSW' : 'NWL';
    }
    return root;
  }
}
