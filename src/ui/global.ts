// tslint:disable:no-var-keyword prefer-const
import {Store} from '../store';
import {Settings} from '../settings';
import {Trie} from '../trie';
import {Dictionary} from '../dict';
import {GameJSON} from '../game';
import {Stats, Data} from '../stats';

const DEFAULTS: Settings = {dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show'};
const SETTINGS: Settings = JSON.parse(localStorage.getItem('settings')!) || DEFAULTS;
const STORE = new Store('db', 'store');
const LIMIT = 500;

var DICT!: Dictionary;
var STATS!: Stats;
var HISTORY!: GameJSON[];
var TRIE!: Trie;
var GAMES!: Array<[{ [word: string]: any }, Set<string>]> | undefined;
var SEED = 0;

const fetchJSON = (url: string) => fetch(url, {mode: 'no-cors'}).then(j => j.json());
// TODO: TRIE, STATS, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
const LOADED = {
    DICT: fetchJSON('data/dict.json').then(d => { DICT = d; }),
    TRIE: async () => {
      if (TRIE) return;
      await LOADED.DICT;
      TRIE = Trie.create(DICT);
    },
    STATS: async () => {
      if (STATS) return;
      let stats: Data;
      await Promise.all([
        LOADED.DICT,
        fetchJSON('data/stats.json').then(s => { stats = s; }),
      ]);
      STATS = new Stats(stats!, DICT);
    },
    HISTORY: STORE.get('history').then(h => HISTORY = h as GameJSON[] || []),
    TRAINING: Store.setup('training', ['NWL', 'ENABLE', 'CSW']),
  };

  export const global = {
    SETTINGS,
    STORE,
    LIMIT,
    DICT,
    STATS,
    HISTORY,
    TRIE,
    GAMES,
    SEED,
    LOADED
  };