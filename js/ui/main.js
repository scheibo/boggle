'use strict';

const DEFAULTS = {dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show'};
const SETTINGS = JSON.parse(localStorage.getItem('settings')) || DEFAULTS;
const STORE = new Store('db', 'store');
const LIMIT = 500;

const fetchJSON = url => fetch(url, {mode: 'no-cors'}).then(j => j.json());
var DICT, STATS, HISTORY, TRIE, GAMES, SEED;

SEED = 123456789; // FIXME

// TODO: TRIE, STATS, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
const LOADED = {
  DICT: fetchJSON('data/dict.json').then(d => { DICT = d; }),
  TRIE: async () => {
    if (TRIE) return;
    await LOADED.DICT;
    TRIE = Trie.create(DICT);
  },
  STATS: async () => {
    if (STATS) return;
    let stats;
    await Promise.all([
      LOADED.DICT,
      fetchJSON('data/stats.json').then(s => { stats = s; }),
    ]);
    STATS = new Stats(stats, DICT);
  },
  HISTORY: STORE.get('history').then(h => HISTORY = h || []),
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

    if (UI.Views.Board.game) {
      nav.appendChild(createButton('RESUME', () => UI.toggleView('Board', {resume: true})));
      nav.appendChild(createButton('NEW GAME', () => UI.toggleView('Board')));
    } else {
      nav.appendChild(createButton('PLAY', () => UI.toggleView('Board')));
    }
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
    await Promise.all([LOADED.HISTORY, LOADED.TRIE(), LOADED.DICT, LOADED.STATS()]);
    if (!GAMES) {
      GAMES = [];
      for (let i = HISTORY.length - 1; i >= 0 && GAMES.length < LIMIT; i--) {
        const game = Game.fromJSON(HISTORY[i], TRIE, DICT, STATS);
        const played = new Set();
        for (const w in game.played) {
          if (game.played[w] > 0) played.add(w);
        }
        GAMES.push([game.possible, played]);
      }
    }
    // TODO: cache this, invalidate if GAMES/dice/dict/min changes?
    const data = STATS.history(GAMES, SETTINGS.dice, SETTINGS.dict);

    this.stats = createElementWithId('div', 'stats');
    const back = createBackButton(() => UI.toggleView('Menu'));
    const display = w => this.display(w, data);
    const radios = createRadios('statsSelect', ['WORD', 'ANAGRAM', 'PAIR'].map(s => s === this.section ? [s] : s), function() {
      display(this.value);
      UI.persist();
    });

    this.stats.appendChild(createTopbar(back, radios, null));
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
      for (const {n, fn, d, fd, e} of anadromes) {
        const tr = document.createElement('tr');

        let td = document.createElement('td');
        td.appendChild(link(n));
        tr.appendChild(td);

        td = document.createElement('td');
        td.textContent = `${fn}/${fd} (${e})`;
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
    await Promise.all([LOADED.DICT, LOADED.STATS()]);

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
    await Promise.all([LOADED.TRAINING, LOADED.DICT, LOADED.STATS()]);
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

const DURATION = 180 * 1000;

class BoardView extends View {
  constructor(json) {
    super();
    this.last = json ? json.last : '';
    this.kept = json ? json.kept : false;
    this.game = json ? json.game : undefined;
    const {display, timer} = json ?
      this.createTimer(json.timer.duration, json.timer.elapsed) :
      this.createTimer();
    this.timer = timer;
    this.timerDisplay = display;
  }

  toJSON() {
    return {
      last: this.last,
      kept: this.kept,
      timer: this.timer,
      game: this.game,
    };
  }

  async attach(data) {
    await Promise.all([LOADED.DICT, LOADED.TRIE(), LOADED.STATS(), LOADED.HISTORY]);

    if (!this.played) {
      this.played = new Set();
      for (const h of HISTORY) this.played.add(h.seed);
    }

    if (!this.game || !data.resume) {
      if (this.game) {
        this.timer.stop();
        this.played.add(this.game.id);
        if (Object.values(this.game.played).filter(t => t > 0).length) {
          updateGames(this.game);
          HISTORY.push(this.game.toJSON());
          await STORE.set('history', HISTORY);
        }
      }

      let game;
      const random = new Random();
      while (!game || !Object.keys(game.possible).length) {
        random.seed = SEED;
        const id = Game.encodeID(SETTINGS, random.seed);
        if (this.played.has(id) && !data.allowDupes) {
          SEED++;
          continue;
        }
        game = new Game(TRIE, DICT, STATS, random, SETTINGS);
      }
      this.game = game;

      const {display, timer} = this.createTimer();
      this.timer = timer;
      this.timerDisplay = display;

      this.last = '';
      this.kept = false;
    } else if (!('random' in this.game)) {
      this.game = Game.fromJSON(this.game, TRIE, DICT, STATS);
    }
    SEED = this.game.random.seed;

    this.container = createElementWithId('div', 'game');

    const back = createBackButton(() => UI.toggleView('Menu'));
    back.addEventListener('long-press', () => this.refresh());

    this.score = createElementWithId('div', 'score');
    this.score.addEventListener('mouseup', () => {
      const pane = new ScorePane(this);
      UI.root.removeChild(this.detach());
      UI.root.appendChild(pane.attach());
    });
    this.score.addEventListener('long-press', () => this.onLongPress());
    this.score.addEventListener('long-press-up', () => this.onLongPressUp());
    this.displayScore();

    this.container.appendChild(createTopbar(back, this.timerDisplay, this.score));

    this.full = createElementWithId('div', 'full');
    this.container.appendChild(this.full);

    this.container.appendChild(this.renderBoard());

    this.word = createElementWithId('div', 'word');
    this.word.classList.add('word');
    if (!(('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0))) {
      this.word.contentEditable = true;
    }
    this.container.appendChild(this.word);
    this.defn = createElementWithId('div', 'defn');
    this.defn.classList.add('definition')
    this.container.appendChild(this.defn);

    this.timer.start(); // FIXME: don't restart when coming back from score if paused!
    const hash = `#${this.game.id}`;
    if (document.location.hash !== hash) {
      window.history.replaceState(null, null, hash);
    }

    return this.container;
  }

  renderBoard() {
    const content = createElementWithId('div', 'foo');
    const table = createElementWithId('table', 'board');
    if (this.game.size > 4) table.classList.add('big');

    this.tds = new Set();
    const random = new Random(this.game.seed);
    for (let row = 0; row < this.game.size; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < this.game.size; col++) {
        const td = document.createElement('td');
        td.textContent = this.game.board[row * this.game.size + col];
        if (td.textContent === 'Qu') td.classList.add('qu');
        if (['M', 'W', 'Z'].includes(td.textContent)) td.classList.add('underline');
        td.classList.add(`rotate${90 * random.next(0, 4)}`);
        td.setAttribute('data-x', row);
        td.setAttribute('data-y', col);

        const div = document.createElement('div');
        div.classList.add('target');
        div.setAttribute('data-x', row);
        div.setAttribute('data-y', col);

        td.appendChild(div);
        tr.appendChild(td);
        this.tds.add(td);
      }
      table.appendChild(tr);
    }

    let touched;
    const deselect = () => {
      if (!touched) return;
      for (const td of touched) {
        td.classList.remove('selected');
      }
    };

    const registerTouch = e => {
      const touch = e.touches[0];
      const cell = document.elementFromPoint(touch.clientX, touch.clientY);
      if (cell && cell.matches('.target')) {
        const td = cell.parentNode;
        td.classList.add('selected');
        if (!touched.has(td)) {
          touched.add(td);
          this.word.textContent += td.textContent;
        }
      }
    };

    table.addEventListener('touchstart', e => {
      this.clear();
      deselect();
      touched = new Set();

      registerTouch(e);
    });
    table.addEventListener('touchend', () => {
      deselect();
      this.play();
    });
    table.addEventListener('touchmove', registerTouch);

    content.appendChild(table);
    return content;
  }

  afterAttach() {
    permaFocus(this.word);
  }

  detach() {
    return this.container;
  }

  async refresh(data) {
    UI.persist();
    await UI.detachView('Board');
    await UI.attachView('Board', data);
  }

  play() {
    let w = this.word.textContent.toUpperCase();
    if (w.length < 3 || SUFFIXES.includes(w)) {
      w = `${this.last}${w}`;
      this.word.textContent = w;
    }
    const score = this.game.play(w);
    this.last = w;
    UI.persist();

    const hide = this.game.settings.display === 'Hide';
    this.kept = true;
    if (!hide && score) {
      this.displayScore();
      this.defn.textContent = define(w, DICT);
    } else {
      const original = this.word.textContent;
      if (!hide && this.game.played[w] < 0) this.word.classList.add('error');
      this.word.classList.add('fade');
      const listener = () => {
        this.clear(original);
        this.word.removeEventListener('animationend', listener);
      }
      this.word.addEventListener('animationend', listener);
    }
  }

  displayScore() {
    if (this.game.settings.display === 'Hide') {
      this.score.textContent = '?';
      return;
    }

    if (this.game.settings.display === 'Full') {
      const state = this.game.state();
      const p = state.progress;
      const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams}`;
      const score = this.game.score.regular + this.game.score.overtime;
      const goal = state.totals[SETTINGS.grade.toLowerCase()];
      this.full.textContent = `${details} - ${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
    }

    const s = this.game.score;
    this.score.textContent = s.overtime ? `${s.regular} / ${s.overtime}` : `${s.regular}`;
  }

  clear(w) {
    if (w && w !== this.word.textContent) return;
    this.word.textContent = '';
    this.word.classList.remove('error');
    this.word.classList.remove('fade');
    this.defn.textContent = '';
    this.kept = false;
  }

  createTimer(duration = DURATION, elapsed = 0) {
    const display = createElementWithId('div', 'timer');
    display.addEventListener('click', () => this.timer.pause());
    return {display, timer: new Timer(display, duration, elapsed, () => {
      if (this.game && !this.game.expired) {
        this.game.expired = +new Date();
      }
    }, () => UI.persist())};
  }

  updateGames(game) {
    if (!GAMES) return;

    const played = new Set();
    for (const w in game.played) {
      if (game.played[w] > 0) played.add(w);
    }
    if (!played.size) return GAMES;

    if (GAMES.length >= LIMIT) GAMES.shift();
    GAMES.push([game.possible, played]);
  }

  onLongPress() {
    const size = this.game.size;
    const weights = [];
    for (let row = 0; row < size; row++) {
      const a = [];
      for (let col = 0; col < size; col++) {
        a.push(0);
      }
      weights.push(a);
    }
    let total = 0;
    for (const word in this.game.possible) {
      if (this.game.played[word]) continue;
      const score = Game.score(word);
      total += score;
      for (const p of this.game.possible[word]) {
        weights[p[1]][p[0]] += score;
      }
    }

    for (const td of this.tds) {
      const w = weights[Number(td.dataset.x)][Number(td.dataset.y)] / total;
      td.style.backgroundColor = `rgba(255,0,0,${w})`;
    }
  }

  onLongPressUp() {
    for (const td of this.tds) {
      td.style.removeProperty('background-color');
    }
  }

  async onKeyDown(e) {
    if (this.kept) this.clear();
    focusContentEditable(this.word);
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      e.preventDefault();
      this.play();
      focusContentEditable(this.word);
    } else if (key === 27) {
      await UI.toggleView('Define');
    } else if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  }
}

class ScorePane {
  constructor(board) {
    this.board = board;
  }

  attach() {
    this.container = createElementWithId('div', 'game');

    const wrapper = createElementWithId('div', 'wrapper');
    wrapper.classList.add('score');

    const back = createBackButton(async () => {
      UI.root.removeChild(this.detach());
      UI.root.appendChild(await this.board.attach({resume: true}));
    });

    this.container.appendChild(createTopbar(back, this.board.timerDisplay, this.board.score.cloneNode(true)));

    const state = this.board.game.state();
    const score = this.board.game.score.regular + this.board.game.score.overtime;
    const goal = state.totals[SETTINGS.grade.toLowerCase()];
    const details = `${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
    const current = makeCollapsible(this.board.game.id, details, 'block');
    const div = document.createElement('div');
    div.classList.add('collapsible-content');
    this.displayPlayed(state, div, true);
    this.displayPossible(state, div);
    wrapper.appendChild(current);
    wrapper.appendChild(div);
    // Start off with played expanded
    current.classList.add('active');
    div.style.display = 'block';

    for (let i = HISTORY.length - 1; i >= 0; i--) {
      const state = HISTORY[i];
      let score = 0;
      for (const [w, t] of Object.entries(state.words)) {
        if (t > 0) score += Game.score(w);
      }
      if (!score) continue;

      const details = `${score}/${state.goal[SETTINGS.grade]} (${Math.round(score / state.goal[SETTINGS.grade] * 100).toFixed(0)}%)`;
      const div = document.createElement('div');
      div.classList.add('collapsible-content');
      div.classList.add('lazy');
      const button = makeCollapsible(state.seed, details, 'block', () => {
        if (div.classList.contains('lazy')) {
          div.classList.remove('lazy');
          const game = Game.fromJSON(state, TRIE, DICT, STATS);
          const s = game.state();
          this.displayPlayed(s, div);
          this.displayPossible(s, div);
        }
      });
      wrapper.appendChild(button);
      wrapper.appendChild(div);
    }

    this.container.appendChild(wrapper);

    return this.container;
  }

  detach() {
    return this.container;
  }

  displayPlayed(state, div, expanded) {
    const p = state.progress;
    const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams} (${p.invalid}/${p.total})`;

    const button = makeCollapsible('PLAYED', details, 'table');

    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    table.classList.add('played');

    for (const {word, grade, overtime, defn, invalid} of state.played) {
      const tr = document.createElement('tr');
      if (grade < SETTINGS.grade) tr.classList.add('hard');
      if (invalid) tr.classList.add('error');
      if (overtime) tr.classList.add('overtime');

      let td = document.createElement('td');
      const b = document.createElement('b');
      b.textContent = word;
      td.appendChild(b);
      tr.appendChild(td);

      td = document.createElement('td');
      if (defn) td.textContent = defn;
      tr.appendChild(td);

      table.appendChild(tr);
    }

    if (expanded) {
      button.classList.add('active');
      table.style.display = 'table';
    }

    div.appendChild(button);
    div.appendChild(table);
  }

  displayPossible(state, div, expanded) {
    const tot = state.totals;
    const details = `${tot.d}/${tot.c}/${tot.b}/${tot.a} (${tot.s})`;

    const button = makeCollapsible('POSSIBLE', details, 'table');
    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    table.classList.add('possible');

    for (const {word, grade, overtime, root, missing, defn} of state.remaining) {
      const tr = document.createElement('tr');
      if (grade < SETTINGS.grade) tr.classList.add('hard');
      if (overtime) tr.classList.add('overtime');

      let td = document.createElement('td');
      const b = document.createElement('b');
      if (root) {
        const rootSpan = document.createElement('span');
        rootSpan.textContent = root;
        const suffixSpan = document.createElement('span');
        suffixSpan.classList.add('underline');
        suffixSpan.textContent = word.slice(root.length);
        b.appendChild(rootSpan);
        b.appendChild(suffixSpan);
      } else {
        if (missing) b.classList.add('underline');
        b.textContent = word;
      }
      td.appendChild(b);
      tr.appendChild(td);

      td = document.createElement('td');
      td.textContent = defn;
      tr.appendChild(td);

      table.appendChild(tr);
    }

    if (expanded) {
      button.classList.add('active');
      table.style.display = 'table';
    }

    div.appendChild(button);
    div.appendChild(table);
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
    seed.textContent = Game.encodeID(SETTINGS, SEED);
    seed.setAttribute('contenteditable', true);
    seed.addEventListener('input', () => this.onInput(seed.textContent));
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

  update() {
    const seed = document.getElementById('seed');
    seed.textContent = Game.encodeID(SETTINGS, SEED);
    seed.classList.remove('error');
    document.getElementById(`dice${SETTINGS.dice}`).checked = true;
    document.getElementById(`min${SETTINGS.min}`).checked = true;
    document.getElementById(`dict${SETTINGS.dict}`).checked = true;
    document.getElementById(`grade${SETTINGS.grade}`).checked = true;
    document.getElementById(`scoreDisplay${SETTINGS.display}`).checked = true;
    document.getElementById(`theme${SETTINGS.theme || 'Light'}`).checked = true;
  }

  onInput(id) {
    const [settings, seed] = Game.decodeID(id);
    if (isNaN(seed) || !(settings.dice && settings.dict && settings.min)) {
      document.getElementById('seed').classList.add('error');
    } else {
      updateSettings(settings, seed, false);
      this.update();
    }
  }
}

function updateSettings(settings, seed, dom = true) {
  Object.assign(SETTINGS, settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
  if (seed) SEED = seed;

  const id = Game.encodeID(SETTINGS, SEED);
  window.history.replaceState(null, null, `#${id}`);

  if (dom && UI.current === 'Settings') {
    const seed = document.getElementById('seed');
    seed.textContent = id;
    seed.classList.remove('error');
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
    const s = r.startsWith('(') ? `${r}\xa0` : r.endsWith(')') ? `\xa0${r}` : `\xa0${r}\xa0`;
    b.textContent = `\xa0${s}\xa0`;
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

function makeCollapsible(title, details, display, fn) {
  const button = document.createElement('button');
  button.setAttribute('type', 'button');
  button.classList.add('collapsible');

  const div = document.createElement('div');

  const titleSpan = document.createElement('span');
  titleSpan.classList.add('collapsible-title');
  titleSpan.textContent = title;

  const detailsSpan = document.createElement('span');
  detailsSpan.classList.add('collapsible-details');
  detailsSpan.textContent = details;

  div.appendChild(titleSpan);
  div.appendChild(detailsSpan);
  button.appendChild(div);

  button.addEventListener('click', () => {
    button.classList.toggle('active');
    const content = button.nextElementSibling;
    if (content.style.display === display) {
      content.style.display = 'none';
    } else {
      if (fn) fn();
      content.style.display = display;
    }
  });

  return button;
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
  back.appendChild(UI.BACK);
  back.addEventListener('mouseup', fn);
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

    this.BACK = document.createElement('img');
    this.BACK.src = 'img/back.svg';
    this.BACK.height = 20;

    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('swiped-left', () => this.toggleView('Define'));
    document.addEventListener('swiped-right', () => this.toggleView('Define'));
    window.addEventListener('hashchange',  () => this.onHashChange());

    await this.attachView(this.current);
  }

  // FIXME: add a persist call in window.unload?
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
    // console.log(+new Date(), 'ATTACHING', view, data, this.Views[view]);
    this.root.appendChild(this.Views.Loading.attach());
    const v = await this.Views[view].attach(data);
    this.root.removeChild(this.Views.Loading.detach());
    this.root.appendChild(v);
    // console.log(+new Date(), 'ATTACHED', view, data, this.Views[view]);

    if (this.Views[view].afterAttach) {
      this.Views[view].afterAttach();
    }
  }

  async detachView(view) {
    // console.log(+new Date(), 'DETACHING', view, this.Views[view]);
    this.root.removeChild(await this.Views[view].detach());
    // console.log(+new Date(), 'DETACHED', view, this.Views[view]);
  }

  async toggleView(view, data) {
    // console.log('TOGGLE', view, {current: this.current, previous: this.previous});
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

  async onKeyDown(e) {
    const key = e.keyCode;
    if (key === 191 && e.shiftKey) {
      e.preventDefault();
      await this.toggleView('Define');
    } else if ('onKeyDown' in this.Views[this.current]) {
      await this.Views[this.current].onKeyDown(e);
    }
  }

  async onHashChange() {
    if (!document.location.hash) return;
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (isNaN(seed) || !(settings.dice && settings.dict && settings.min)) return;

    let refresh = seed !== SEED;
    if (!refresh) {
      const s = Object.assign({}, SETTINGS);
      refresh = s.dice !== SETTINGS.dice || s.min !== SETTINGS.min || s.dict !== SETTINGS.dict;
    }
    updateSettings(settings, seed, false);

    if (this.current === 'Settings') {
      this.Views[this.current].update();
    } else if (refresh && this.current === 'Play') {
      this.Views[this.current].refresh({allowDupes: true});
    }
  }
})();