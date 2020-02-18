import { global } from './global';
import { Store } from '../store';
import { TrainingPool, TrainingStats } from '../training';
import { Stats } from '../stats';

export const Debug = new (class {
  async backup() {
    const data: any = { history: await global.STORE.get('history') };
    for (const type of ['NWL', 'ENABLE', 'CSW']) {
      const store = new Store('training', type);
      data[type] = await store.get('data');
    }
    data.settings = JSON.parse(localStorage.getItem('settings')!);
    return JSON.stringify(data);
  }

  async restore(data: any) {
    await global.STORE.set('history', data.history);
    for (const type of ['NWL', 'ENABLE', 'CSW']) {
      const store = new Store('training', type);
      await store.set('data', data[type]);
    }
    localStorage.setItem('settings', JSON.stringify(data.settings));
  }

  async modify(w: string, fn: (s: TrainingStats) => TrainingStats) {
    const store = new Store('training', global.SETTINGS.dict);
    const pool = await TrainingPool.create(
      global.STATS,
      global.SETTINGS.dice,
      global.SETTINGS.dict,
      store,
      global.SETTINGS.min
    );
    const k = Stats.toAnagram(w);

    let found;
    // @ts-ignore
    const learned = pool.learned;
    const popped = [];
    for (found = learned.pop(); found && found.k !== k; found = learned.pop()) {
      popped.push(found);
    }
    if (!found) throw RangeError();

    learned.push(fn(found));
    for (const p of popped) learned.push(p);

    return store.set('data', learned.data);
  }
})();
