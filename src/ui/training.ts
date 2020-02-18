import { global } from './global';
import { UI, View } from './ui';
import { TrainingPool } from '../training';
import { Store } from '../store';

const INTERVAL = 1000;

export class TrainingView implements View {
  pool!: TrainingPool;
  train!: HTMLElement;
  content: HTMLElement | null = null;
  restore: (() => void) | null = null;
  interval: number | null = null;

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
    if (this.interval) clearInterval(this.interval);
    this.content = null;
    return this.train;
  }

  next() {
    const content = UI.createElementWithId('div', 'content');
    const progress = UI.createElementWithId('div', 'progress');
    this.updateProgress(progress);
    this.interval = setInterval(() => this.updateProgress(progress), INTERVAL);

    const { label, group, update, restore } = this.pool.next();
    this.restore = restore;
    const trainWord = document.createElement('div');
    trainWord.classList.add('word');
    trainWord.textContent = label;

    const sizeHint = UI.createElementWithId('div', 'sizeHint');
    sizeHint.classList.add('hidden');
    sizeHint.textContent = String(group.length);

    const rating = this.createRatingToggles(progress, update);
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

  createRatingToggles(progress: HTMLElement, update: (q: number) => Promise<void>) {
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
        // Update progress before its scheduled interval to ensure there's no perceived lag
        this.updateProgress(progress);
        this.restore = null;
        this.next();
      });
    }

    return toggles;
  }

  updateProgress(progress: HTMLElement) {
    progress.textContent = `${this.pool.overdue()} / ${this.pool.size()}`;
  }
}
