var LAST = '';
var LAST_DEFINITION = '';

let kept = false;

const TOUCH = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0);

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
fn(existing);

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