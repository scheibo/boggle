'use strict';

class Trie {
  constructor(dict) {
    const root = new Node(undefined, '');
    for (const word in dict) {
      let current = root;
      for (var i = 0; i < word.length; i++) {
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
}

class Node {
  constructor(parent, value) {
    this.parent = parent;
    this.children = new Array(26);
    this.isWord = false;
    if (parent !== undefined) parent.children[value.charCodeAt(0) - 65] = this;
  }
}
