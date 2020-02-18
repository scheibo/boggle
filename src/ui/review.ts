import { global } from './global';
import { UI, View } from './ui';
import { order } from '../dict';
import { Store } from '../store';
import { TrainingStats } from '../training';

export class ReviewView implements View {
  size: number;

  review!: HTMLElement;

  constructor(json?: { size: number }) {
    this.size = json ? json.size : 0;
  }

  toJSON(): { size: number } {
    return { size: this.size };
  }

  async attach(size?: number) {
    await Promise.all([global.LOADED.DICT, global.LOADED.STATS()]);

    this.review = UI.createElementWithId('div', 'review');
    if (size) this.size = size;

    const back = UI.createBackButton(() => UI.toggleView('Training'));
    const progress = UI.createElementWithId('div', 'progress');
    progress.textContent = String(this.size);
    this.review.appendChild(UI.createTopbar(back, null, progress));

    const d = global.SETTINGS.dice.charAt(0).toLowerCase() as 'n' | 'o' | 'b';
    const score = (k: string) => global.STATS.anagrams(k, global.SETTINGS.dict)[d] || 0;

    const store = new Store('training', global.SETTINGS.dict);
    const data = (await store.get('data')) as TrainingStats[];
    const keys = data
      .filter(w => w.e < 2.0) // TODO: !v.c, figure out 2.0 based on average?
      .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
      .map(w => w.k);

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');

    for (const k of keys) {
      const table = document.createElement('table');
      table.classList.add('results');
      UI.addAnagramRows(table, order(global.STATS.anagrams(k, global.SETTINGS.dict).words));
      wrapper.appendChild(table);
    }
    this.review.appendChild(wrapper);

    return this.review;
  }

  detach() {
    return this.review;
  }
}
