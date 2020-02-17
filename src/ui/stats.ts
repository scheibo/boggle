import {global} from './global';
import {UI, View} from './ui';
import {Game} from '../game';
import {Stats} from '../stats';

type Section = 'WORD' | 'ANAGRAM' | 'PAIR';

export class StatsView implements View {
  section: Section;

  stats!: HTMLElement;
  table: HTMLElement | null = null;

  constructor(json?: {section: Section}) {
    this.section = json ? json.section : 'WORD';
  }

  toJSON(): {section: Section} {
    return {section: this.section};
  }

  // TODO: why is there no spinner?
  async attach() {
    await Promise.all([global.LOADED.HISTORY, global.LOADED.TRIE(), global.LOADED.DICT, global.LOADED.STATS()]);
    if (!global.GAMES) {
      global.GAMES = [];
      for (let i = global.HISTORY.length - 1; i >= 0 && global.GAMES.length < global.LIMIT; i--) {
        const game = Game.fromJSON(global.HISTORY[i], global.TRIE, global.DICT, global.STATS);
        const played = new Set<string>();
        for (const w in game.played) {
          if (game.played[w] > 0) played.add(w);
        }
        global.GAMES.push([game.possible, played]);
      }
    }
    // TODO: cache this, invalidate if GAMES/dice/dict/min changes?
    const data = global.STATS.history(global.GAMES, global.SETTINGS.dice, global.SETTINGS.dict);

    this.stats = UI.createElementWithId('div', 'stats');
    const back = UI.createBackButton(() => UI.toggleView('Menu'));
    const display = (s: Section) => this.display(s, data);
    const radios = UI.createRadios('statsSelect', ['WORD', 'ANAGRAM', 'PAIR'].map(s => s === this.section ? [s] : s), function(this: HTMLInputElement) {
      display(this.value as Section);
      UI.persist();
    });

    this.stats.appendChild(UI.createTopbar(back, radios, null));
    this.display(this.section, data);

    return this.stats;
  }

  detach() {
    this.table = null;
    return this.stats;
  }

  display(section: Section, data: ReturnType<Stats['history']>) {
    this.section = section;
    const {words, anadromes, anagrams} = data;

    const link = (w: string) => {
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
        const td = document.createElement('td');

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

          const span = document.createElement('span');
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