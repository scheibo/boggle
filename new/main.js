'use strict';

var DICT, STATS;
const LOADED = (async () => {
  const dict = await fetch('data/dict.json', {mode: 'no-cors'});
  const stats = await fetch('data/stats.json', {mode: 'no-cors'});
  DICT = await dict.json();
  STATS = new Stats(await stats.json(), DICT);
})();
// await LOADED before STATS/DICT can be accessed!

const UI = new class({
  constructor() {
    this.root = document.getElementById('content');

    this.MenuView = new MenuView();
    this.BoardView = new BoardView();
    this.ScoreView = new ScoreView();
    this.TrainingView = new TrainingView();
    this.DefineView = new DefineView();
    this.SettingsView = new SettingsView();

    this.current = this.MenuView;
    this.previous = this.MenuView;
  }

  create() {
    setTimeout(() => window.scrollTo(0, 1), 0);

    // navigate to page with #SEED = go to menu, initial seed set to SEED
    // change #SEED (hashchange) = reset seed to SEED, switch to play view, refresh to seed
    // change settings/hashchange in seeds = reflect update once leave settings view

    document.addEventListener('keydown', e => this.onKeydown(e));
    document.addEventListener('swiped-left', e => this.toggleView(this.DefineView));
    document.addEventListener('swiped-right', e => this.toggleView(this.DefineView));
  }

  createView(view) {
    this.root.appendChild(view.create());
  }

  destroyView(view) {
    this.root.removeChild(view.destroy());
  }

  toggleView(view) {
    if (this.current === view) {
      this.destroyView(view);
      this.current = this.previous;
      this.previous = view;
      this.createView(this.current);
    } else {
      this.destroyView(this.current);
      this.current = view;
      this.previous = this.current;
      this.createView(view);
    }
  }

  onKeydown(e) {
    const key = e.keyCode;
    if (key === 191 && e.shiftKey) {
      e.preventDefault(); 
      this.toggleView(this.DefineView);
    } else if ('onKeydown' in this.current) {
      this.current.onKeyDown(e);
    }
  }
})();

class TopBarElement {

}

class LoadingSpinnerElement {
  create() {
    this.loader = createElementWithId('div', 'loader');
    this.spinner = createElementWithId('div', 'spinner');
    this.loader.appendChild(this.spinner);
    return this.loader;
  }
}

class MenuView {}


class BoardView {}
class TrainingView {}



class DefineView {
  constructor() {
    this.word = '';
  }

  create() {
    this.define = createElementWithId('div', 'define');
    this.search = createElementWithId('div', 'search');
    this.search.contentEditable = true;
    this.search.textContent = this.word;
    this.define.appendChild(this.search);

    this.define.addEventListener('input', e => {
      this.word = this.search.textContent.toUpperCase();
      this.update();
    });
    this.update();
    permaFocus(this.search);

    return this.define;
  }

  destroy() {
    return this.define;
  }

  update() {
    const val = DICT[this.word];
    if (val) {
      if (this.defn) this.define.removeChild(this.defn);
      this.defn = createElementWithId('div', 'defineDefn');

      this.defn.textContent = define(this.word, DICT);
      if ((val.dict && !val.dict.includes(SETTINGS.dict.charAt(0))) || this.word.length < SETTINGS.min) {
        this.defn.classList.add('hard');
      } else {
        this.defn.classList.remove('hard');
      }

      if (this.stats) this.define.removeChild(this.stats);
      this.stats = createElementWithId('table', 'defineStats');

      const createRow = (label, data) => {
        td.textContent = label;
        tr.appendChild(td);
        td = document.createElement('td');
        td.textContent = data;
        tr.appendChild(td);
        return tr;
      };

      const s = STATS.stats(this.word, SETTINGS.dice, SETTINGS.type);

      let tr = document.createElement('tr');
      let td = document.createElement('td');
      let b = document.createElement('b');
      b.textContent = 'Grade';
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.classList.add('value');
      td.textContent = s.grade === ' ' ? 'S' : s.grade;
      tr.appendChild(td);

      td = document.createElement('td');
      b = document.createElement('b');
      b.textContent = 'Score';
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.classList.add('value');
      td.textContent = s.word ? s.word.p : '-';
      tr.appendChild(td);

      stats.appendChild(tr);

      tr = document.createElement('tr');
      td = document.createElement('td');
      b = document.createElement('b');
      b.textContent = 'Frequency';
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.classList.add('value');
      td.textContent = s.freq ? s.freq : '-';
      tr.appendChild(td);

      td = document.createElement('td');
      b = document.createElement('b');
      b.textContent = 'Anagram';
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.classList.add('value');
      td.textContent = s.anagram ? s.anagram.p : '-';
      tr.appendChild(td);

      this.stats.appendChild(tr);

      this.define.appendChild(this.defn);
      this.define.appendChild(this.stats);
    } else {
      this.define.removeChild(this.defn);
      this.define.removeChild(this.stats);
    }

    if (this.anagrams) this.define.removeChild(this.anagrams);
    this.anagrams = createElementWithId('table', 'anagrams');

    const a = Stats.toAnagram(this.word);
    const words = a &&
      STATS.anagrams[a] &&
      STATS.anagrams[a].filter(w =>
        !DICT[w].dict || DICT[w].dict.includes(SETTINGS.dict.charAt(0)));
    if (words && words.length > 1) {

      const solo = [];
      const anadromes = new Set();

      for (const w of words) {
        const r = w.split('').reverse().join('');
        if (r !== w && words.includes(r)) {
          anadromes.add(`${[w, r].sort().join(' ')}`);
        } else {
          solo.push(w);
        }
      }

      const format = w => {
        const e = document.createElement(w === this.word ? 'b' : 'span');
        e.textContent = w;
        return e;
      };

      for (const pair of anadromes) {
        const [a, b] = pair.split(' ');
        this.anagrams.appendChild(document.createTextNode(' ('));
        this.anagrams.appendChild(format(a));
        this.anagrams.appendChild(document.createTextNode(' '));
        this.anagrams.appendChild(format(b));
        this.anagrams.appendChild(document.createTextNode(') '));
      }
      for (const w of solo) {
        this.anagrams.appendChild(format(w));
        this.anagrams.appendChild(document.createTextNode(' '));
      }

      this.define.appendChild(this.anagrams);
    }
  }

  onKeydown(e) {
    focusContentEditable(this.search);
    const key = e.keyCode;
    if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  }
}

function createElementWithId(type, id) {
  const element = document.createElement(type);
  element.setAttribute('id', id);
  return element;
}

function focusContentEditable(element) {
  element.focus();
  document.execCommand('selectAll', false, null);
  const sel = document.getSelection();
  if (sel && !sel.isCollapsed) sel.collapseToEnd();
}

function permaFocus(e) {
  e.addEventListener('blur', () => setTimeout(() => focusContentEditable(e), 20));
  focusContentEditable(e);
}
