import { global } from './global';
import { UI } from './ui';
import { BoardView } from './board';
import { Game } from '../game';

export class ScorePane {
  readonly board: BoardView;

  container!: HTMLElement;

  constructor(board: BoardView) {
    this.board = board;
  }

  attach() {
    this.container = UI.createElementWithId('div', 'game');

    const wrapper = UI.createElementWithId('div', 'wrapper');
    wrapper.classList.add('score');

    const back = UI.createBackButton(async () => {
      UI.root.removeChild(this.detach());
      UI.root.appendChild(await this.board.attach({ resume: 'return' }));
    });

    this.container.appendChild(
      UI.createTopbar(
        back,
        this.board.timerDisplay,
        this.board.score!.cloneNode(true) as HTMLElement
      )
    );

    const game = this.board.game as Game;
    const state = game.state();
    const score = game.score.regular + game.score.overtime;
    const goal = state.totals[global.SETTINGS.grade.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
    const details = `${score}/${goal} (${Math.round((score / goal) * 100).toFixed(0)}%)`;
    const current = makeCollapsible(game.id, details, 'block');
    const div = document.createElement('div');
    div.classList.add('collapsible-content');
    this.displayPlayed(state, div, true);
    this.displayPossible(state, div);
    wrapper.appendChild(current);
    wrapper.appendChild(div);
    // Start off with played expanded
    current.classList.add('active');
    div.style.display = 'block';

    for (let i = global.HISTORY.length - 1; i >= 0; i--) {
      const state = global.HISTORY[i];
      let score = 0;
      for (const [w, t] of Object.entries(state.words)) {
        if (t > 0) score += Game.score(w);
      }
      if (!score) continue;

      const details = `${score}/${state.goal[global.SETTINGS.grade]} (${Math.round(
        (score / state.goal[global.SETTINGS.grade]) * 100
      ).toFixed(0)}%)`;
      const div = document.createElement('div');
      div.classList.add('collapsible-content');
      div.classList.add('lazy');
      const button = makeCollapsible(state.seed, details, 'block', () => {
        if (div.classList.contains('lazy')) {
          div.classList.remove('lazy');
          const game = Game.fromJSON(state, global.TRIE, global.DICT, global.STATS);
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

  displayPlayed(state: ReturnType<Game['state']>, div: HTMLElement, expanded = false) {
    const p = state.progress;
    const details = `(${p.score}) ${Object.keys(p.suffixes).length}/${p.subwords}/${p.anagrams} (${
      p.invalid
    }/${p.total})`;

    const button = makeCollapsible('PLAYED', details, 'table');

    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    table.classList.add('played');

    for (const { word, grade, overtime, defn, invalid } of state.played) {
      const tr = document.createElement('tr');
      if (grade < global.SETTINGS.grade) tr.classList.add('hard');
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

  displayPossible(state: ReturnType<Game['state']>, div: HTMLElement, expanded = false) {
    const tot = state.totals;
    const details = `${tot.d}/${tot.c}/${tot.b}/${tot.a} (${tot.s})`;

    const button = makeCollapsible('POSSIBLE', details, 'table');
    const table = document.createElement('table');
    table.classList.add('collapsible-content');
    table.classList.add('results');
    table.classList.add('possible');

    for (const { word, grade, root, missing, defn } of state.remaining) {
      const tr = document.createElement('tr');
      if (grade < global.SETTINGS.grade) tr.classList.add('hard');

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

function makeCollapsible(title: string, details: string, display: string, fn?: () => void) {
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
    const content = button.nextElementSibling as HTMLElement;
    if (content.style.display === display) {
      content.style.display = 'none';
    } else {
      if (fn) fn();
      content.style.display = display;
    }
  });

  return button;
}
