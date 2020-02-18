import { global } from './global';
import { UI, View } from './ui';
import { Game } from '../game';
import { Type } from '../dict';
import { Grade } from '../stats';
import { Settings, Dice, MinLength, ScoreDisplay, Theme } from '../settings';

export class SettingsView implements View {
  settings!: HTMLElement;
  seed!: HTMLElement;

  toJSON() {}
  attach() {
    this.settings = UI.createElementWithId('div', 'settings');

    this.seed = UI.createElementWithId('div', 'seed');
    this.seed.textContent = Game.encodeID(global.SETTINGS, global.SEED);
    this.seed.setAttribute('contenteditable', 'true');
    this.seed.addEventListener('input', () => this.onInput(this.seed.textContent || ''));
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
      checkedRadioRow('dice', ['New', 'Old', 'Big'], function(this: HTMLInputElement) {
        const min = this.value === 'Big' ? 4 : 3;
        (document.getElementById(`min${min}`) as HTMLInputElement).checked = true;
        UI.updateSettings({ dice: this.value as Dice, min });
      })
    );
    this.settings.appendChild(
      checkedRadioRow('min', ['3', '4', '5'], function(this: HTMLInputElement) {
        UI.updateSettings({ min: Number(this.value) as MinLength });
      })
    );
    this.settings.appendChild(
      checkedRadioRow('dict', ['NWL', 'ENABLE', 'CSW'], function(this: HTMLInputElement) {
        UI.updateSettings({ dict: this.value as Type });
      })
    );
    this.settings.appendChild(
      checkedRadioRow('grade', ['A', 'B', 'C', 'D'], function(this: HTMLInputElement) {
        UI.updateSettings({ grade: this.value as Exclude<Grade, ' '> });
      })
    );
    this.settings.appendChild(
      checkedRadioRow(
        'display',
        ['Hide', 'Show', 'Full'],
        function(this: HTMLInputElement) {
          UI.updateSettings({ display: this.value as ScoreDisplay });
        },
        'scoreDisplay'
      )
    );
    this.settings.appendChild(
      checkedRadioRow('theme', ['Light', 'Dark'], function(this: HTMLInputElement) {
        const theme = this.value as Theme;
        UI.updateSettings({ theme });
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
    set(`theme${global.SETTINGS.theme || 'Light'}`);
  }

  onInput(id: string) {
    const [settings, seed] = Game.decodeID(id);
    if (isNaN(seed) || !(settings.dice && settings.dict && settings.min)) {
      this.seed.classList.add('error');
    } else {
      UI.updateSettings(settings, seed, false);
      this.update();
    }
  }
}
