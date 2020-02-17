// tslint:disable:no-var-keyword prefer-const
import {Store} from '../store';
import {Settings} from '../settings';
import {Trie} from '../trie';
import {Dictionary} from '../dict';
import {GameJSON} from '../game';
import {Stats, Data} from '../stats';

const STORE = new Store('db', 'store');
const DEFAULTS: Settings = {dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show'};
const fetchJSON = (url: string) => fetch(url, {mode: 'no-cors'}).then(j => j.json());
// TODO: TRIE, STATS, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
export const global: {
  SETTINGS: Settings;
  STORE: Store;
  LIMIT: number;
  DICT: Dictionary;
  STATS: Stats;
  HISTORY: GameJSON[];
  TRIE: Trie;
  GAMES: Array<[{ [word: string]: any }, Set<string>]> | undefined;
  SEED: number;
  LOADED: {
    DICT: Promise<void>;
    TRIE: () => Promise<void>;
    STATS: () => Promise<void>;
    HISTORY: Promise<void>;
    TRAINING: Promise<void>;
  };
} = {
  SETTINGS: JSON.parse(localStorage.getItem('settings')!) as Settings || DEFAULTS,
  STORE,
  LIMIT: 500,
  DICT: undefined as unknown as Dictionary,
  STATS: undefined as unknown as Stats,
  HISTORY: undefined as unknown as GameJSON[],
  TRIE: undefined as unknown as Trie,
  GAMES: undefined as Array<[{ [word: string]: any }, Set<string>]> | undefined,
  SEED: 0,
  LOADED: {
    DICT: fetchJSON('data/dict.json').then(d => { global.DICT = d; }),
    TRIE: async () => {
      if (global.TRIE) return;
      await global.LOADED.DICT;
      global.TRIE = Trie.create(global.DICT);
    },
    STATS: async () => {
      if (global.STATS) return;
      let stats: Data;
      await Promise.all([
        global.LOADED.DICT,
        fetchJSON('data/stats.json').then(s => { stats = s; }),
      ]);
      global.STATS = new Stats(stats!, global.DICT);
    },
    HISTORY: STORE.get('history').then(h => { global.HISTORY = h as GameJSON[] || []}),
    TRAINING: Store.setup('training', ['NWL', 'ENABLE', 'CSW']) as Promise<void>,
  },
};

  // @ts-ignore
  window.global = global;