import { global } from './global';
import { UI, View } from './ui';
import { Game, GameJSON, SUFFIXES } from '../game';
import { Timer, TimerJSON } from '../timer';
import { Random } from '../random';
import { define } from '../dict';

const DURATION = 180 * 1000;
const VALID = (s: string) =>
  s.split('').every(c => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'));

interface BoardJSON {
  last: string;
  kept: boolean;
  paused: boolean;
  timer: TimerJSON;
  game?: GameJSON;
}

export class BoardView implements View {
  last: string;
  kept: boolean;
  paused: boolean;
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
    this.paused = json ? json.paused : false;
    const { display, timer } = this.createTimer(json && json.timer);
    this.timer = timer;
    this.timerDisplay = display;
    document.addEventListener('visibilitychange', e => {
      if (document.hidden) {
        this.timer.stop();
      } else if (!this.paused) {
        this.timer.start();
      }
    });
  }

  toJSON(): BoardJSON {
    return {
      last: this.last,
      kept: this.kept,
      paused: this.paused,
      timer: this.timer.toJSON(),
      game: this.game && ('random' in this.game ? this.game.toJSON() : this.game),
    };
  }

  async init(data: { new?: boolean; allowDupes?: boolean } = {}) {
    await Promise.all([
      global.LOADED.DICT,
      global.LOADED.TRIE(),
      global.LOADED.STATS(),
      global.LOADED.HISTORY,
      global.LOADED.PLAYED(),
    ]);

    if (!this.game || data.new) {
      let seed = global.SEED;
      if (this.game) {
        this.timer.stop();
        if (!('random' in this.game)) {
          this.game = Game.fromJSON(this.game, global.TRIE, global.DICT, global.STATS);
        }
        if (this.game.seed === seed) seed = this.game.random.seed % global.MAX_SEED;
        global.PLAYED!.add(this.game.id);
        if (Object.values(this.game.played).filter(t => t > 0).length) {
          this.updateGames();
          global.HISTORY.push(this.game.toJSON());
          await global.STORE.set('history', global.HISTORY);
        }
      }

      let game;
      const random = new Random();
      while (!game || !Object.keys(game.possible).length) {
        random.seed = seed;
        const id = Game.encodeID(global.SETTINGS, random.seed);
        if (global.PLAYED!.has(id) && !data.allowDupes) {
          seed = (seed + 1) % global.MAX_SEED;
          continue;
        }
        game = new Game(global.TRIE, global.DICT, global.STATS, random, global.SETTINGS);
      }
      this.game = game;
      global.SEED = seed;

      const { display, timer } = this.createTimer();
      this.timer = timer;
      this.timerDisplay = display;

      this.last = '';
      this.kept = false;
      this.paused = false;
    } else if (!('random' in this.game)) {
      this.game = Game.fromJSON(this.game, global.TRIE, global.DICT, global.STATS);
    }

    const hash = `#${(this.game as Game).id}`;
    if (document.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }

    if (!this.full) this.full = UI.createElementWithId('div', 'full');
    if (!this.score) {
      this.score = UI.createElementWithId('div', 'score');
      this.displayScore();
    }
  }

  async attach(data: { new?: boolean; allowDupes?: boolean } = {}) {
    await this.init(data);

    this.container = UI.createElementWithId('div', 'game');

    const touch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    const back = UI.createBackButton(() => UI.toggleView('Menu'));
    back.addEventListener('long-press', e => {
      if (touch) e.preventDefault();
      return this.refresh({ new: true });
    });

    const score = UI.createElementWithId('div', 'score-wrapper');
    score.appendChild(this.score);
    score.addEventListener('mouseup', () => UI.toggleView('Score'));
    score.addEventListener('long-press', () => this.onLongPress());
    score.addEventListener('long-press-up', () => this.onLongPressUp());

    this.container.appendChild(UI.createTopbar(back, this.timerDisplay, score));
    this.container.appendChild(this.full);
    this.container.appendChild(this.renderBoard());
    this.displayScore();

    this.word = UI.createElementWithId('div', 'word');
    this.word.classList.add('word');
    this.word.addEventListener('beforeinput', e => this.onBeforeInput(e));

    if (!touch) this.word.contentEditable = 'true';
    this.container.appendChild(this.word);
    this.defn = UI.createElementWithId('div', 'defn');
    this.defn.classList.add('definition');
    this.container.appendChild(this.defn);

    if (!this.paused) this.timer.start();
    return this.container;
  }

  renderBoard() {
    const game = this.game as Game;
    const content = UI.createElementWithId('div', 'board-wrapper');
    const table = UI.createElementWithId('table', 'board');
    if (game.size > 4) table.classList.add('big');

    this.tds = new Set();
    const random = new Random(game.seed);
    for (let row = 0; row < game.size; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < game.size; col++) {
        const td = document.createElement('td');

        const text = document.createElement('div');
        text.textContent = game.board[row * game.size + col];
        if (text.textContent === 'Qu') text.classList.add('qu');
        if (['M', 'W', 'Z'].includes(text.textContent)) text.classList.add('underline');
        text.classList.add(`rotate${90 * random.next(0, 4)}`);
        td.setAttribute('data-x', String(row));
        td.setAttribute('data-y', String(col));
        td.appendChild(text);

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

    let touched = new Set<HTMLTableCellElement>();
    const deselect = () => {
      for (const td of touched) td.classList.remove('selected');
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

  detach(next: string) {
    if (!['Score', 'Define'].includes(next)) this.timer.stop();
    return this.container;
  }

  async refresh(data: { new?: boolean; allowDupes?: boolean } = {}) {
    UI.persist();
    await UI.detachView('Board', 'Board');
    await UI.attachView('Board', data);
  }

  play() {
    const game = this.game as Game;
    let w = (this.word.textContent || '').toUpperCase();
    if (!w.length) return;
    if (global.SETTINGS.shortcuts === 'Shortcuts' && (w.length < 3 || SUFFIXES.includes(w))) {
      w = `${this.last}${w}`;
      this.word.textContent = w;
    }
    const score = game.play(w);
    this.last = w;
    UI.persist();

    const hide = global.SETTINGS.display === 'Hide';
    this.kept = true;
    if (!hide && score) {
      this.displayScore();
      this.defn.textContent = define(w, global.DICT);
    } else {
      const original = this.word.textContent || undefined;
      if (!hide && game.played[w] < 0) this.word.classList.add('error');
      this.word.classList.add('fade');
      this.word.addEventListener('animationend', () => this.clear(original), { once: true });
    }
  }

  displayScore() {
    const game = this.game as Game;
    if (global.SETTINGS.display === 'Hide') {
      this.score.textContent = '?';
      this.full.classList.add('hidden');
      return;
    }

    if (global.SETTINGS.display === 'Full') {
      const state = game.state();
      const p = state.progress;
      const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams}`;
      const score = game.score.regular + game.score.overtime;
      const goal = state.totals[global.SETTINGS.grade.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
      const pct = Math.round((score / goal) * 100).toFixed(0);
      this.full.classList.remove('hidden');
      this.full.textContent = `${details} - ${score}/${goal} (${pct}%)`;
    } else {
      this.full.classList.add('hidden');
    }

    const s = game.score;
    this.score.textContent = s.overtime ? `${s.regular}\xA0/\xA0${s.overtime}` : `${s.regular}`;
  }

  clear(w?: string) {
    if (w && w !== this.word.textContent) return;
    this.word.textContent = '';
    this.word.classList.remove('error');
    this.word.classList.remove('fade');
    this.defn.textContent = '';
    this.kept = false;
  }

  createTimer(json?: TimerJSON) {
    const display = UI.createElementWithId('div', 'timer');
    display.addEventListener('click', () => {
      this.timer.toggle();
      this.paused = !this.paused;
    });
    const duration = json ? json.duration : DURATION;
    const elapsed = json ? json.elapsed : 0;
    const expire = () => {
      if (this.game && !this.game.expired) {
        this.game.expired = +new Date();
      }
    };
    const timer = new Timer(display, duration, elapsed, expire, () => UI.persist());
    return { display, timer };
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

  async onBeforeInput(e: any) {
    if (e.inputType.startsWith('delete') || (e.data && VALID(e.data))) return;
    e.preventDefault();
    const enter = ['insertLineBreak', 'insertParagraph'].includes(e.inputType);
    if (enter || (e.data && e.data.includes(' '))) {
      this.play();
      UI.focusContentEditable(this.word);
    }
  }

  // TODO: up and down arrow to go through history
  async onKeyDown(e: KeyboardEvent) {
    if (!this.word) return; // not attached
    if (this.kept) this.clear();
    UI.focusContentEditable(this.word);
    // tslint:disable-next-line: deprecation
    const key = e.keyCode;
    if (key === 13 || key === 32) {
      e.preventDefault();
      this.play();
      UI.focusContentEditable(this.word);
    } else if (!this.word.textContent && (key === 37 || key === 39)) {
      e.preventDefault();
    } else if (![0, 37, 39, 8, 46].includes(key) && !VALID(String.fromCharCode(key))) {
      e.preventDefault();
    }
  }
}
