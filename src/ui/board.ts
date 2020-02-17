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
          this.updateGames();
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

  updateGames() {
    if (!GAMES) return;

    const played = new Set();
    for (const w in this.game.played) {
      if (this.game.played[w] > 0) played.add(w);
    }
    if (!played.size) return GAMES;

    if (GAMES.length >= LIMIT) GAMES.shift();
    GAMES.push([this.game.possible, played]);
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
