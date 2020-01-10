import { Dictionary } from './dict';

export const Trie = new (class {
  create(dict: Dictionary) {
    const root = new Node(null, '');
    for (const word in dict) {
      let current = root;
      for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const ord = letter.charCodeAt(0);
        let next = current.children[ord - 65];
        if (next === undefined) next = new Node(current, letter);
        current = next;
      }
      current.isWord = dict[word].twl ? 'TWL' : 'CSW';
    }
    return root;
  }
})();

class Node {
  parent: Node | null;
  children: Node[];
  isWord: 'TWL' | 'CSW' | false;

  constructor(parent: Node | null, value: string) {
    this.parent = parent;
    this.children = new Array(26);
    this.isWord = false;
    if (parent !== null) parent.children[value.charCodeAt(0) - 65] = this;
  }
}
