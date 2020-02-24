import { global } from './global';
import { UI, View } from './ui';
import { define } from '../dict';

const VALID = (c: string) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');

export class DefineView implements View {
  private word: string;

  private define!: HTMLElement;
  private search!: HTMLElement;

  private defn: HTMLElement | null = null;
  private stats: HTMLElement | null = null;
  private anagrams: HTMLElement | null = null;

  constructor(json?: { word: string }) {
    this.word = json ? json.word : '';
  }

  toJSON(): { word: string } {
    return { word: this.word };
  }

  async attach(word?: string) {
    await Promise.all([global.LOADED.DICT, global.LOADED.STATS()]);

    if (word) this.word = word;

    this.define = UI.createElementWithId('div', 'define');
    this.search = UI.createElementWithId('div', 'search');
    this.search.classList.add('word');
    this.search.contentEditable = 'true';
    this.search.textContent = this.word;
    this.search.addEventListener('beforeinput', e => this.onBeforeInput(e));
    this.search.addEventListener('input', () => this.query(this.search.textContent || ''));
    this.define.appendChild(this.search);

    this.update();

    return this.define;
  }

  afterAttach() {
    UI.permaFocus(this.search);
  }

  query(w: string) {
    this.search.textContent = w;
    UI.focusContentEditable(this.search);
    this.word = w.toUpperCase();
    this.update();
    UI.persist();
  }

  detach() {
    this.defn = null;
    this.stats = null;
    this.anagrams = null;
    return this.define;
  }

  update() {
    const val = global.DICT[this.word];
    if (val) {
      const defn = UI.createElementWithId('div', 'defineDefn');
      defn.classList.add('definition');
      defn.textContent = define(this.word, global.DICT);
      const hard =
        (val.dict && !val.dict.includes(global.SETTINGS.dict.charAt(0))) ||
        this.word.length < global.SETTINGS.min;
      if (hard) {
        this.define.classList.add('hard');
      } else {
        this.define.classList.remove('hard');
      }

      const addCells = (tr: HTMLTableRowElement, label: string, data: string) => {
        let td = document.createElement('td');
        const b = document.createElement('b');
        b.textContent = label;
        td.appendChild(b);
        tr.appendChild(td);

        td = document.createElement('td');
        td.classList.add('value');
        td.textContent = data;
        tr.appendChild(td);
      };

      const s = global.STATS.stats(this.word, global.SETTINGS.dice, global.SETTINGS.dict);

      const stats = document.createElement('table');
      stats.classList.add('roundedTable');

      let tr = document.createElement('tr');
      addCells(tr, 'Grade', s.grade === ' ' ? 'S' : s.grade);
      addCells(tr, 'Score', s.word ? String(s.word.p) : '-');
      stats.appendChild(tr);

      tr = document.createElement('tr');
      addCells(tr, 'Frequency', s.freq ? String(s.freq) : '-');
      addCells(tr, 'Anagram', s.anagram ? String(s.anagram.p) : '-');
      stats.appendChild(tr);

      stats.appendChild(tr);

      if (this.defn) this.define.removeChild(this.defn);
      this.define.appendChild(defn);
      this.defn = defn;

      if (this.stats) this.define.removeChild(this.stats);
      this.define.appendChild(stats);
      this.stats = stats;
    } else {
      if (this.defn) {
        this.define.removeChild(this.defn);
        this.defn = null;
      }
      if (this.stats) {
        this.define.removeChild(this.stats);
        this.stats = null;
      }
    }

    const anagrams = this.renderAnagrams();
    if (this.anagrams) this.define.removeChild(this.anagrams);
    this.define.appendChild(anagrams);
    this.anagrams = anagrams;
  }

  renderAnagrams() {
    const div = UI.createElementWithId('div', 'defineAnagrams');

    const words = global.STATS.anagrams(this.word, global.SETTINGS.dict).words;
    if (words.length <= 1) return div;

    const solo = [];
    const anadromes = new Set<string>();

    for (const w of words) {
      // prettier-ignore
      const r = w.split('').reverse().join('');
      if (r !== w && words.includes(r)) {
        anadromes.add(`${[w, r].sort().join(' ')}`);
      } else {
        solo.push(w);
      }
    }

    const format = (w: string) => {
      const e = document.createElement(w === this.word ? 'b' : 'span');
      e.textContent = w;
      e.addEventListener('click', () => this.query(w));
      return e;
    };

    for (const pair of anadromes) {
      const [a, b] = pair.split(' ');
      div.appendChild(document.createTextNode(' ('));
      div.appendChild(format(a));
      div.appendChild(document.createTextNode(' '));
      div.appendChild(format(b));
      div.appendChild(document.createTextNode(') '));
    }

    for (const w of solo) {
      div.appendChild(format(w));
      div.appendChild(document.createTextNode(' '));
    }

    return div;
  }

  async onBeforeInput(e: any) {
    if (e.inputType.startsWith('delete') || (e.data && VALID(e.data))) return;
    const enter = ['insertLineBreak', 'insertParagraph'].includes(e.inputType);
    if (enter || (e.data && e.data === ' ')) {
      if (this.word) {
        this.query('');
      } else {
        await UI.toggleView('Define');
      }
    }
    e.preventDefault();
  }

  async onKeyDown(e: KeyboardEvent) {
    if (!this.search) return; // not attached
    UI.focusContentEditable(this.search);
    // tslint:disable-next-line: deprecation
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      e.preventDefault();
      if (this.word) {
        this.query('');
      } else {
        await UI.toggleView('Define');
      }
    } else if (key === 27) {
      await UI.toggleView('Define');
    } else if (![0, 37, 39, 8, 46].includes(key) && !VALID(String.fromCharCode(key))) {
      e.preventDefault();
    }
  }
}
