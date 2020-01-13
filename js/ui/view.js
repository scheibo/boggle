'use strict';

const HISTORY = JSON.parse(localStorage.getItem('history')) || [];
const SETTINGS = JSON.parse(localStorage.getItem('settings')) || {dice: 'New', dict: 'TWL', grade: 'C'};

var STATE = null;
var RANDOM = null;
var TRAINING = null;
var DICT = null;
var TRIE = null;
var HASH_REFRESH = true;
var SEED = 0;
var ORIGINAL = {settings: Object.assign({}, SETTINGS), seed: SEED};
var LAST = '';

let kept = false;

(async () => {
  setTimeout(() => window.scrollTo(0, 1), 0);

  const response = await fetch('data/dict.json', {mode: 'no-cors'});
  DICT = await response.json();
  TRIE = Trie.create(DICT);

  const initial = setup();
  SEED = initial.seed;
  RANDOM = new Random(SEED);
  Object.assign(SETTINGS, initial.settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
  TRAINING = new TrainingPool(DICT, RANDOM, SETTINGS);

  document.getElementById('display').removeChild(document.getElementById('loader'));
  document.getElementById('game').classList.remove('hidden');

  STATE = refresh();

  const TOUCH = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) || 
    (navigator.msMaxTouchPoints > 0);

  const menu = document.getElementById('menu');
  const word = document.getElementById('word');
  const defn = document.getElementById('defn');
  if (!TOUCH) {
    word.contentEditable = true;
    word.focus();
  }

  window.addEventListener('hashchange', e => {
    if (!document.location.hash) return;
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (!isNaN(seed)) {
      updateSettings(settings);
      SEED = seed;
    }
    if (HASH_REFRESH) {
      STATE = refresh();
    } else {
      updateDOMSettings();
    }
  });

  document.getElementById('refresh').addEventListener('mouseup', refreshClick);

  document.getElementById('timer').addEventListener('click', () => {
    STATE.timer.pause();
  });

  document.getElementById('score').addEventListener('long-press', e => {
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

    for (const td of document.getElementById('board').getElementsByTagName('td')) {
      const w = weights[Number(td.dataset.x)][Number(td.dataset.y)] / total;
      td.style.backgroundColor = `rgba(255,0,0,${w})`;
    }
  });

  document.getElementById('score').addEventListener('long-press-up', e => {
    for (const td of document.getElementById('board').getElementsByTagName('td')) {
      td.style.removeProperty('background-color');
    }
  });

  document.getElementById('practice').addEventListener('click', train);

  document.getElementById('play').addEventListener('click', () => {
    const display = document.getElementById('display');
    const board = document.getElementById('board');
    const wrapper = document.getElementById('wrapper');

    if (wrapper) display.removeChild(wrapper);

    board.classList.remove('hidden');
    word.classList.remove('hidden');
    defn.classList.remove('hidden');

    updateVisibility({show: ['refresh', 'score', 'timer'], hide: ['back', 'play']});

    STATE = refresh();
  });

  document.getElementById('back').addEventListener('click', backToGame);

  // TODO: shouldnt work when in score mode or settings!
  document.addEventListener('keydown', e => {
    if (kept) clearWord();
    word.focus(); // TODO: fix cursor locaton
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      play(word);
      e.preventDefault(); 
      word.focus();
    } else if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  });

  function setup() {
    if (document.location.hash && document.location.hash.length > 1) {
      const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
      if (!isNaN(seed)) return {settings, seed};
    }

    if (HISTORY.length) {
      const id = HISTORY[HISTORY.length - 1].seed;
      const [settings, seed] = Game.decodeID(id);
      const rand = new Random(seed);
      rand.next();

      return {settings, seed: rand.seed};
    }

    return {settings: SETTINGS, seed: SEED};
  }
})();

function updateVisibility(opts) {
  if (opts.show) {
    for (const id of opts.show) {
      const e = document.getElementById(id);
      if (id === 'timer') {
        e.style.visibility = 'inherit';
      } else {
        e.classList.remove('hidden');
      }
    }
  }
  if (opts.hide) {
    for (const id of opts.hide) {
      const e = document.getElementById(id);
      if (id === 'timer') {
        e.style.visibility = 'hidden';
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

  const display = document.getElementById('display');
  const board = document.getElementById('board');
  const wrapper = document.getElementById('wrapper');

  // TODO FIXME: hide instead of remove to avoid recompute...
  if (wrapper) display.removeChild(wrapper);

  board.classList.remove('hidden');
  word.classList.remove('hidden');
  defn.classList.remove('hidden');

  updateVisibility({show: ['refresh', 'score', 'timer'], hide: ['back', 'practice', 'settings']});
}

function refreshClick() {
  HASH_REFRESH = true;

  if (document.getElementById('wrapper')) {
    train();
  } else {
    document.getElementById('timer').style.visibility = 'inherit';
    STATE = refresh();
  }
}

function train() {
  HASH_REFRESH = true;
  maybePerformUpdate();

  let wrapper = document.getElementById('wrapper');
  const display = document.getElementById('display');
  const board = document.getElementById('board');
  if (wrapper) {
    display.removeChild(wrapper);
  } else {
    document.getElementById('timer').style.visibility = 'hidden';

    board.classList.add('hidden');
    word.classList.add('hidden');
    defn.classList.add('hidden');

    updateVisibility({show: ['refresh', 'play'], hide: ['settings', 'back', 'practice']});
  }

  wrapper = document.createElement('div');
  wrapper.setAttribute('id', 'wrapper');
  wrapper.classList.add('train');

  for (const {label, group} of TRAINING.next()) {
    const button = makeCollapsible(label, '', 'table');
    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    for (const w of group) {
      const word = DICT[w];
      const tr = document.createElement('tr');
      const grade = Game.grade(w, DICT, SETTINGS.dice, SETTINGS.dict);
      if (grade < SETTINGS.grade) tr.classList.add('hard');

      let td = document.createElement('td');
      const b = document.createElement('b');
      b.textContent = w;
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = word.defn;
      tr.appendChild(td);

      table.appendChild(tr);
    }
    wrapper.appendChild(button);
    wrapper.appendChild(table);
  }

  display.appendChild(wrapper);
}

function refresh() {
  maybePerformUpdate();

  if (STATE) {
    HISTORY.push(STATE.game.toJSON());
    localStorage.setItem('history', JSON.stringify(HISTORY));
    STATE.timer.stop();
  }

  const timer = new Timer(180 * 1000, () => {
    if (!STATE.game.expired) STATE.game.expired = +new Date();
  });
  const game = new Game(TRIE, DICT, new Random(SEED), SETTINGS);
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
  let lastTouched = null;
  const deselect = () => {
    if (!touched) return;
    for (const td of touched) {
      td.classList.remove('selected');
    }
  };

  // TODO: use...
  const adjacent = (a, b) =>
    Math.abs(b.dataset.x - a.dataset.x) <= 1 && Math.abs(b.dataset.y - a.dataset.y) <= 1;

  const registerTouch = e => {
    const touch = e.touches[0];
    const cell = document.elementFromPoint(touch.clientX, touch.clientY);
    if (cell && cell.matches('.target')) {
      // TODO: make sure is adjacent to last td!
      /* if (lastTouched && !adjacent(cell, lastTouched)) {
          deselect();
          play(word);
        } */
      const td = cell.parentNode;
      td.classList.add('selected');
      if (!touched.has(td)) {
        touched.add(td);
        lastTouched = cell;
        word.textContent += td.textContent;
      }
    }
  };
  table.addEventListener('touchstart', e => {
    clearWord();
    deselect();
    touched = new Set();
    lastTouched = null;

    registerTouch(e);
  });
  table.addEventListener('touchend', () => {
    deselect();
    play(word);
  });
  table.addEventListener('touchmove', registerTouch);

  content.appendChild(table);
  document.getElementById('score').textContent = game.settings.blind ? '?' : '0';

  // Cleanup
  LAST = '';
  kept = false;

  updateVisibility({
    show: ['refresh', 'score', 'timer'],
    hide: ['back', 'practice', 'settings']
  });

  const wrapper = document.getElementById('wrapper');
  if (wrapper) document.getElementById('display').removeChild(wrapper);

  const word = document.getElementById('word');
  word.textContent = '';
  word.classList.remove('hidden');
  word.classList.remove('error');
  word.classList.remove('fade');

  const defn = document.getElementById('defn');
  defn.textContent = '';
  defn.classList.remove('hidden');

  timer.start();
  if (document.location.hash !== `#${game.id}`) {
    window.history.pushState(null, null, `#${game.id}`);
  }

  return {timer, game};
}

function play(word) {
  let w = word.textContent.toUpperCase();
  if (w.length < 3 || SUFFIXES.includes(w)) {
    w = `${LAST}${w}`;
    word.textContent = w;
  }
  const score = STATE.game.play(w);
  LAST = w;

  const display = !STATE.game.settings.blind && score;
  kept = true;
  if (display) {
    const s = STATE.game.score;
    const formatted = s.overtime ? `${s.regular} / ${s.overtime}` : `${s.regular}`;
    document.getElementById('score').textContent = formatted;
    document.getElementById('defn').textContent = DICT[w].defn;
  } else {
    const o = word.textContent;
    if (!STATE.game.settings.blind && STATE.game.played[w] < 0) word.classList.add('error');
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
