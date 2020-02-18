import { global } from './global';
import { UI, View } from './ui';
import { TrainingPool } from '../training';
import { Store } from '../store';

export class TrainingView implements View {
  pool!: TrainingPool;
  train!: HTMLElement;
  content: HTMLElement | null = null;
  restore: (() => void) | null = null;

  toJSON() {}
  async attach() {
    await Promise.all([global.LOADED.TRAINING, global.LOADED.DICT, global.LOADED.STATS()]);
    if (!this.pool || this.pool.type !== global.SETTINGS.dict) {
      const store = new Store('training', global.SETTINGS.dict);
      this.pool = await TrainingPool.create(
        global.STATS,
        global.SETTINGS.dice,
        global.SETTINGS.dict,
        store,
        global.SETTINGS.min
      );
    }

    this.train = UI.createElementWithId('div', 'train');
    this.next();
    return this.train;
  }

  async detach() {
    if (this.restore) await this.restore();
    this.content = null;
    return this.train;
  }

  next() {
    const content = UI.createElementWithId('div', 'content');
    const progress = UI.createElementWithId('div', 'progress');
    progress.textContent = String(this.pool.size());

    const { label, group, update, restore } = this.pool.next();
    this.restore = restore;
    const trainWord = document.createElement('div');
    trainWord.classList.add('word');
    trainWord.textContent = label;

    const sizeHint = UI.createElementWithId('div', 'sizeHint');
    sizeHint.classList.add('hidden');
    sizeHint.textContent = String(group.length);

    const rating = this.createRatingToggles(update);
    const table = document.createElement('table');
    table.classList.add('results', 'hidden');
    UI.addAnagramRows(table, group);

    progress.addEventListener('mouseup', () => UI.toggleView('Review', progress.textContent));
    progress.addEventListener('long-press', () => {
      if (!rating.classList.contains('hidden')) return;
      sizeHint.classList.remove('hidden');
    });
    progress.addEventListener('long-press-up', () => sizeHint.classList.add('hidden'));

    const back = UI.createBackButton(() => UI.toggleView('Menu'));
    content.appendChild(UI.createTopbar(back, null, progress));

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');
    wrapper.appendChild(trainWord);
    wrapper.appendChild(table);

    content.appendChild(wrapper);
    content.appendChild(sizeHint);
    content.appendChild(rating);

    const listener = (e: MouseEvent) => {
      if (![back, progress].includes(e.target as HTMLElement)) {
        content.removeEventListener('click', listener);
        trainWord.classList.add('hidden');
        table.classList.remove('hidden');
        rating.classList.remove('hidden');
      }
    };
    content.addEventListener('click', listener);

    if (this.content) this.train.removeChild(this.content);
    this.train.appendChild(content);
    this.content = content;
  }

  createRatingToggles(update: (q: number) => Promise<void>) {
    const toggles = document.createElement('div');
    toggles.setAttribute('id', 'rating');
    toggles.classList.add('toggle-group');
    toggles.classList.add('horizontal');
    toggles.classList.add('hidden');

    for (let i = 0; i < 6; i++) {
      const toggle = document.createElement('button');
      toggle.setAttribute('id', `rating${i}`);
      toggle.setAttribute('type', 'button');
      toggle.classList.add('toggle');
      toggle.textContent = String(i);

      toggles.appendChild(toggle);

      toggle.addEventListener('click', async () => {
        await update(Number(toggle.textContent));
        this.restore = null;
        this.next();
      });
    }

    return toggles;
  }
}
