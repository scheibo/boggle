'use strict';

const Debug = (new class {
  async backup() {
    const data = { history: await STORE.get('history') };
    for (const type of ['NWL', 'ENABLE', 'CSW']) {
      store = new Store('training', type);
      data[type] = await store.get('data');
    }
    data.settings = JSON.parse(localStorage.getItem('settings'));
    return JSON.stringify(data);
  }

  async restore(data) {
    await STORE.set('history', data.history);
    for (const type of ['NWL', 'ENABLE', 'CSW']) {
      store = new Store('training', type);
      await store.set('data', data[type]);
    }
    localStorage.setItem('settings', JSON.stringify(data.settings));
  }

  async modify(w, fn) {
    const store = new Store('training', SETTINGS.dict);
    const pool = await TrainingPool.create(STATS, SETTINGS.dice, SETTINGS.dict, store, SETTINGS.min);
    const k = Stats.toAnagram(w);

    let found;
    const popped = [];
    for (found = pool.learned.pop(); found && found.k != k; ) popped.push(found);
    if (!found) throw RangeError();

    pool.learned.push(fn(found));
    for (const p of popped) pool.learned.push(p);

    return store.set('data', pool.learned.data);
  }
}());