import {global} from './global';
import {Game, GameSettings} from '../game';
import {Random} from '../random';
import {Settings, Theme} from '../settings';
import {define} from '../dict';

import {BoardView} from './board';
import {DefineView} from './define';
import {MenuView} from './menu';
import {ReviewView} from './review';
import {SettingsView} from './settings';
import {StatsView} from './stats';
import {TrainingView} from './training';

class Loader {
  private loader!: HTMLElement;

  attach() {
    this.loader = UI.createElementWithId('div', 'loader');
    const spinner = UI.createElementWithId('div', 'spinner');
    this.loader.appendChild(spinner);
    return this.loader;
  }

  detach() {
    return this.loader;
  }
}

export interface View {
  toJSON(): any;
  attach(data?: any): HTMLElement | Promise<HTMLElement>;
  detach(): HTMLElement | Promise<HTMLElement>;
  afterAttach?: () => void;
  onKeyDown?: (e: KeyboardEvent) => Promise<void>;
}

export const UI = new (class{
  root!: HTMLElement;
  BACK!: HTMLImageElement;
  current!: string;
  previous!: string;
  Views!: {[view: string]: View};
  loader!: Loader;

  async create() {
    setTimeout(() => window.scrollTo(0, 1), 0);

    // If theme has been explicitly set by the user then that trumps the system value
    if (global.SETTINGS.theme !== undefined) {
      this.setTheme(global.SETTINGS.theme);
    } else {
      this.setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light');
    }

    this.root = document.getElementById('display')!;

    const state = JSON.parse(localStorage.getItem('state')!);
    console.log(state); // DEBUG
    this.current = state ? state.current : 'Menu';
    this.previous = state ? state.previous : 'Menu';
    this.loader = new Loader();
    const VIEWS = {
      Menu: MenuView,
      Board: BoardView,
      Training: TrainingView,
      Review: ReviewView,
      Define: DefineView,
      Stats: StatsView,
      Settings: SettingsView,
    };
    const views = state ? state.views : {};
    this.Views = {};
    for (const [type, view] of Object.entries(VIEWS)) {
      this.Views[type] = new view(views[type]);
    }

    await this.setup();

    this.BACK = document.createElement('img');
    this.BACK.src = 'img/back.svg';
    this.BACK.height = 20;

    document.addEventListener('keydown', e => this.onKeyDown(e));
    document.addEventListener('swiped-left', () => this.toggleView('Define'));
    document.addEventListener('swiped-right', () => this.toggleView('Define'));
    window.addEventListener('hashchange',  () => this.onHashChange());
    window.addEventListener('beforeunload', () => this.persist())

    await this.attachView(this.current);
  }

  persist(previous = false) {
    const state = JSON.parse(localStorage.getItem('state')!) || {};
    state.current = this.current;
    state.previous = this.previous;
    state.views = state.views || {};
    state.views[this.current] = this.Views[this.current];
    if (previous) state.views[this.previous] = this.Views[this.previous];
    localStorage.setItem('state', JSON.stringify(state));
  }

  async attachView(view: string, data?: any) {
    // console.log(+new Date(), 'ATTACHING', view, data, this.Views[view]);
    this.root.appendChild(this.loader.attach());
    const v = this.Views[view];
    const attached = await v.attach(data);
    this.root.removeChild(this.loader.detach());
    this.root.appendChild(attached);
    if (v.afterAttach) v.afterAttach();
    // console.log(+new Date(), 'ATTACHED', view, data, this.Views[view]);
  }

  async detachView(view: string) {
    // console.log(+new Date(), 'DETACHING', view, this.Views[view]);
    this.root.removeChild(await this.Views[view].detach());
    // console.log(+new Date(), 'DETACHED', view, this.Views[view]);
  }

  async toggleView(view: string, data?: any) {
    // console.log('TOGGLE', view, {current: this.current, previous: this.previous});
    if (this.current === view) {
      await this.detachView(view);
      this.current = this.previous;
      this.previous = view;
      await this.attachView(this.current, data);
    } else {
      await this.detachView(this.current);
      this.previous = this.current;
      this.current = view;
      await this.attachView(view, data);
    }
    this.persist(true);
  }

  async setup() {
    const setupFromHistory = async () => {
      await global.LOADED.HISTORY;
      if (global.HISTORY.length) {
        const id = global.HISTORY[global.HISTORY.length - 1].seed;
        const [settings] = Game.decodeID(id);

        const rand = new Random();
        rand.seed = global.SEED;
        rand.next();

        this.updateSettings(settings, rand.seed);
      }
    };

    const hash = document.location.hash && document.location.hash.slice(1);
    if (!hash) {
      const existing = (this.Views.Board as BoardView).game;
      if (existing) {
        const [settings, seed] = Game.decodeID(existing.game.seed);
        this.updateSettings(settings, seed);
      } else {
        const [settings, seed] = Game.decodeID(hash);
        if (this.valid(settings, seed)) {
          return setupFromHistory();
        }
        this.updateSettings(settings, seed);
      }
    } else {
      const [settings, seed] = Game.decodeID(hash);
      if (this.valid(settings, seed)) {
        return setupFromHistory();
      }
      this.updateSettings(settings, seed);
    }
  }

  async onKeyDown(e: KeyboardEvent) {
    const key = e.keyCode;
    const currentView = this.Views[this.current];
    if (key === 191 && e.shiftKey) {
      e.preventDefault();
      await this.toggleView('Define');
    } else if ('onKeyDown' in currentView) {
      await currentView.onKeyDown!(e);
    }
  }

  async onHashChange() {
    if (!document.location.hash) return;
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (!this.valid(settings, seed)) return;

    let refresh = seed !== global.SEED;
    if (!refresh) {
      const s = Object.assign({}, global.SETTINGS);
      refresh = s.dice !== settings.dice || s.min !== settings.min || s.dict !== settings.dict;
    }
    this.updateSettings(settings, seed, false);

    if (this.current === 'Settings') {
      (this.Views[this.current] as SettingsView).update();
    } else if (refresh && this.current === 'Play') {
      (this.Views[this.current] as BoardView).refresh({allowDupes: true});
    }
  }

  valid(settings: Partial<GameSettings>, seed: number) {
    return !isNaN(seed) && !(settings.dice && settings.dict && settings.min);
  }

  updateSettings(settings: Partial<Settings>, seed?: number, dom = true) {
    Object.assign(global.SETTINGS, settings);
    localStorage.setItem('settings', JSON.stringify(global.SETTINGS));
    if (seed) global.SEED = seed;

    const id = Game.encodeID(global.SETTINGS, global.SEED);
    window.history.replaceState(null, null, `#${id}`);

    if (dom && this.current === 'Settings') {
      const view = this.Views[this.current] as SettingsView;
      view.seed.textContent = id;
      view.seed.classList.remove('error');
    }
  }

  createElementWithId(type: string, id: string) {
    const element = document.createElement(type);
    element.setAttribute('id', id);
    return element;
  }

  createTopbar(left: HTMLElement | null, center: HTMLElement | null, right: HTMLElement | null) {
    const topbar = this.createElementWithId('header', 'topbar');
    topbar.appendChild(left || document.createElement('div'));
    topbar.appendChild(center || document.createElement('div'));
    topbar.appendChild(right || document.createElement('div'));
    return topbar;
  }

  createBackButton(fn: (e: MouseEvent) => void) {
    const back = this.createElementWithId('div', 'back');
    back.appendChild(this.BACK);
    back.addEventListener('mouseup', fn);
    return back;
  }

  focusContentEditable(element: HTMLElement) {
    element.focus();
    document.execCommand('selectAll', false, null);
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed) sel.collapseToEnd();
  }

  permaFocus(element: HTMLElement) {
    element.addEventListener('blur', () => setTimeout(() => this.focusContentEditable(element), 20));
    this.focusContentEditable(element);
  }

  setTheme(theme: Theme) {
    document.documentElement.setAttribute('data-theme', theme.toLowerCase());
  }

  addAnagramRows(table: HTMLTableElement, group: string[]) {
    for (const r of group) {
      const w = r.replace(/[^A-Z]/, '');
      const tr = document.createElement('tr');
      const grade = global.STATS.stats(w, global.SETTINGS.dice, global.SETTINGS.dict).grade;
      if (grade < global.SETTINGS.grade) tr.classList.add('hard');

      let td = document.createElement('td');
      const b = document.createElement('b');
      const s = r.startsWith('(') ? `${r}\xa0` : r.endsWith(')') ? `\xa0${r}` : `\xa0${r}\xa0`;
      b.textContent = `\xa0${s}\xa0`;
      td.appendChild(b);
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = define(w, global.DICT);
      tr.appendChild(td);

      table.appendChild(tr);
    }
  }

  createRadios(id: string, values: Array<string | [string]>, listener: () => void) {
    const radios = this.createElementWithId('span', id);
    radios.classList.add('toggle-group');
    radios.classList.add('horizontal');
    radios.setAttribute('role', 'radiogroup');
    for (let val of values) {
      let checked = false;
      if (Array.isArray(val)) {
        checked = true;
        val = val[0];
      }

      const radio = this.createElementWithId('input', `${id}${val}`);
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
})();