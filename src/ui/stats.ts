class DefineView extends View {
  constructor(json) {
    super();
    this.word = json ? json.word : '';
  }

  toJSON() {
    return {word: this.word};
  }

  async attach(word) {
    await Promise.all([LOADED.DICT, LOADED.STATS()]);

    if (word) this.word = word;

    this.define = createElementWithId('div', 'define');
    this.search = createElementWithId('div', 'search');
    this.search.classList.add('word');
    this.search.contentEditable = true;
    this.search.textContent = this.word;
    this.define.appendChild(this.search);

    this.define.addEventListener('input', () => this.query(this.search.textContent));
    this.update();

    return this.define;
  }

  afterAttach() {
    permaFocus(this.search);
  }

  query(w) {
    this.search.textContent = w;
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
    const val = DICT[this.word];
    if (val) {
      const defn = createElementWithId('div', 'defineDefn');
      defn.classList.add('definition');
      defn.textContent = define(this.word, DICT);
      if ((val.dict && !val.dict.includes(SETTINGS.dict.charAt(0))) || this.word.length < SETTINGS.min) {
        this.define.classList.add('hard');
      } else {
        this.define.classList.remove('hard');
      }

      const addCells = (tr, label, data) => {
        let td = document.createElement('td');
        let b = document.createElement('b');
        b.textContent = label;
        td.appendChild(b);
        tr.appendChild(td);

        td = document.createElement('td');
        td.classList.add('value');
        td.textContent = data;
        tr.appendChild(td);
      };

      const s = STATS.stats(this.word, SETTINGS.dice, SETTINGS.type);

      const stats = document.createElement('table');
      stats.classList.add('roundedTable');

      let tr = document.createElement('tr');
      addCells(tr, 'Grade', s.grade === ' ' ? 'S' : s.grade);
      addCells(tr, 'Score', s.word ? s.word.p : '-');
      stats.appendChild(tr);

      tr = document.createElement('tr');
      addCells(tr, 'Frequency', s.freq ? s.freq : '-');
      addCells(tr, 'Anagram',  s.anagram ? s.anagram.p : '-');
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
    const div = createElementWithId('div', 'defineAnagrams');
    while (div.firstChild) div.removeChild(stats.firstChild);

    const words = STATS.anagrams(this.word, SETTINGS.dict).words;
    if (words.length <= 1) return div;

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

  async onKeyDown(e) {
    focusContentEditable(this.search);
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      if (this.word) {
        this.query('');
      } else {
        await UI.toggleView('Define');
      }
    } else if (key === 27) {
      await UI.toggleView('Define');
    } else if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  }
}