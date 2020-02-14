'use strict';

const DEFAULTS = {dice: 'New', dict: 'NWL', grade: 'C', display: 'Show'};
const SETTINGS = JSON.parse(localStorage.getItem('settings')) || DEFAULTS;
const STORE = new Store('db', 'store');
const PLAYED = new Set();

const fetchJSON = url => fetch(url, {mode: 'no-cors'}).then(j => j.json());
var DICT, STATS, HISTORY, TRIE, GAMES;

const loaded = {
  DICT: fetchJSON('../data/dict.json').then(d => { DICT = d; }), // TODO ../
  HISTORY: STORE.get('history').then(h => HISTORY = h || []),
};
const LOADED = {
  DICT: loaded.DICT,
  TRIE: (async () => {
    await loaded.DICT;
    TRIE = Trie.create(DICT);
  })(),
  STATS: (async () => {
    let stats;
    fetchJSON('../data/stats.json').then(s => { stats = s; }); // TODO ../
    await loaded.DICT;
    STATS = new Stats(stats, DICT);
  })(),
  HISTORY: loaded.HISTORY,
  PLAYED: (async () => {
    await loaded.HISTORY;
    for (const h of HISTORY) PLAYED.add(h.seed);
  })(),
  TRAINING: Store.setup('training', ['NWL', 'ENABLE', 'CSW']),
};

class View {
  toJSON() {}
}

class LoadingView extends View {
  attach() {
    this.loader = createElementWithId('div', 'loader');
    this.spinner = createElementWithId('div', 'spinner');
    this.loader.appendChild(this.spinner);
    return this.loader;
  }
  detach() {
    return this.loader;
  }
}

class MenuView extends View {
  attach() {
    this.menu = createElementWithId('div', 'menu');
    const h1 = document.createElement('h1');
    h1.textContent = 'BOGGLE';
    this.menu.appendChild(h1);
    const nav = document.createElement('nav');

    const createButton = (name, fn) => {
      const button = document.createElement('button');
      button.classList.add('toggle');
      button.textContent = name;
      button.addEventListener('click', fn);
      return button;
    }

    nav.appendChild(createButton('PLAY', () => {}));
    nav.appendChild(createButton('TRAIN', () => {}));
    nav.appendChild(createButton('DEFINE', () => UI.toggleView('Define')));
    nav.appendChild(createButton('STATS', () => UI.toggleView('Stats')));
    nav.appendChild(createButton('SETTINGS', () => {}));

    this.menu.appendChild(nav);
    return this.menu;
  }

  detach() {
    return this.menu;
  }
}

class DefineView extends View {
  constructor() {
    super();
    this.word = '';
  }

  toJSON() {
    return {word: this.word};
  }

  fromJSON(json) {
    this.word = json.word;
  }

  async attach(data) {
    await Promise.all([LOADED.DICT, LOADED.STATS]);

    if (data) this.word = data;

    this.define = createElementWithId('div', 'define');
    this.search = createElementWithId('div', 'search');
    this.search.contentEditable = true;
    this.search.textContent = this.word;
    this.define.appendChild(this.search);

    this.define.addEventListener('input', () => this.query(this.search.textContent));
    this.update();

    return this.define;
  }

  onAttach() {
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

    const anagrams = displayAnagrams(this.word, w => this.query(w));
    if (this.anagrams) this.define.removeChild(this.anagrams);
    this.define.appendChild(anagrams);
    this.anagrams = anagrams;
  }

  async onKeydown(e) {
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

class StatsView extends View {
  constructor() {
    super();
    this.section = 'WORD';
  }

  toJSON() {
    return {section: this.section};
  }

  fromJSON(json) {
    this.section = json.section;
  }

  async attach() {
    await Promise.all([, LOADED.HISTORY, LOADED.TRIE, LOADED.DICT, LOADED.STATS]);
    if (!GAMES) {
      GAMES = [];
      for (let i = HISTORY.length - 1; i >= 0 && GAMES.length < 500; i--) {
        const game = Game.fromJSON(HISTORY[i], TRIE, DICT, STATS);
        const played = new Set();
        for (const w in game.played) {
          if (game.played[w] > 0) played.add(w);
        }
        GAMES.push([game.possible, played]);
      }
    }
    const data = STATS.history(GAMES, SETTINGS.dice, SETTINGS.dict);

    this.stats = createElementWithId('div', 'stats');
    const control = document.createElement('div');
    control.classList.add('row');
    const display = w => this.display(w, data);
    control.appendChild(createRadios('statsSelect', ['WORD', 'ANAGRAM', 'PAIR'].map(s => s === this.section ? [s] : s), function() {
      display(this.value);
      UI.persist();
    }))
    this.stats.append(control);
    this.display(this.section, data);

    return this.stats;
  }

  detach() {
    this.table = null;
    return this.stats;
  }

  display(section, data) {
    this.section = section;
    const {words, anadromes, anagrams} = data;

    const link = w => {
      const b = document.createElement('b');
      b.textContent = w;
      b.addEventListener('click', () => UI.toggleView('Define', w));
      return b;
    };

    const table = document.createElement('table');
    table.classList.add('roundedTable');
    if (section === 'PAIR') {
      for (const {n, fn, d, fd} of anadromes) {
        const tr = document.createElement('tr');

        let td = document.createElement('td');
        td.appendChild(link(n));
        tr.appendChild(td);

        td = document.createElement('td');
        td.textContent = `${fn}/${fd}`;
        tr.appendChild(td);

        td = document.createElement('td');
        td.appendChild(link(d));
        tr.appendChild(td);

        table.appendChild(tr);
      }
    } else if (section === 'WORD') {
      for (const {w, found, all} of words) {
        const tr = document.createElement('tr');

        let td = document.createElement('td');
        td.appendChild(link(w));
        tr.appendChild(td);

        td = document.createElement('td');
        td.textContent = `${found}/${all}`;
        tr.appendChild(td);

        table.appendChild(tr);
      }
    } else /* section === 'ANAGRAM' */ {
      for (const group of anagrams) {
        const tr = document.createElement('tr');
        let td = document.createElement('td');

        let together = [];
        let wait = false;
        for (const {raw, found, all} of group) {
          const w = raw.replace(/[^A-Z]/, '');

          if (raw.startsWith('(')) {
            const b = document.createElement('b');
            b.textContent = '(';
            together.push(b);
            wait = true;
          }

          together.push(link(w));

          let span = document.createElement('span');
          span.textContent = ` ${found}/${all}`;

          if (raw.endsWith(')')) {
            together.push(span);
            const b = document.createElement('b');
            b.textContent = ')';
            together.push(b);
            wait = false;
          } else {
            if (wait) span.textContent += ' ';
            together.push(span);
          }

          if (!wait) {
            for (const e of together) td.appendChild(e);
            td.appendChild(document.createElement('br'));
            together = [];
          }
        }

        tr.appendChild(td);
        table.appendChild(tr);
      }
    }
    if (this.table) this.stats.removeChild(this.table);
    this.stats.appendChild(table);
    this.table = table;
  }
}

// DEBUG
class DebugView extends View {
  constructor(id, state) {
    super();
    this.id = id;
    this.state = state;
  }

  toJSON() {
    return {state: this.state};
  }

  fromJSON() {
    this.state = state;
  }

  async attach() {
    await Promise.all([LOADED.DICT, LOADED.STATS]);

    this.element = createElementWithId('div', this.id);
    this.element.textContent = id.toUpperCase();
    return this.element;
  }

  detach() {
    return this.element;
  }
}

class BoardView extends DebugView {
  constructor() {
    super('board')
  }
}
class ScoreView extends DebugView {
  constructor() {
    super('score')
  }
}
class TrainingView extends DebugView {
  constructor() {
    super('training')
  }
}

class SettingsView extends DebugView {
  constructor() {
    super('settings')
  }
}

// class SettingsView {
//   attach() {
//     this.settings = createElementWithId('div', 'settings');

//     const createRow = (e) => { 
//       const row = document.createElement('div');
//       row.classlist.add('row');
//       row.appendChild(e);
//       return e;
//     }

//     const seed = createElementWithId('div', 'seed');
//     seed.setAttribute('contenteditable', true);

//     this.settings.appendChild(createRow(seed));
//     this.settings.appendChild(createRow(createRadios('dice', [['New'], 'Old', 'Big'], e => {
//       const min = this.value === 'Big' ? 4 : 3;
//       document.getElementById(`min${min}`).checked = true;
//       updateSettings({dice: this.value, min});
//     })));
//     this.settings.appendChild(createRow(createRadios('min', [['3'], '4', '5'], e => {
//       updateSettings({min: Number(this.value)});
//     })));
//     this.settings.appendChild(createRow(createRadios('dict', [['NWL'], 'ENABLE', 'CSW'], e => {
//       updateSettings({dict: this.value});
//     })));
//     this.settings.appendChild(createRow(createRadios('grade', ['A', 'B', ['C'], 'D'], e => {
//       updateSettings({grade: this.value});
//     })));
//     this.settings.appendChild(createRow(createRadios('scoreDisplay', ['Hide', ['Show'], 'Full'], e => {
//       updateSettings({display: this.value});
//     })));
//     this.settings.appendChild(createRow(createRadios('theme', [['Light'], 'Dark'], e => {
//       updateSettings({theme: this.value});
//       setTheme(this.value);
//     })));

//     return this.settings;
//   }

//   update(settings) {
//     document.getElementById('seed').textContent = Game.encodeID(settings, SEED);
//     document.getElementById(`dice${settings.dice}`).checked = true;
//     document.getElementById(`min${settings.min}`).checked = true;
//     document.getElementById(`dict${settings.dict}`).checked = true;
//     document.getElementById(`grade${settings.grade}`).checked = true;
//     document.getElementById(`scoreDisplay${settings.display}`).checked = true;
//     document.getElementById(`theme${settings.theme || 'Light'}`).checked = true;
//   }

//   detach() {
//     return this.settings;
//   }
// }

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

function createRadios(id, values, listener) {
  const radios = createElementWithId('span', id);
  radios.classList.add('toggle-group');
  radios.classList.add('horizontal');
  radios.setAttribute('role', 'radiogroup');
  for (let val of values) {
    let checked = false;
    if (Array.isArray(val)) {
      checked = true;
      val = val[0];
    }

    const radio = createElementWithId('input', `${id}${val}`);
    radio.classList.add('hide');
    radio.setAttribute('type', 'radio');
    radio.setAttribute('name', id);
    radio.setAttribute('value', val);
    if (checked) radio.setAttribute('checked', 'checked');

    const label = document.createElement('label');
    label.classList.add('toggle');
    label.setAttribute('for', `${id}${val}`);
    label.textContent = val.toUpperCase();

    radio.addEventListener('click', listener.bind(radio));

    radios.appendChild(radio);
    radios.appendChild(label);
  }
  return radios;
}

function displayAnagrams(word, fn) {
  const div = createElementWithId('div', 'defineAnagrams');
  while (div.firstChild) div.removeChild(stats.firstChild);

  const words = STATS.anagrams(word, SETTINGS.dict).words;
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
    const e = document.createElement(w === word ? 'b' : 'span');
    e.textContent = w;
    e.addEventListener('click', () => fn(w));
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

function updateGames(game) {
  if (!GAMES) return;

  const played = new Set();
  for (const w in game.played) {
    if (game.played[w] > 0) played.add(w);
  }
  if (!played.size) return GAMES;

  if (GAMES.length >= STATS_LIMIT) GAMES.shift();
  GAMES.push([game.possible, played]);
}

const UI = new (class{
  constructor() {
    this.root = document.getElementById('display');

    this.Views = {
      Menu: new MenuView(),
      Loading: new LoadingView(),
      Board: new BoardView(),
      Score: new ScoreView(),
      Training: new TrainingView(),
      Define: new DefineView(),
      Stats: new StatsView(),
      Settings: new SettingsView(),
    }

    this.current = 'Menu';
    this.previous = 'Menu';
  }

  async create() {
    setTimeout(() => window.scrollTo(0, 1), 0);

    document.addEventListener('keydown', e => this.onKeydown(e));
    document.addEventListener('swiped-left', () => this.toggleView('Define'));
    document.addEventListener('swiped-right', () => this.toggleView('Define'));

    const state = JSON.parse(localStorage.getItem('state'));
    console.log(state);
    if (state) {
      this.current = state.current.type;
      if (this.Views[this.current].fromJSON){
        this.Views[this.current].fromJSON(state.current.data);
      }
      this.previous = state.previous.type;
      if (this.Views[this.previous].fromJSON) {
        this.Views[this.previous].fromJSON(state.previous.data);
      }
    }
    await this.attachView(this.current);
  }

  persist(previous) {
    const state = JSON.parse(localStorage.getItem('state')) || {};
    state.current = {
      type: this.current,
      data: this.Views[this.current],
    };
    if (previous || !state.previous) {
      state.previous = {
        type: this.previous,
        data: this.Views[this.previous],
      };
    }
    localStorage.setItem('state', JSON.stringify(state));
  }

  async attachView(view, data) {
    console.log('ATTACHING', view, data, this.Views[view]);
    const p = this.Views[view].attach(data);
    if (Promise.resolve(p) !== p) {
      this.root.appendChild(p);
    } else {
      this.attachView('Loading');
      const v = await p;
      this.detachView('Loading');
      this.root.appendChild(v);
    }
    if (this.Views[view].onAttach) {
      this.Views[view].onAttach();
    }
  }

  detachView(view) {
    console.log('DETACHING', view, this.Views[view]);
    this.root.removeChild(this.Views[view].detach());
  }

  async toggleView(view, data) {
    console.log('TOGGLE', view, {current: this.current, previous: this.previous});
    if (this.current === view) {
      this.detachView(view);
      this.current = this.previous;
      this.previous = view;
      await this.attachView(this.current, data);
    } else {
      this.detachView(this.current);
      this.previous = this.current;
      this.current = view;
      await this.attachView(view, data);
    }
    this.persist(true);
  }

  async onKeydown(e) {
    const key = e.keyCode;
    if (key === 191 && e.shiftKey) {
      e.preventDefault(); 
      await this.toggleView('Define');
    } else if ('onKeydown' in this.Views[this.current]) {
      await this.Views[this.current].onKeydown(e);
    }
  }
})();