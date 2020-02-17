export const DEFAULTS = {dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show'};
export const SETTINGS = JSON.parse(localStorage.getItem('settings')) || DEFAULTS;
export const STORE = new Store('db', 'store');
export const LIMIT = 500;

const fetchJSON = url => fetch(url, {mode: 'no-cors'}).then(j => j.json());
export let DICT, STATS, HISTORY, TRIE, GAMES, SEED = 0;

// TODO: TRIE, STATS, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
export const LOADED = {
    DICT: fetchJSON('data/dict.json').then(d => { DICT = d; }),
    TRIE: async () => {
      if (TRIE) return;
      await LOADED.DICT;
      TRIE = Trie.create(DICT);
    },
    STATS: async () => {
      if (STATS) return;
      let stats;
      await Promise.all([
        LOADED.DICT,
        fetchJSON('data/stats.json').then(s => { stats = s; }),
      ]);
      STATS = new Stats(stats, DICT);
    },
    HISTORY: STORE.get('history').then(h => HISTORY = h || []),
    TRAINING: Store.setup('training', ['NWL', 'ENABLE', 'CSW']),
  };