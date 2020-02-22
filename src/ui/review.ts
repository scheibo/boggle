import { global } from './global';
import { UI, View } from './ui';
import { order } from '../dict';
import { Store } from '../store';
import { TrainingStats } from '../training';
import { TrainingView } from './training';

export class ReviewView implements View {
  private readonly training: TrainingView;

  review!: HTMLElement;

  constructor(training: TrainingView) {
    this.training = training;
  }

  toJSON() {}

  async attach() {
    await this.training.init();

    this.review = UI.createElementWithId('div', 'review');

    const back = UI.createBackButton(() => UI.toggleView('Training'));
    this.review.appendChild(UI.createTopbar(back, null, this.training.progress));

    const d = global.SETTINGS.dice.charAt(0).toLowerCase() as 'n' | 'o' | 'b';
    const score = (k: string) => global.STATS.anagrams(k, global.SETTINGS.dict)[d] || 0;

    const store = new Store('training', global.SETTINGS.dict);
    const data = (await store.get('data') || []) as TrainingStats[];
    const keys = data
      .filter(w => w.e < 2.0) // TODO: !v.c, figure out 2.0 based on average?
      .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
      .map(w => w.k);

    const wrapper = UI.createElementWithId('div', 'review-results-wrapper');
    for (const k of keys) {
      const table = UI.createElementWithId('table', 'review-results') as HTMLTableElement;
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
