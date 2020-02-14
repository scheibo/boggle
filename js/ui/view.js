'use strict';

const SETTINGS = JSON.parse(localStorage.getItem('settings')) || {dice: 'New', dict: 'NWL', grade: 'C', display: 'Show'};
const STORE = new Store('db', 'store');

var GAMES = null;
var HISTORY = null;
var STATE = null;
var DICT = null;
var TRIE = null;
var STATS = null;
var HASH_REFRESH = true;
var SEED = 0;
var ORIGINAL = {settings: Object.assign({}, SETTINGS), seed: SEED};
var LAST = '';
var LAST_DEFINITION = '';
var PLAYED = new Set();

const STATS_LIMIT = 500;

let kept = false;

const TOUCH = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0);

(async () => {
  setTimeout(() => window.scrollTo(0, 1), 0);

  // If theme has been explicitly set by the user then that trumps the system value
  if (SETTINGS.theme !== undefined) {
    setTheme(SETTINGS.theme);
  } else {
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light');
  }

  const dict = fetch('data/dict.json', {mode: 'no-cors'}).then(r => r.json());
  const stats = fetch('data/stats.json', {mode: 'no-cors'}).then(r => r.json());
  const history = STORE.get('history');
  const storeInit = Store.setup('training', ['NWL', 'ENABLE', 'CSW']);

  const init = async fn => {
    const menu = document.getElementById('menu');
    menu.classList.add('hidden');

    await withLoader(async () => {
      DICT = await dict;
      STATS = new Stats(await stats, DICT);
      TRIE = Trie.create(DICT);
  
      // await (new Store('training', SETTINGS.dict)).set('data', await (await fetch('wip/data.json', {mode: 'no-cors'})).json());
      // HISTORY = await (await fetch('wip/history.json', {mode: 'no-cors'})).json();
      HISTORY = await history || [];
      for (const h of HISTORY) PLAYED.add(h.seed);
      await storeInit;
    });

    let existing = JSON.parse(localStorage.getItem('current'));
    if (existing && existing.timer > 0 &&
      (!document.location.hash || document.location.hash.slice(1) === existing.game.seed) &&
      Object.values(existing.game.words).filter(v => v > 0).length > 0) {
      const game = Game.fromJSON(existing.game, TRIE, DICT, STATS);
      SEED = game.random.seed;
      Object.assign(SETTINGS, game.settings);
      game.settings = SETTINGS;
      localStorage.setItem('settings', JSON.stringify(SETTINGS));
    } else {
      existing = null;
      const initial = setup();
      SEED = initial.seed;
      Object.assign(SETTINGS, initial.settings);
      localStorage.setItem('settings', JSON.stringify(SETTINGS));
    }

    attachListeners();
  
    fn(existing);
  };

  document.getElementById('menuPlay').addEventListener('click', () => init(async (existing) => {
    if (existing) {
      const timer = new Timer(existing.timer, () => {
        if (!game.expired) game.expired = +new Date();
      }, saveGame);
      STATE = await refresh(false, timer, game);
      LAST = existing.last;
    } else {
      STATE = await refresh();
    }
  }));
  document.getElementById('menuTrain').addEventListener('click', () => init(() => train()));
  document.getElementById('menuDefine').addEventListener('click', () => init(() => toggleDefine()));
  document.getElementById('menuStats').addEventListener('click', () => init(() => displayStats()));
  document.getElementById('menuSettings').addEventListener('click', () => init(() => displaySettings()));

  function attachListeners() {
    const word = document.getElementById('word');
    if (!TOUCH) {
      word.contentEditable = true;
      permaFocus(word);
    }

    window.addEventListener('hashchange', async (e) => {
      if (!document.location.hash) return;
      const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
      if (!isNaN(seed)) {
        updateSettings(settings);
        SEED = seed;
      }
      if (HASH_REFRESH) {
        STATE = await refresh(true);
      } else {
        updateDOMSettings();
      }
    });

    document.getElementById('refresh').addEventListener('mouseup', refreshClick);

    document.getElementById('timer').addEventListener('click', () => {
      STATE.timer.pause();
    });

    document.getElementById('score').addEventListener('long-press', e => {
      const board = document.getElementById('board');
      if (board.classList.contains('hidden')) return;
      const size = STATE.game.size;
      const weights = [];
      for (let row = 0; row < size; row++) {
        const a = [];
        for (let col = 0; col < size; col++) {
          a.push(0);
        }
        weights.push(a);
      }
      let total = 0;
      for (const word in STATE.game.possible) {
        if (STATE.game.played[word]) continue;
        const score = Game.score(word);
        total += score;
        for (const p of STATE.game.possible[word]) {
          weights[p[1]][p[0]] += score;
        }
      }

      for (const td of board.getElementsByTagName('td')) {
        const w = weights[Number(td.dataset.x)][Number(td.dataset.y)] / total;
        td.style.backgroundColor = `rgba(255,0,0,${w})`;
      }
    });

    document.getElementById('score').addEventListener('long-press-up', e => {
      const board = document.getElementById('board');
      if (board.classList.contains('hidden')) return;
      for (const td of board.getElementsByTagName('td')) {
        td.style.removeProperty('background-color');
      }
    });

    document.getElementById('epoch').addEventListener('long-press', e => {
      const rating = document.getElementById('rating');
      if (!rating.classList.contains('hidden')) return
      document.getElementById('sizeHint').classList.remove('hidden');
    });

    document.getElementById('epoch').addEventListener('long-press-up', e => {
      document.getElementById('sizeHint').classList.add('hidden');
    });

    document.getElementById('epoch').addEventListener('mouseup', async () => {
      const game = document.getElementById('game');
      let wrapper = document.getElementById('wrapper');
      if (wrapper) game.removeChild(wrapper);

      const rating = document.getElementById('rating');
      if (rating) game.removeChild(rating);
      const sizeHint = document.getElementById('sizeHint');
      if (sizeHint) game.removeChild(sizeHint);

      wrapper = document.createElement('div');
      wrapper.setAttribute('id', 'wrapper');
      wrapper.classList.add('review');

      updateVisibility({hide: ['epoch']});

      const d = SETTINGS.dice.charAt(0).toLowerCase();
      const score = k => STATS.anagrams(k, SETTINGS.dice)[d] || 0;

      const store = new Store('training', SETTINGS.dict);
      const data = await store.get('data');
      const keys = data
        .filter(w => w.e < 2.0) // TODO: !v.c, figure out 2.0 based on average?
        .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
        .map(w => w.k);

      for (const k of keys) {
        const table = document.createElement('table');
        table.classList.add('results');
        addAnagramRows(table, order(STATS.anagrams(k, SETTINGS.dice).words));
        wrapper.appendChild(table);
      }

      game.appendChild(wrapper);
    });

    document.getElementById('practice').addEventListener('click', train);

    document.getElementById('back').addEventListener('click', backClick);

    // TODO: shouldnt work when in score mode or settings!
    document.addEventListener('keydown', e => {
      const board = document.getElementById('board');
      const settings = document.getElementById('settings');
      const define = document.getElementById('define');

      const isBoard = board && board.offsetParent !== null;;
      const isSettings = settings && settings.offsetParent !== null;
      const isDefine = !!define;

      if (board) {
        if (kept) clearWord();
        focusContentEditable(word);
      } else if (isDefine) {
        focusContentEditable(document.getElementById('search'));
      }

      // TODO support 3/4/5 in settings mode
      const key = e.keyCode;
      if (key === 191 && e.shiftKey) {
        e.preventDefault();
        toggleDefine();
      } else if (key === 13 || key === 32) {
        e.preventDefault();
        if (isBoard) {
          play(word);
          focusContentEditable(word);
        } else if (isDefine) {
          const search = document.getElementById('search');
          if (search.textContent) {
            search.textContent = '';
            LAST_DEFINITION = '';
            for (const e of Array.from(define.children)) {
              if (e !== search) define.removeChild(e);
            }
          } else {
            toggleDefine();
          }
        }
      } else if (key === 27 && isDefine) {
        toggleDefine();
      } else if ((key < 65 || key > 90) && key !== 8) {
        e.preventDefault();
      }
    });

    document.addEventListener('swiped-left', toggleDefine);
    document.addEventListener('swiped-right', toggleDefine);
  }

  function setup() {
    if (document.location.hash && document.location.hash.length > 1) {
      const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
      if (!isNaN(seed)) return {settings, seed};
    }

    if (HISTORY.length) {
      const id = HISTORY[HISTORY.length - 1].seed;
      const [settings] = Game.decodeID(id);
      const rand = new Random();
      rand.seed = SEED;
      rand.next();

      return {settings, seed: rand.seed};
    }

    return {settings: SETTINGS, seed: SEED};
  }
})();

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme.toLowerCase());
  document.getElementById(`theme${theme}`).checked = true;
}

function updateVisibility(opts) {
  if (opts.show) {
    for (const id of opts.show) {
      const e = document.getElementById(id);
      if (id === 'timer') {
        e.style.visibility = 'inherit';
      } else if (id === 'score') {
        e.classList.remove('hidden');
        if (SETTINGS.display === 'Full') {
          document.getElementById('full').classList.remove('hidden');
        }
      } else if (id === 'word') {
        e.classList.remove('hidden');
        if (!TOUCH) focusContentEditable(e);
      } else {
        e.classList.remove('hidden');
      }
    }
  }
  if (opts.hide) {
    for (const id of opts.hide) {
      const e = document.getElementById(id);
      if (!e) continue; // nothing to hide
      if (id === 'timer') {
        e.style.visibility = 'hidden';
      } else if (id === 'score') {
        e.classList.add('hidden');
        if (SETTINGS.display === 'Full') {
          document.getElementById('full').classList.add('hidden');
        }
      } else {
        e.classList.add('hidden');
      }
    }
  }
}

function makeCollapsible(title, details, display, fn) {
  const button = document.createElement('button');
  button.setAttribute('type', 'button');
  button.classList.add('collapsible');

  const div = document.createElement('div');

  const titleSpan = document.createElement('span');
  titleSpan.classList.add('title');
  titleSpan.textContent = title;

  const detailsSpan = document.createElement('span');
  detailsSpan.classList.add('details');
  detailsSpan.textContent = details;

  div.appendChild(titleSpan);
  div.appendChild(detailsSpan);
  button.appendChild(div);

  button.addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    if (content.style.display === display) {
      content.style.display = 'none';
    } else {
      if (fn) fn();
      content.style.display = display;
    }
  });

  return button;
}

function backToGame() {
  maybePerformUpdate();

  const game = document.getElementById('game');
  const wrapper = document.getElementById('wrapper');
  if (wrapper) game.removeChild(wrapper);

  updateVisibility({show: ['board', 'word', 'defn', 'refresh', 'score', 'timer'], hide: ['back', 'practice', 'settings']});
}

async function refreshClick() {
  HASH_REFRESH = true;
  document.getElementById('timer').style.visibility = 'inherit';
  STATE = await refresh();
}

function backClick() {
  const wrapper = document.getElementById('wrapper');
  if (wrapper && wrapper.classList.contains('train')) {
    displaySettings();
  } else if (wrapper && wrapper.classList.contains('review')) {
    train();
  } else if (wrapper && wrapper.classList.contains('stats')) {
    document.getElementById('game').removeChild(wrapper);
    document.getElementById('timer').style.visibility = 'inherit';
    updateVisibility({show: ['score']});
    displayScore();
  } else {
    backToGame();
  }
}

async function train(pool) {
  if (!pool || pool.type !== SETTINGS.dict) {
    await withLoader(async () => {
      const store = new Store('training', SETTINGS.dict);
      pool = await TrainingPool.create(
        STATS, SETTINGS.dice, SETTINGS.dict, store, SETTINGS.min);
    });
  }
  HASH_REFRESH = true;

  const game = document.getElementById('game');

  let rating = document.getElementById('rating');
  if (rating) game.removeChild(rating);
  let sizeHint = document.getElementById('sizeHint');
  if (sizeHint) game.removeChild(sizeHint);

  let wrapper = document.getElementById('wrapper');
  if (wrapper) game.removeChild(wrapper);
  updateVisibility({
    show: ['back', 'epoch'],
    hide: ['board', 'word', 'defn', 'timer', 'refresh', 'settings', 'practice', 'score']
  });

  wrapper = document.createElement('div');
  wrapper.setAttribute('id', 'wrapper');
  wrapper.classList.add('train');

  // TODO: rename epoch id...
  document.getElementById('epoch').textContent = pool.size();

  // TODO need to make sure call update, even when navigate away! - need try {} finally or something similar!
  const {label, group, update} = pool.next();
  const trainWord = document.createElement('div');
  trainWord.classList.add('label');
  trainWord.textContent = label;

  sizeHint = document.createElement('div');
  sizeHint.setAttribute('id', 'sizeHint');
  sizeHint.classList.add('hidden');
  sizeHint.textContent = group.length;

  rating = createRatingToggles(update, pool);
  const listener = e => {
    if ([game, wrapper, trainWord, sizeHint].includes(e.target)) {
      game.removeEventListener('click', listener);
      trainWord.classList.add('hidden');
      trainWord.nextElementSibling.classList.remove('hidden');
      rating.classList.remove('hidden');
    }
  };
  game.addEventListener('click', listener);

  const hidden = document.createElement('div');
  hidden.classList.add('hidden');
  const table = document.createElement('table');
  table.classList.add('results');
  addAnagramRows(table, group);
  hidden.appendChild(table);

  wrapper.appendChild(trainWord);
  wrapper.appendChild(hidden);

  game.appendChild(wrapper);
  game.appendChild(sizeHint);
  game.appendChild(rating);
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

function createRatingToggles(update, pool) {
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
      train(pool);
    });
  }

  return toggles;
}

async function refresh(allowDupes, timer, game) {
  maybePerformUpdate();

  if (STATE) {
    const last = HISTORY[HISTORY.length];
    if (last && !Object.keys(last.words).length) HISTORY.pop();
    updateGames(STATE.game);
    HISTORY.push(STATE.game.toJSON());
    PLAYED.add(STATE.game.id);
    await STORE.set('history', HISTORY);
    STATE.timer.stop();
  }

  timer = timer || new Timer(180 * 1000, () => {
    if (!STATE.game.expired) STATE.game.expired = +new Date();
  }, saveGame);

  const random = new Random();
  while (!game || !Object.keys(game.possible).length) {
    random.seed = SEED;
    const id = Game.encodeID(SETTINGS, random.seed);
    if (PLAYED.has(id) && !allowDupes) {
      SEED++;
      continue;
    }
    game = new Game(TRIE, DICT, STATS, random, SETTINGS);
  }

  const content = document.getElementById('content');
  if (content.firstChild) content.removeChild(content.firstChild);

  const table = document.createElement('table');
  table.setAttribute('id', 'board');
  if (game.size > 4) table.classList.add('big');

  for (let row = 0; row < game.size; row++) {
    const tr = document.createElement('tr');
    for (let col = 0; col < game.size; col++) {
      const td = document.createElement('td');
      td.textContent = game.board[row*game.size + col];
      if (td.textContent === 'Qu') td.classList.add('qu');
      if (['M', 'W', 'Z'].includes(td.textContent)) td.classList.add('underline');
      td.classList.add(`rotate${90 * game.random.next(0, 4)}`);
      td.setAttribute('data-x', row);
      td.setAttribute('data-y', col);

      const div = document.createElement('div');
      div.classList.add('target');
      div.setAttribute('data-x', row);
      div.setAttribute('data-y', col);

      td.appendChild(div);
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  SEED = game.random.seed;
  ORIGINAL.seed = SEED;

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
        word.textContent += td.textContent;
      }
    }
  };
  table.addEventListener('touchstart', e => {
    clearWord();
    deselect();
    touched = new Set();

    registerTouch(e);
  });
  table.addEventListener('touchend', () => {
    deselect();
    play(word);
  });
  table.addEventListener('touchmove', registerTouch);

  content.appendChild(table);
  document.getElementById('score').textContent = game.settings.display === 'Hide' ? '?' : game.score.regular;
  if (game.settings.display === 'Full') {
    const state = game.state();
    const p = state.progress;
    const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams}`;
    const score = game.score.regular + game.score.overtime;
    const goal = state.totals[SETTINGS.grade.toLowerCase()];
    document.getElementById('full').textContent =
      `${details} - ${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
  }

  // Cleanup
  LAST = '';
  kept = false;

  updateVisibility({
    show: ['refresh', 'score', 'timer'],
    hide: ['back', 'practice', 'settings']
  });

  const wrapper = document.getElementById('wrapper');
  if (wrapper) document.getElementById('game').removeChild(wrapper);

  const word = document.getElementById('word');
  word.textContent = '';
  word.classList.remove('hidden');
  if (!TOUCH) focusContentEditable(word);
  word.classList.remove('error');
  word.classList.remove('fade');

  const defn = document.getElementById('defn');
  defn.textContent = '';
  defn.classList.remove('hidden');

  timer.start();
  if (document.location.hash !== `#${game.id}`) {
    window.history.replaceState(null, null, `#${game.id}`);
  }

  return {timer, game};
}

function saveGame() {
  localStorage.setItem('current', JSON.stringify({
    last: LAST,
    game: STATE.game,
    timer: STATE.timer.duration - STATE.timer.elapsed
  }));
}

function play(word) {
  let w = word.textContent.toUpperCase();
  if (w.length < 3 || SUFFIXES.includes(w)) {
    w = `${LAST}${w}`;
    word.textContent = w;
  }
  const score = STATE.game.play(w);
  LAST = w;
  saveGame();

  const hide = STATE.game.settings.display === 'Hide';
  kept = true;
  if (!hide && score) {
    const s = STATE.game.score;
    if (STATE.game.settings.display === 'Full') {
      const state = STATE.game.state();
      const p = state.progress;
      const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams}`;
      const score = STATE.game.score.regular + STATE.game.score.overtime;
      const goal = state.totals[SETTINGS.grade.toLowerCase()];
      document.getElementById('full').textContent =
        `${details} - ${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
    }
    const formatted = s.overtime ? `${s.regular} / ${s.overtime}` : `${s.regular}`;
    document.getElementById('score').textContent = formatted;
    document.getElementById('defn').textContent = define(w, DICT);
  } else {
    const o = word.textContent;
    if (!hide && STATE.game.played[w] < 0) word.classList.add('error');
    word.classList.add('fade');
    const animationend = () => {
      clearWord(o);
      word.removeEventListener('animationend', animationend);
    }
    word.addEventListener('animationend', animationend);
  }
}

function clearWord(w) {
  if (w && w !== word.textContent) return;
  word.textContent = '';
  word.classList.remove('error');
  word.classList.remove('fade');
  defn.textContent = '';
  kept = false;
}

function focusContentEditable(element) {
  element.focus();
  document.execCommand('selectAll', false, null);
  const sel = document.getSelection();
  if (sel && !sel.isCollapsed) sel.collapseToEnd();
}

// TODO: add to #seed in settings
function permaFocus(e) {
  e.addEventListener('blur', () => setTimeout(() => focusContentEditable(e), 20));
  focusContentEditable(e);
}

function processHistoryIntoGames() {
  GAMES = [];
  for (let i = HISTORY.length - 1; i >= 0 && GAMES.length < STATS_LIMIT; i--) {
    const game = Game.fromJSON(HISTORY[i], TRIE, DICT, STATS);
    const played = new Set();
    for (const w in game.played) {
      if (game.played[w] > 0) played.add(w);
    }
    GAMES.push([game.possible, played]);
  }
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

function toggleDefine(e) {
  const display = document.getElementById('display');
  const game = document.getElementById('game');

  if (!game.classList.contains('hidden')) {
    const def = document.createElement('div');
    def.setAttribute('id', 'define');

    const search = document.createElement('div');
    search.setAttribute('id', 'search');
    search.contentEditable = true;
    search.textContent = LAST_DEFINITION;

    def.appendChild(search);
    display.appendChild(def);

    const updateDetails = word => {
      if (DICT[word]) {
        const defn = getOrCreateElementById('defineDefinition', 'div');
        defn.textContent = define(word, DICT);
        if (!isValid(word, DICT, SETTINGS.dict) || word.length < SETTINGS.min) {
          def.classList.add('hard');
        } else {
          def.classList.remove('hard');
        }

        const stats = getOrCreateElementById('defineStats', 'table');
        while (stats.firstChild) stats.removeChild(stats.firstChild);
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

        const s = STATS.stats(word, SETTINGS.dice, SETTINGS.type);

        let tr = document.createElement('tr');
        addCells(tr, 'Grade', s.grade === ' ' ? 'S' : s.grade);
        addCells(tr, 'Score', s.word ? s.word.p : '-');
        stats.appendChild(tr);

        tr = document.createElement('tr');
        addCells(tr, 'Frequency', s.freq ? s.freq : '-');
        addCells(tr, 'Anagram',  s.anagram ? s.anagram.p : '-');
        stats.appendChild(tr);

        stats.appendChild(tr);

        def.appendChild(defn);
        def.appendChild(stats);
      } else {
        removeChildById(def, 'defineDefinition');
        removeChildById(def, 'defineStats');
      }
      def.appendChild(displayAnagrams(word, w => {
        w = w.toUpperCase();
        search.textContent = w.toUpperCase();
        LAST_DEFINITION = w;
        updateDetails(w);
        correctFocus();
      }));
    };

    def.addEventListener('input', e => {
      const word = search.textContent.toUpperCase();
      LAST_DEFINITION = word;
      updateDetails(word);
    });
    updateDetails(LAST_DEFINITION);
    permaFocus(search);
  } else {
    display.removeChild(document.getElementById('define'));
  }
  game.classList.toggle('hidden');
  correctFocus();
}

function displayAnagrams(word, fn) {
  const div = getOrCreateElementById('defineAnagrams', 'div', true);
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

function getOrCreateElementById(id, type, clear) {
  let element = document.getElementById(id);
  if (element) {
    if (!clear) return element;
    element.parentNode.removeChild(element);
  }
  element = document.createElement(type);
  element.setAttribute('id', id);
  return element;
}

function removeChildById(element, id) {
  const child = document.getElementById(id)
  if (!child) return;
  return element.removeChild(child);
}

function correctFocus() {
  if (TOUCH) return;
  const board = document.getElementById('board');
  const settings = document.getElementById('settings');

  if (board && !board.classList.contains('hidden')) {
    focusContentEditable(document.getElementById('word'))
  } else if (settings && !settings.classList.contains('hidden')) {
    focusContentEditable(document.getElementById('seed'))
  }
}

function displayStats() {
  if (!GAMES) processHistoryIntoGames();
  const data = STATS.history(GAMES, SETTINGS.dice, SETTINGS.dict);

  const game = document.getElementById('game');

  let wrapper = document.getElementById('wrapper');
  // Coming in from score, wrapper is already present, but check anyway
  if (wrapper) game.removeChild(wrapper);
  wrapper = createElementWithId('div', 'wrapper');
  wrapper.classList.add('stats');
  document.getElementById('timer').style.visibility = 'hidden';
  updateVisibility({hide: ['score']});

  const {words, anadromes, anagrams} = data;
  const link = w => {
    const b = document.createElement('b');
    b.textContent = w;
    b.addEventListener('click', () => {
      LAST_DEFINITION = w.toUpperCase();
      toggleDefine();
    });
    return b;
  };

  const display = view => {
    let table = document.getElementById('stats');
    if (table) wrapper.removeChild(table);
    table = createElementWithId('table', 'stats');

    if (view === 'ANADROMES') {
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
    } else if (view === 'WORDS') {
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
    } else /* view === 'ANAGRAMS' */ {
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
            td.appendChild(document.createElement('br')); // TODO i?
            together = [];
          }
        }

        tr.appendChild(td);
        table.appendChild(tr);
      }
    }
    wrapper.append(table);
  };

  const control = document.createElement('div');
  control.classList.add('row');
  control.appendChild(createRadios('statsSelect', ['ANADROMES', ['WORDS'], 'ANAGRAMS'], function() { display(this.value) }))

  wrapper.append(control);
  display('WORDS');
  game.appendChild(wrapper);
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

function createElementWithId(type, id) {
  const element = document.createElement(type);
  element.setAttribute('id', id);
  return element;
}

async function withLoader(asyncFn) {
  const game = document.getElementById('game');
  game.classList.add('hidden');

  const display = document.getElementById('display');
  const loader = createElementWithId('div', 'loader');
  const spinner = createElementWithId('div', 'spinner');
  loader.appendChild(spinner);
  display.appendChild(loader);

  await asyncFn();

  display.removeChild(loader);
  game.classList.remove('hidden');
}