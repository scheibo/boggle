'use strict';

const DEFAULTS = {dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show'};
const SETTINGS = JSON.parse(localStorage.getItem('settings')) || DEFAULTS;
const STORE = new Store('db', 'store');
const PLAYED = new Set();

const fetchJSON = url => fetch(url, {mode: 'no-cors'}).then(j => j.json());
var DICT, STATS, HISTORY, TRIE, GAMES;

const loaded = {
  DICT: fetchJSON('../data/dict.json').then(d => { DICT = d; }), // TODO ../
  HISTORY: STORE.get('history').then(h => HISTORY = h || []),
};
// TODO: TRIE, STATS, PLAYED, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
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
  attach() {}
  detach() {}
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
    const title = createElementWithId('h1', 'title');
    title.textContent = 'BOGGLE';
    // TODO: needs testing!
    title.addEventListener('long-press', async () => {
      await caches.delete((await caches.keys()).find(n => n.startsWith('cache')));
      document.location.reload(true);
    });
    this.menu.appendChild(title);
    const nav = document.createElement('nav');

    const createButton = (name, fn) => {
      const button = document.createElement('button');
      button.classList.add('toggle');
      button.textContent = name;
      button.addEventListener('click', fn);
      return button;
    }

    nav.appendChild(createButton('PLAY', () => {}));
    nav.appendChild(createButton('TRAIN', () => UI.toggleView('Training')));
    nav.appendChild(createButton('DEFINE', () => UI.toggleView('Define')));
    nav.appendChild(createButton('STATS', () => UI.toggleView('Stats')));
    nav.appendChild(createButton('SETTINGS', () => UI.toggleView('Settings')));

    this.menu.appendChild(nav);
    return this.menu;
  }

  detach() {
    return this.menu;
  }
}

class DefineView extends View {
  constructor(json) {
    super();
    this.word = json ? json.word : '';
  }

  toJSON() {
    return {word: this.word};
  }

  async attach(word) {
    await Promise.all([LOADED.DICT, LOADED.STATS]);

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
  constructor(json) {
    super();
    this.section = json ? json.section : 'WORD';
  }

  toJSON() {
    return {section: this.section};
  }

  // TODO: why is there no spinner?
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
    const back = createBackButton(() => UI.toggleView('Menu'));
    const display = w => this.display(w, data);
    const radios = createRadios('statsSelect', ['WORD', 'ANAGRAM', 'PAIR'].map(s => s === this.section ? [s] : s), function() {
      display(this.value);
      UI.persist();
    });

    this.stats.append(createTopbar(back, radios, null));
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

class ReviewView extends View {
  constructor(json) {
    super();
    this.size = json ? json.size : 0;
  }

  toJSON() {
    return {size: this.size};
  }

  async attach(size) {
    await Promise.all([LOADED.DICT, LOADED.STATS]);

    this.review = createElementWithId('div', 'review');
    if (size) this.size = size;

    const back = createBackButton(() => UI.toggleView('Training'));
    const progress = createElementWithId('div', 'progress');
    progress.textContent = this.size;
    this.review.appendChild(createTopbar(back, null, progress));

    const d = SETTINGS.dice.charAt(0).toLowerCase();
    const score = k => STATS.anagrams(k, SETTINGS.dice)[d] || 0;

    const store = new Store('training', SETTINGS.dict);
    const data = await store.get('data');
    const keys = data
      .filter(w => w.e < 2.0) // TODO: !v.c, figure out 2.0 based on average?
      .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
      .map(w => w.k);

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');

    for (const k of keys) {
      const table = document.createElement('table');
      table.classList.add('results');
      addAnagramRows(table, order(STATS.anagrams(k, SETTINGS.dice).words));
      wrapper.appendChild(table);
    }
    this.review.appendChild(wrapper);

    return this.review;
  }

  detach() {
    return this.review;
  }
}

class TrainingView extends View {
  async attach() {
    await Promise.all([LOADED.TRAINING, LOADED.DICT, LOADED.STATS]);
    if (!this.pool || this.pool.type !== SETTINGS.dict) {
      const store = new Store('training', SETTINGS.dict);
      this.pool = await TrainingPool.create(
        STATS, SETTINGS.dice, SETTINGS.dict, store, SETTINGS.min);
    }

    this.train = createElementWithId('div', 'train');
    this.next();
    return this.train;
  }

  async detach() {
    if (this.restore) await this.restore();
    this.content = null;
    return this.train;
  }

  next() {
    const content = createElementWithId('div', 'content');
    const progress = createElementWithId('div', 'progress');
    progress.textContent = this.pool.size();

    const {label, group, update, restore} = this.pool.next();
    this.restore = restore;
    const trainWord = document.createElement('div');
    trainWord.classList.add('word');
    trainWord.textContent = label;

    const sizeHint = createElementWithId('div', 'sizeHint');
    sizeHint.classList.add('hidden');
    sizeHint.textContent = group.length;

    const rating = this.createRatingToggles(update);
    const table = document.createElement('table');
    table.classList.add('results', 'hidden');
    addAnagramRows(table, group);

    progress.addEventListener('mouseup', () => UI.toggleView('Review', progress.textContent));
    progress.addEventListener('long-press', () => {
      if (!rating.classList.contains('hidden')) return;
      sizeHint.classList.remove('hidden')
    });
    progress.addEventListener('long-press-up', () => sizeHint.classList.add('hidden'));

    const back = createBackButton(() => UI.toggleView('Menu'));
    content.appendChild(createTopbar(back, null, progress));

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');
    wrapper.appendChild(trainWord);
    wrapper.appendChild(table);

    content.appendChild(wrapper);
    content.appendChild(sizeHint);
    content.appendChild(rating);

    const listener = e => {
      if (![back, progress].includes(e.target)) {
        content.removeEventListener('click', listener);
        trainWord.classList.add('hidden');
        table.classList.remove('hidden');
        rating.classList.remove('hidden');
      }
    };
    content.addEventListener('click', listener);

    if (this.content) this.train.removeChild(this.content);
    this.train.appendChild(content);
    this.content = content;
  }

  createRatingToggles(update) {
    const toggles = document.createElement('div');
    toggles.setAttribute('id', 'rating');
    toggles.classList.add('toggle-group');
    toggles.classList.add('horizontal');
    toggles.classList.add('hidden');

    for (let i = 0; i < 6; i++) {
      const toggle = document.createElement('button');
      toggle.setAttribute('id', `rating${i}`);
      toggle.setAttribute('type', 'button');
      toggle.classList.add('toggle');
      toggle.textContent = i;

      toggles.appendChild(toggle);

      toggle.addEventListener('click', async () => {
        await update(Number(toggle.textContent));
        this.restore = null;
        this.next();
      });
    }

    return toggles;
  }
}

class BoardView extends View {
  async attach() {

  }
  detach() {

  }
}
class ScoreView extends View {
  async attach() {

  }
  detach() {

  }
}

class SettingsView extends View {
  attach() {
    this.settings = createElementWithId('div', 'settings');

    const createRow = (e) => {
      const row = document.createElement('div');
      row.classList.add('row');
      row.appendChild(e);
      return row;
    };

    const seed = createElementWithId('div', 'seed');
    seed.setAttribute('contenteditable', true);
    const back = createBackButton(() => UI.toggleView('Menu'));
    this.settings.appendChild(createTopbar(back, seed, null));

    const checkedRadioRow = (k, opts, fn, id) =>
      createRow(createRadios(id || k, opts.map(s => s === String(SETTINGS[k]) ? [s] : s), fn));
    this.settings.appendChild(checkedRadioRow('dice', ['New', 'Old', 'Big'], function () {
      const min = this.value === 'Big' ? 4 : 3;
      document.getElementById(`min${min}`).checked = true;
      updateSettings({dice: this.value, min});
    }));
    this.settings.appendChild(checkedRadioRow('min', ['3', '4', '5'], function () {
      updateSettings({min: Number(this.value)});
    }));
    this.settings.appendChild(checkedRadioRow('dict', ['NWL', 'ENABLE', 'CSW'], function () {
      updateSettings({dict: this.value});
    }));
    this.settings.appendChild(checkedRadioRow('grade', ['A', 'B', 'C', 'D'], function () {
      updateSettings({grade: this.value});
    }));
    this.settings.appendChild(checkedRadioRow('display', ['Hide', 'Show', 'Full'], function () {
      updateSettings({display: this.value});
    }, 'scoreDisplay'));
    this.settings.appendChild(checkedRadioRow('theme', ['Light', 'Dark'], function () {
      updateSettings({theme: this.value});
      setTheme(this.value);
    }));

    return this.settings;
  }

  detach() {
    return this.settings;
  }
}

function updateSettings(settings) {
  Object.assign(SETTINGS, settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
  // TODO
  // const id = Game.encodeID(SETTINGS, SEED);
  // document.getElementById('seed').textContent = id;
  // window.history.replaceState(null, null, `#${id}`);
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

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme.toLowerCase());
}

function addAnagramRows(table, group) {
  for (const r of group) {
    const w = r.replace(/[^A-Z]/, '');
    const tr = document.createElement('tr');
    const grade = STATS.stats(w, SETTINGS.dice, SETTINGS.dict).grade;
    if (grade < SETTINGS.grade) tr.classList.add('hard');

    let td = document.createElement('td');
    const b = document.createElement('b');
    b.textContent = r.endsWith(')') ? `\xa0${r}` : r;
    td.appendChild(b);
    tr.appendChild(td);
    td = document.createElement('td');
    td.textContent = define(w, DICT);
    tr.appendChild(td);

    table.appendChild(tr);
  }
}

function createTopbar(left, center, right) {
  const topbar = createElementWithId('header', 'topbar');
  topbar.appendChild(left || document.createElement('div'));
  topbar.appendChild(center || document.createElement('div'));
  topbar.appendChild(right || document.createElement('div'));
  return topbar;
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

function createBackButton(fn) {
  const back = createElementWithId('div', 'back');
  const img = document.createElement('img');
  img.src = '../img/back.svg'; // TODO ../
  img.height = 20;
  back.appendChild(img);
  back.addEventListener('click', fn);
  return back;
}

const UI = new (class{
  async create() {
    setTimeout(() => window.scrollTo(0, 1), 0);

    // If theme has been explicitly set by the user then that trumps the system value
    if (SETTINGS.theme !== undefined) {
      setTheme(SETTINGS.theme);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light');
    }

    this.root = document.getElementById('display');

    const state = JSON.parse(localStorage.getItem('state'));
    console.log(state); // DEBUG
    this.current = state ? state.current : 'Menu';
    this.previous = state ? state.previous : 'Menu';
    const VIEWS = {
      Menu: MenuView,
      Loading: LoadingView,
      Board: BoardView,
      Score: ScoreView,
      Training: TrainingView,
      Review: ReviewView,
      Define: DefineView,
      Stats: StatsView,
      Settings: SettingsView,
    };
    const views = state ? state.views : {};
    this.Views = {};
    for (const [type, view] of Object.entries(VIEWS)) {
      this.Views[type] = new view(views[type]);
    }

    document.addEventListener('keydown', e => this.onKeydown(e));
    document.addEventListener('swiped-left', () => this.toggleView('Define'));
    document.addEventListener('swiped-right', () => this.toggleView('Define'));

    await this.attachView(this.current);
  }

  persist(previous) {
    const state = JSON.parse(localStorage.getItem('state')) || {};
    state.current = this.current;
    state.previous = this.previous;
    state.views = state.views || {};
    state.views[this.current] = this.Views[this.current];
    if (previous) state.views[this.previous] = this.Views[this.previous];
    localStorage.setItem('state', JSON.stringify(state));
  }

  async attachView(view, data) {
    console.log('ATTACHING', view, data, this.Views[view]);

    this.root.appendChild(this.Views.Loading.attach());
    const v = await this.Views[view].attach(data);
    this.root.removeChild(this.Views.Loading.detach());
    this.root.appendChild(v);

    if (this.Views[view].afterAttach) {
      this.Views[view].afterAttach();
    }
  }

  async detachView(view) {
    console.log('DETACHING', view, this.Views[view]);
    this.root.removeChild(await this.Views[view].detach());
  }

  async toggleView(view, data) {
    console.log('TOGGLE', view, {current: this.current, previous: this.previous});
    if (this.current === view) {
      await this.detachView(view);
      this.current = this.previous;
      this.previous = view;
      await this.attachView(this.current, data);
    } else {
      await this.detachView(this.current);
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