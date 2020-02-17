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