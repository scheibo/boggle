import {global} from './global';
import {UI, View} from './ui';
import { Game, GameJSON, SUFFIXES } from '../game';
import { Timer, TimerJSON} from '../timer';
import {Random} from '../random';
import {ScorePane} from './score';
import {define} from '../dict';

const DURATION = 180 * 1000;

interface BoardJSON {
  last: string;
  kept: boolean;
  timer: TimerJSON;
  game?: GameJSON;
}

export class BoardView implements View {
  last: string;
  kept: boolean;
  timer: Timer;
  game: GameJSON | Game | undefined;

  played!: Set<string>;

  timerDisplay: HTMLElement;
  container!: HTMLElement;
  score!: HTMLElement;
  full!: HTMLElement;
  word!: HTMLElement;
  defn!: HTMLElement;
  tds!: Set<HTMLTableCellElement>;

  constructor(json?: BoardJSON) {
    this.last = json ? json.last : '';
    this.kept = json ? json.kept : false;
    this.game = json ? json.game : undefined;
    const {display, timer} = json ?
      this.createTimer(json.timer.duration, json.timer.elapsed) :
      this.createTimer();
    this.timer = timer;
    this.timerDisplay = display;
  }

  toJSON(): BoardJSON {
    return {
      last: this.last,
      kept: this.kept,
      timer: this.timer.toJSON(),
      game: this.game && ('random' in this.game ? this.game.toJSON() : this.game),
    };
  }

  async attach(data: {resume?: true | 'return', allowDupes?: boolean} = {}) {
    await Promise.all([global.LOADED.DICT, global.LOADED.TRIE(), global.LOADED.STATS(), global.LOADED.HISTORY]);

    if (!this.played) {
      this.played = new Set();
      for (const h of global.HISTORY) this.played.add(h.seed);
    }

    if (!this.game || !data.resume) {
      if (this.game) { // TODO may be non serialized!
        this.timer.stop();
        this.played.add(this.game.id);
        if (Object.values(this.game.played).filter(t => t > 0).length) {
          this.updateGames();
          global.HISTORY.push(this.game.toJSON());
          await global.STORE.set('history', global.HISTORY);
        }
      }

      let game;
      const random = new Random();
      while (!game || !Object.keys(game.possible).length) {
        random.seed = global.SEED;
        const id = Game.encodeID(global.SETTINGS, random.seed);
        if (this.played.has(id) && !data.allowDupes) {
          global.SEED++;
          continue;
        }
        game = new Game(global.TRIE, global.DICT, global.STATS, random, global.SETTINGS);
      }
      this.game = game;

      const {display, timer} = this.createTimer();
      this.timer = timer;
      this.timerDisplay = display;

      this.last = '';
      this.kept = false;
    } else if (!('random' in this.game)) {
      this.game = Game.fromJSON(this.game, global.TRIE, global.DICT, global.STATS);
    }
    global.SEED = this.game.random.seed; // FIXME: seed no longer reflect games seed....

    this.container = UI.createElementWithId('div', 'game');

    const back = UI.createBackButton(() => UI.toggleView('Menu'));
    back.addEventListener('long-press', () => this.refresh());

    this.score = UI.createElementWithId('div', 'score');
    this.score.addEventListener('mouseup', () => {
      const pane = new ScorePane(this);
      // We don't detach() because switching to score doesn't pause the timer!
      UI.root.removeChild(this.container);
      UI.root.appendChild(pane.attach());
    });
    this.score.addEventListener('long-press', () => this.onLongPress());
    this.score.addEventListener('long-press-up', () => this.onLongPressUp());
    this.displayScore();

    this.container.appendChild(UI.createTopbar(back, this.timerDisplay, this.score));

    this.full = UI.createElementWithId('div', 'full');
    this.container.appendChild(this.full);

    this.container.appendChild(this.renderBoard());

    this.word = UI.createElementWithId('div', 'word');
    this.word.classList.add('word');
    if (!(('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0))) {
      this.word.contentEditable = 'true';
    }
    this.container.appendChild(this.word);
    this.defn = UI.createElementWithId('div', 'defn');
    this.defn.classList.add('definition')
    this.container.appendChild(this.defn);

    if (data.resume !== 'return') this.timer.start(); // FIXME: don't restart when coming back from score if paused!
    const hash = `#${this.game.id}`;
    if (document.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }

    return this.container;
  }

  renderBoard() {
    const game = this.game as Game;
    const content = UI.createElementWithId('div', 'foo');
    const table = UI.createElementWithId('table', 'board');
    if (game.size > 4) table.classList.add('big');

    this.tds = new Set();
    const random = new Random(game.seed);
    for (let row = 0; row < game.size; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < game.size; col++) {
        const td = document.createElement('td');
        td.textContent = game.board[row * game.size + col];
        if (td.textContent === 'Qu') td.classList.add('qu');
        if (['M', 'W', 'Z'].includes(td.textContent)) td.classList.add('underline');
        td.classList.add(`rotate${90 * random.next(0, 4)}`);
        td.setAttribute('data-x', String(row));
        td.setAttribute('data-y', String(col));

        const div = document.createElement('div');
        div.classList.add('target');
        div.setAttribute('data-x', String(row));
        div.setAttribute('data-y', String(col));

        td.appendChild(div);
        tr.appendChild(td);
        this.tds.add(td);
      }
      table.appendChild(tr);
    }

    let touched: Set<HTMLTableCellElement>;
    const deselect = () => {
      if (!touched) return;
      for (const td of touched) {
        td.classList.remove('selected');
      }
    };

    const registerTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      const cell = document.elementFromPoint(touch.clientX, touch.clientY);
      if (cell && cell.matches('.target')) {
        const td = cell.parentNode as HTMLTableCellElement;
        td.classList.add('selected');
        if (!touched.has(td)) {
          touched.add(td);
          this.word.textContent += td.textContent!;
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
    UI.permaFocus(this.word);
  }

  detach() {
    this.timer.pause(); // TODO not if going to score or define!!!
    return this.container;
  }

  async refresh(data?: {resume?: boolean, allowDupes?: boolean}) {
    UI.persist();
    await UI.detachView('Board');
    await UI.attachView('Board', data);
  }

  play() {
    const game = this.game as Game;
    let w = (this.word.textContent || '').toUpperCase();
    if (w.length < 3 || SUFFIXES.includes(w)) {
      w = `${this.last}${w}`;
      this.word.textContent = w;
    }
    const score = game.play(w);
    this.last = w;
    UI.persist();

    const hide = game.settings.display === 'Hide';
    this.kept = true;
    if (!hide && score) {
      this.displayScore();
      this.defn.textContent = define(w, global.DICT);
    } else {
      const original = this.word.textContent || undefined;
      if (!hide && game.played[w] < 0) this.word.classList.add('error');
      this.word.classList.add('fade');
      const listener = () => {
        this.clear(original);
        this.word.removeEventListener('animationend', listener);
      }
      this.word.addEventListener('animationend', listener);
    }
  }

  displayScore() {
    const game = this.game as Game;
    if (game.settings.display === 'Hide') {
      this.score.textContent = '?';
      return;
    }

    if (game.settings.display === 'Full') {
      const state = game.state();
      const p = state.progress;
      const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams}`;
      const score = game.score.regular + game.score.overtime;
      const goal = state.totals[global.SETTINGS.grade.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
      this.full.textContent = `${details} - ${score}/${goal} (${Math.round(score / goal * 100).toFixed(0)}%)`;
    }

    const s = game.score;
    this.score.textContent = s.overtime ? `${s.regular} / ${s.overtime}` : `${s.regular}`;
  }

  clear(w?: string) {
    if (w && w !== this.word.textContent) return;
    this.word.textContent = '';
    this.word.classList.remove('error');
    this.word.classList.remove('fade');
    this.defn.textContent = '';
    this.kept = false;
  }

  createTimer(duration = DURATION, elapsed = 0) {
    const display = UI.createElementWithId('div', 'timer');
    display.addEventListener('click', () => this.timer.pause());
    return {display, timer: new Timer(display, duration, elapsed, () => {
      if (this.game && !this.game.expired) {
        this.game.expired = +new Date();
      }
    }, () => UI.persist())};
  }

  updateGames() {
    if (!global.GAMES) return;

    const game = this.game as Game;
    const played = new Set<string>();
    for (const w in game.played) {
      if (game.played[w] > 0) played.add(w);
    }
    if (!played.size) return;

    if (global.GAMES.length >= global.LIMIT) global.GAMES.shift();
    global.GAMES.push([game.possible, played]);
  }

  onLongPress() {
    const game = this.game as Game;
    const size = game.size;
    const weights = [];
    for (let row = 0; row < size; row++) {
      const a = [];
      for (let col = 0; col < size; col++) {
        a.push(0);
      }
      weights.push(a);
    }
    let total = 0;
    for (const word in game.possible) {
      if (game.played[word]) continue;
      const score = Game.score(word);
      total += score;
      for (const p of game.possible[word]) {
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

  async onKeyDown(e: KeyboardEvent) {
    if (this.kept) this.clear();
    UI.focusContentEditable(this.word);
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      e.preventDefault();
      this.play();
      UI.focusContentEditable(this.word);
    } else if (key === 27) {
      await UI.toggleView('Define');
    } else if ((key < 65 || key > 90) && key !== 8) {
      e.preventDefault();
    }
  }
}
