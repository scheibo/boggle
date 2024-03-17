import {Type} from '../dict';
import {Game} from '../game';
import {Dice, MinLength, ScoreDisplay, Settings, Shortcuts, Theme} from '../settings';
import {Grade} from '../stats';

import {global} from './global';
import {UI, View} from './ui';

const CHARS = new Set([
  'B', 'b', 'N', 'n', 'E', 'e', 'C', 'c', 'O', 'o',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);
const VALID = (s: string) => s.split('').every(c => CHARS.has(c));

export class SettingsView implements View {
  settings!: HTMLElement;
  seed!: HTMLInputElement;

  toJSON() {}

  attach() {
    this.settings = UI.createElementWithId('div', 'settings');

    this.seed = UI.createElementWithId('input', 'seed') as HTMLInputElement;
    this.seed.setAttribute('type', 'text');
    this.seed.value = Game.encodeID(global.SETTINGS, global.SEED);
    this.seed.addEventListener('input', () => this.onInput(this.seed.value || ''));
    this.seed.addEventListener('beforeinput', e => this.onBeforeInput(e));
    const back = UI.createBackButton(() => UI.toggleView('Menu'));
    this.settings.appendChild(UI.createTopbar(back, this.seed, null));

    const checkedRadioRow = (
      k: keyof Settings,
      opts: string[],
      fn: (this: HTMLInputElement) => void,
      id?: string
    ) => {
      const row = document.createElement('div');
      row.classList.add('row');
      const radios = UI.createRadios(
        id || k,
        opts.map(s => (s === String(global.SETTINGS[k]) ? [s] : s)),
        fn
      );
      row.appendChild(radios);
      return row;
    };

    this.settings.appendChild(
      checkedRadioRow('dice', ['New', 'Old', 'Big'], function (this: HTMLInputElement) {
        const min = this.value === 'Big' ? 4 : 3;
        (document.getElementById(`min${min}`) as HTMLInputElement).checked = true;
        UI.updateSettings({dice: this.value as Dice, min});
      })
    );
    this.settings.appendChild(
      checkedRadioRow('min', ['3', '4', '5'], function (this: HTMLInputElement) {
        UI.updateSettings({min: Number(this.value) as MinLength});
      })
    );
    this.settings.appendChild(
      checkedRadioRow('dict', ['NWL', 'ENABLE', 'CSW'], function (this: HTMLInputElement) {
        UI.updateSettings({dict: this.value as Type});
      })
    );
    this.settings.appendChild(
      checkedRadioRow('grade', ['A', 'B', 'C', 'D'], function (this: HTMLInputElement) {
        UI.updateSettings({grade: this.value as Exclude<Grade, ' '>});
      })
    );
    this.settings.appendChild(
      checkedRadioRow(
        'display',
        ['Hide', 'Show', 'Full'],
        function (this: HTMLInputElement) {
          UI.updateSettings({display: this.value as ScoreDisplay});
        },
        'scoreDisplay'
      )
    );
    this.settings.appendChild(
      checkedRadioRow('shortcuts', ['Shortcuts', 'None'], function (this: HTMLInputElement) {
        UI.updateSettings({shortcuts: this.value as Shortcuts});
      })
    );
    this.settings.appendChild(
      checkedRadioRow('theme', ['System', 'Light', 'Dark'], function (this: HTMLInputElement) {
        const theme = this.value as Theme;
        UI.updateSettings({theme});
        UI.setTheme(theme);
      })
    );

    return this.settings;
  }

  detach() {
    return this.settings;
  }

  update() {
    this.seed.textContent = Game.encodeID(global.SETTINGS, global.SEED);
    this.seed.classList.remove('error');
    const set = (id: string) => ((document.getElementById(id) as HTMLInputElement).checked = true);
    set(`dice${global.SETTINGS.dice}`);
    set(`min${global.SETTINGS.min}`);
    set(`dict${global.SETTINGS.dict}`);
    set(`grade${global.SETTINGS.grade}`);
    set(`scoreDisplay${global.SETTINGS.display}`);
    set(`shortcuts${global.SETTINGS.shortcuts}`);
    set(`theme${global.SETTINGS.theme}`);
  }

  onInput(id: string) {
    if (!VALID(id)) return;
    const [settings, seed] = Game.decodeID(id);
    if (!UI.valid(settings, seed)) {
      this.seed.classList.add('error');
    } else {
      UI.updateSettings(settings, seed, false);
      this.update();
    }
  }

  onBeforeInput(e: any) {
    if (e.inputType.startsWith('delete') || (e.data && VALID(e.data))) return;
    e.preventDefault();
  }

  async onKeyDown(e: KeyboardEvent) {
    if (!this.seed) return; // not attached
    const key = e.keyCode;
    if ([0, 37, 39, 8, 46].includes(key) || VALID(String.fromCharCode(key))) return;
    e.preventDefault();
  }
}
