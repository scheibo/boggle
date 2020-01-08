if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('Service worker registered.', reg);
    });
  });
}

const HISTORY = JSON.parse(localStorage.getItem('history')) || [];
const SETTINGS = JSON.parse(localStorage.getItem('settings')) || {dice: 'New', dict: 'TWL', grade: 'C'};
var STATE = null;

class Timer {
  constructor(duration) {
    this.elapsed = 0;
    this.duration = duration;
    this.display = document.getElementById('timer');
    this.display.classList.remove('expired');
    this.interval = null;
    this.paused = null;
  }

  start() {
    if (!this.elapsed) {
      this.begin = new Date().getTime();
      this.last = this.begin;
      this.interval = setInterval(() => this.update(), 100);
    }
  }

  stop() {
    if (this.interval) {
      this.interval = clearInterval(this.interval);
      this.inteval = null;
    }
  }

  pause() {
    if (this.interval) {
      this.interval = clearInterval(this.interval);
      this.interval = null;
      this.begin = new Date().getTime();
      this.elapsed += this.begin - this.last;
      this.last = this.begin;
    } else {
      this.begin = new Date().getTime();
      this.last = this.begin;
      this.interval = setInterval(() => this.update(), 100);
    }
  }

  expired() {
    return this.elapsed >= this.duration;
  }

  update() {
    const now = new Date().getTime();
    this.elapsed += now - this.last;
    this.last = now;

    let distance;
    if (this.expired()) {
      this.display.classList.add('expired');
      distance = this.elapsed - this.duration;
      if (!STATE.game.expired) STATE.game.expired = +new Date();
    } else {
      distance = this.duration - this.elapsed;
    }

    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = `${Math.floor((distance % (1000 * 60)) / 1000)}`.padStart(2, '0');

    this.display.textContent = `${minutes}:${seconds}`;
  }
}

function setup() {
  if (document.location.hash && document.location.hash.length > 1) {
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (!isNaN(seed)) return [settings, seed];
  }

  if (HISTORY.length) {
    const id = HISTORY[HISTORY.length - 1].seed;
    const [settings, seed] = Game.decodeID(id);
    const rand = new Random(seed);
    rand.next();

    return [settings, rand.seed];
  }

  return [SETTINGS, 0];
}

(async () => {
  setTimeout(() => window.scrollTo(0, 1), 0);

  const response = await fetch('data/dict.json', {mode: 'no-cors'});
  const DICT = await response.json();

  const [settings, SEED] = setup();
  const RANDOM = new Random(SEED); // used by train
  Object.assign(SETTINGS, settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));

  document.getElementById('display').removeChild(document.getElementById('loader'));
  document.getElementById('game').classList.remove('hidden');

  const TRIE = new Trie(DICT);

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

  let kept = false;
  const clearWord = w => {
    if (w && w !== word.textContent) return;
    word.textContent = '';
    word.classList.remove('error');
    word.classList.remove('fade');
    defn.textContent = '';
    kept = false;
  };

  // TODO: use...
  function adjacent(a, b) {
    return Math.abs(b.dataset.x - a.dataset.x) <= 1 && Math.abs(b.dataset.y - a.dataset.y) <= 1;
  }

  function refresh(state, settings, seed) {
    let random;
    if (state) {
      HISTORY.push(state.game.toJSON());
      localStorage.setItem('history', JSON.stringify(HISTORY));
      state.timer.stop();
      random = state.game.random;
    }

    const timer = new Timer(180 * 1000);
    random = !isNaN(seed) ? new Random(seed) : (random || new Random(SEED));
    const game = new Game(TRIE, DICT, random, settings);
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
        td.classList.add(`rotate${90 * random.next(0, 4)}`);
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
    
    let touched;
    let lastTouched = null;
    const deselect = () => {
      if (!touched) return;
      for (const td of touched) {
        td.classList.remove('selected');
      }
    };
    table.addEventListener('touchstart', () => {
      clearWord();
      deselect();
      touched = new Set();
      lastTouched = null;
    });
    table.addEventListener('touchend', () => {
      deselect();
      play(STATE, word);
    });
    table.addEventListener('touchmove', e => {
      const touch = e.touches[0];
      const cell = document.elementFromPoint(touch.clientX, touch.clientY);
      if (cell && cell.matches('.target')) {
        // TODO: make sure is adjacent to last td!
        /* if (lastTouched && !adjacent(cell, lastTouched)) {
          deselect();
          play(STATE, word);
        } */
        const td = cell.parentNode;
        td.classList.add('selected');
        if (!touched.has(td)) {
          touched.add(td);
          lastTouched = cell;
          word.textContent += td.textContent;
        }
      }
    });

    content.appendChild(table);
    document.getElementById('score').textContent = game.settings.blind ? '?' : '0';

    // Cleanup
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

  function formatScore(score) {
    return score.overtime ? `${score.regular} / ${score.overtime}` : `${score.regular}`;
  }

  function play(state, word) {
    const w = word.textContent.toUpperCase();
    const score = state.game.play(w);
    const display = !state.game.settings.blind && score;
    kept = true;
    if (display) {
      document.getElementById('score').textContent = formatScore(state.game.score);
      document.getElementById('defn').textContent = DICT[w].defn;
    } else {
      const o = word.textContent;
      if (!state.game.settings.blind && state.game.played[w] < 0) word.classList.add('error');
      word.classList.add('fade');
      const animationend = () => {
        clearWord(o);
        word.removeEventListener('animationend', animationend);
      }
      word.addEventListener('animationend', animationend);
    }
  }

  window.addEventListener('hashchange', e => {
    if (!document.location.hash) return; // is just a reload...
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));

    if (!isNaN(seed)) {
      Object.assign(SETTINGS, settings);
      localStorage.setItem('settings', JSON.stringify(SETTINGS));
    }

    STATE = refresh(STATE, settings, seed);
  });

  document.getElementById('refresh').addEventListener('mouseup', () => {
    if (document.getElementById('wrapper')) {
      train();
    } else {
      document.getElementById('timer').style.visibility = 'inherit';
      STATE = refresh(STATE);
    }
  });

  document.getElementById('refresh').addEventListener('long-press', e => {
    const wrapper = document.getElementById('wrapper');

    if (wrapper) display.removeChild(wrapper);

    document.getElementById('refresh').classList.add('hidden');
    document.getElementById('back').classList.remove('hidden');

    document.getElementById('timer').style.visibility = 'inherit';

    document.getElementById('practice').classList.remove('hidden');
    document.getElementById('play').classList.add('hidden');
    document.getElementById('score').classList.add('hidden');

    document.getElementById('settings').classList.remove('hidden');

    document.getElementById('seed').textContent = STATE.game.id;

    const board = document.getElementById('board');
    board.classList.add('hidden');
    word.classList.add('hidden');
    defn.classList.add('hidden');
  });

  document.getElementById('timer').addEventListener('click', () => {
    STATE.timer.pause();
  });

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

  function displayPlayed(state, div, expanded) {
    const p = state.progress;
    const details = `${p.suffixes}/${p.subwords}/${p.anagrams}/${p.invalid} (${p.total})`;

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

  function displayPossible(state, div, expanded) {
    const tot = state.totals;
    const details = `${tot.d}/${tot.c}/${tot.b}/${tot.a} (${tot.s})`;

    const button = makeCollapsible('POSSIBLE', details, 'table');
    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    table.classList.add('possible');

    for (const {word, grade, overtime, missing, defn} of state.remaining) {
      const tr = document.createElement('tr');
      if (grade < SETTINGS.grade) tr.classList.add('hard');
      if (overtime) tr.classList.add('overtime');

      let td = document.createElement('td');
      const b = document.createElement('b');
      if (missing) b.classList.add('underline');
      b.textContent = word;
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

  function separate(obj, fn) {
    const grouped = [];
    const solo = [];
    for (const [k, group] of Object.entries(obj)) {
      const gs = group.filter(w => fn(Game.grade(w, DICT, SETTINGS.dice, SETTINGS.dict)));

      if (gs.length > 1) {
        for (const g of gs) {
          if (RANDOM.next(0, k.length) < 1) grouped.push(k);
        }
      } else {
        if (RANDOM.next(0, Math.pow(k.length, 2.7)) < k.length) solo.push(k);
      }
    }
    return [grouped, solo];
  }

  function trainingGroups() {
    const less = {};
    const equal = {};
    for (const word in DICT) {
      if (SETTINGS.dict === 'TWL' && !DICT[word].twl) continue;
      const grade = Game.grade(word, DICT, SETTINGS.dice, SETTINGS.dict);
      const anagram = word.split('').sort().join('');

      let obj;
      if (equal[anagram]) {
        obj = equal;
      } else if (less[anagram]) {
        obj = less;
      } else if (grade < SETTINGS.grade) {
        continue;
      } else {
        obj = grade === SETTINGS.grade ? equal : less;
      }

      obj[anagram] = (obj[anagram] || []);
      obj[anagram].push(word);
    }

    const [groupLessKeys, soloLessKeys] = separate(less, g => g > SETTINGS.grade);
    const [groupEqualKeys, soloEqualKeys] = separate(equal, g => g >= SETTINGS.grade);

    const groups = [];
    let lessKeys, equalKeys;
    for (let i = 0; i < 100; i++) {
      if (RANDOM.next(0, 100) < 90) {
        lessKeys = groupLessKeys;
        equalKeys = groupEqualKeys;
      } else {
        lessKeys = soloLessKeys;
        equalKeys = soloEqualKeys;
      }

      let key, group;
      if (lessKeys.length && RANDOM.next(0, 100) < 80) {
        key = RANDOM.sample(lessKeys, true);
        group = less[key];
      } else {
        key = RANDOM.sample(equalKeys, true);
        group = equal[key];
      }
      if (!key) break; // in case we somehow ran out of words!

      // try to find a permutation which isn't in the group
      for (let i = 0; i < 10; i++) {
        key = RANDOM.shuffle(key.split('')).join('');
        if (!group.includes(key)) break;
      }

      groups.push({label: key, group: RANDOM.shuffle(group)});
    }

    return groups;
  }

  function train() {
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

      document.getElementById('settings').classList.add('hidden');
      document.getElementById('refresh').classList.remove('hidden');
      document.getElementById('back').classList.add('hidden');
      document.getElementById('play').classList.remove('hidden');
      document.getElementById('practice').classList.add('hidden');
    }

    wrapper = document.createElement('div');
    wrapper.setAttribute('id', 'wrapper');
    wrapper.classList.add('train');

    for (const {label, group} of trainingGroups()) {
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

  document.getElementById('practice').addEventListener('click', train);

  document.getElementById('play').addEventListener('click', () => {
    const display = document.getElementById('display');
    const board = document.getElementById('board');
    const wrapper = document.getElementById('wrapper');

    if (wrapper) display.removeChild(wrapper);

    board.classList.remove('hidden');
    word.classList.remove('hidden');
    defn.classList.remove('hidden');

    document.getElementById('refresh').classList.remove('hidden');
    document.getElementById('back').classList.add('hidden');
    document.getElementById('play').classList.add('hidden');
    document.getElementById('score').classList.remove('hidden');
    document.getElementById('timer').style.visibility = 'inherit';

    STATE = refresh(STATE);
  });

  document.getElementById('score').addEventListener('mouseup', () => {
    const wrapper = document.getElementById('wrapper');
    if (!wrapper) {
      const display = document.getElementById('display');
      const board = document.getElementById('board');
      board.classList.add('hidden');
      word.classList.add('hidden');
      defn.classList.add('hidden');
      document.getElementById('refresh').classList.add('hidden');
      document.getElementById('back').classList.remove('hidden');

      const wrapper = document.createElement('div');
      wrapper.setAttribute('id', 'wrapper');
      wrapper.classList.add('score');

      const state = STATE.game.state();
      const score = STATE.game.score.regular + STATE.game.score.overtime;
      const goal = state.totals[SETTINGS.grade.toLowerCase()];
      const details = `${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
      const current = makeCollapsible(STATE.game.toJSON().seed, details, 'block');
      const div = document.createElement('div');
      div.classList.add('collapsible-content');
      displayPlayed(state, div, true);
      displayPossible(state, div);
      wrapper.appendChild(current);
      wrapper.appendChild(div);
      // Start off with played expanded
      current.classList.add('active');
      div.style.display = 'block';

      for (let i = HISTORY.length - 1; i > 0; i--) {
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
            const game = Game.fromJSON(state, TRIE, DICT);
            const s = game.state();
            displayPlayed(s, div);
            displayPossible(s, div);
          }
        });
        wrapper.appendChild(button);
        wrapper.appendChild(div);
      }

      display.appendChild(wrapper);
    } else {
      backToGame();
    }
  });

  document.getElementById('back').addEventListener('click', backToGame);

  function backToGame() {
    const display = document.getElementById('display');
    const board = document.getElementById('board');
    const wrapper = document.getElementById('wrapper');

    // TODO FIXME: hide instead of remove to avoid recompute...
    if (wrapper) display.removeChild(wrapper);

    board.classList.remove('hidden');
    word.classList.remove('hidden');
    defn.classList.remove('hidden');
    document.getElementById('refresh').classList.remove('hidden');
    document.getElementById('score').classList.remove('hidden');
    document.getElementById('timer').style.visibility = 'inherit';
    document.getElementById('back').classList.add('hidden');
    document.getElementById('practice').classList.add('hidden');
    document.getElementById('settings').classList.add('hidden');
  }

  // TODO: shouldnt work when in score mode or settings!
  document.addEventListener('keydown', e => {
    if (kept) clearWord();
    word.focus(); // TODO: fix cursor locaton
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      play(STATE, word);
      e.preventDefault(); 
      word.focus();
    } else if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  });
})();