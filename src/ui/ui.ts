class LoadingView {
  private loader!: HTMLElement;

  attach() {
    this.loader = createElementWithId('div', 'loader');
    const spinner = createElementWithId('div', 'spinner');
    this.loader.appendChild(spinner);
    return this.loader;
  }

  detach() {
    return this.loader;
  }
}

export const UI = new (class{
  async create() {
    setTimeout(() => window.scrollTo(0, 1), 0);

    // If theme has been explicitly set by the user then that trumps the system value
    if (SETTINGS.theme !== undefined) {
      setTheme(SETTINGS.theme);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light');
    }

    this.root = document.getElementById('display');

    const state = JSON.parse(localStorage.getItem('state'));
    console.log(state); // DEBUG
    this.current = state ? state.current : 'Menu';
    this.previous = state ? state.previous : 'Menu';
    const VIEWS = {
      Menu: MenuView,
      Loading: LoadingView,
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

  persist(previous) {
    const state = JSON.parse(localStorage.getItem('state')) || {};
    state.current = this.current;
    state.previous = this.previous;
    state.views = state.views || {};
    state.views[this.current] = this.Views[this.current];
    if (previous) state.views[this.previous] = this.Views[this.previous];
    localStorage.setItem('state', JSON.stringify(state));
  }

  async attachView(view, data) {
    // console.log(+new Date(), 'ATTACHING', view, data, this.Views[view]);
    this.root.appendChild(this.Views.Loading.attach());
    const v = await this.Views[view].attach(data);
    this.root.removeChild(this.Views.Loading.detach());
    this.root.appendChild(v);
    // console.log(+new Date(), 'ATTACHED', view, data, this.Views[view]);

    if (this.Views[view].afterAttach) {
      this.Views[view].afterAttach();
    }
  }

  async detachView(view) {
    // console.log(+new Date(), 'DETACHING', view, this.Views[view]);
    this.root.removeChild(await this.Views[view].detach());
    // console.log(+new Date(), 'DETACHED', view, this.Views[view]);
  }

  async toggleView(view, data) {
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
      await LOADED.HISTORY;
      if (HISTORY.length) {
        const id = HISTORY[HISTORY.length - 1].seed;
        const [settings] = Game.decodeID(id);

        const rand = new Random();
        rand.seed = SEED;
        rand.next();

        updateSettings(settings, seed);
      }
    };

    const hash = document.location.hash && document.location.hash.slice(1);
    if (!hash) {
      const existing = this.Views.Board.game;
      if (existing) {
        const [settings, seed] = Game.decodeId(existing.game.seed);
        updateSettings(settings, seed);
      } else {
        const [settings, seed] = Game.decodeID(hash);
        if (this.valid(settings, seed)) {
          return setupFromHistory();
        }
        updateSettings(settings, seed);
      }
    } else {
      const [settings, seed] = Game.decodeID(hash);
      if (this.valid(settings, seed)) {
        return setupFromHistory();
      }
      updateSettings(settings, seed);
    }
  }

  async onKeyDown(e) {
    const key = e.keyCode;
    if (key === 191 && e.shiftKey) {
      e.preventDefault();
      await this.toggleView('Define');
    } else if ('onKeyDown' in this.Views[this.current]) {
      await this.Views[this.current].onKeyDown(e);
    }
  }

  async onHashChange() {
    if (!document.location.hash) return;
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (!this.valid(settings, seed)) return;

    let refresh = seed !== SEED;
    if (!refresh) {
      const s = Object.assign({}, SETTINGS);
      refresh = s.dice !== SETTINGS.dice || s.min !== SETTINGS.min || s.dict !== SETTINGS.dict;
    }
    updateSettings(settings, seed, false);

    if (this.current === 'Settings') {
      this.Views[this.current].update();
    } else if (refresh && this.current === 'Play') {
      this.Views[this.current].refresh({allowDupes: true});
    }
  }

  valid(settings, seed) {
    return !isNaN(seed) && !(settings.dice && settings.dict && settings.min);
  }
})();


function updateSettings(settings, seed, dom = true) {
  Object.assign(SETTINGS, settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
  if (seed) SEED = seed;

  const id = Game.encodeID(SETTINGS, SEED);
  window.history.replaceState(null, null, `#${id}`);

  if (dom && UI.current === 'Settings') {
    const seed = document.getElementById('seed');
    seed.textContent = id;
    seed.classList.remove('error');
  }
}

function createElementWithId(type, id) {
  const element = document.createElement(type);
  element.setAttribute('id', id);
  return element;
}

function focusContentEditable(element) {
  element.focus();
  document.execCommand('selectAll', false, null);
  const sel = document.getSelection();
  if (sel && !sel.isCollapsed) sel.collapseToEnd();
}

function permaFocus(e) {
  e.addEventListener('blur', () => setTimeout(() => focusContentEditable(e), 20));
  focusContentEditable(e);
}

function createRadios(id, values, listener) {
  const radios = createElementWithId('span', id);
  radios.classList.add('toggle-group');
  radios.classList.add('horizontal');
  radios.setAttribute('role', 'radiogroup');
  for (let val of values) {
    let checked = false;
    if (Array.isArray(val)) {
      checked = true;
      val = val[0];
    }

    const radio = createElementWithId('input', `${id}${val}`);
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

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme.toLowerCase());
}

function addAnagramRows(table, group) {
  for (const r of group) {
    const w = r.replace(/[^A-Z]/, '');
    const tr = document.createElement('tr');
    const grade = STATS.stats(w, SETTINGS.dice, SETTINGS.dict).grade;
    if (grade < SETTINGS.grade) tr.classList.add('hard');

    let td = document.createElement('td');
    const b = document.createElement('b');
    const s = r.startsWith('(') ? `${r}\xa0` : r.endsWith(')') ? `\xa0${r}` : `\xa0${r}\xa0`;
    b.textContent = `\xa0${s}\xa0`;
    td.appendChild(b);
    tr.appendChild(td);
    td = document.createElement('td');
    td.textContent = define(w, DICT);
    tr.appendChild(td);

    table.appendChild(tr);
  }
}

function createTopbar(left, center, right) {
  const topbar = createElementWithId('header', 'topbar');
  topbar.appendChild(left || document.createElement('div'));
  topbar.appendChild(center || document.createElement('div'));
  topbar.appendChild(right || document.createElement('div'));
  return topbar;
}

function createBackButton(fn) {
  const back = createElementWithId('div', 'back');
  back.appendChild(UI.BACK);
  back.addEventListener('mouseup', fn);
  return back;
}