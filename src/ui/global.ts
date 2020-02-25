// tslint:disable:no-var-keyword prefer-const
import { Store } from '../store';
import { Settings } from '../settings';
import { Trie } from '../trie';
import { Dictionary } from '../dict';
import { Game, GameJSON } from '../game';
import { Stats, Data } from '../stats';

const STORE = new Store('db', 'store');
const DEFAULTS: Settings = { dice: 'New', min: 3, dict: 'NWL', grade: 'C', display: 'Show' };
const fetchJSON = (url: string) => fetch(url, { mode: 'no-cors' }).then(j => j.json());
// TODO: TRIE, STATS, GAMES, and the TrainingPool creation
// need to be moved to a background worker and transferred in.
export const global: {
  SETTINGS: Settings;
  STORE: Store;
  LIMIT: number;
  MAX_SEED: number;
  DICT: Dictionary;
  STATS: Stats;
  HISTORY: GameJSON[];
  TRIE: Trie;
  GAMES: Array<[{ [word: string]: any }, Set<string>]> | undefined;
  PLAYED: Set<string> | undefined;
  SEED: number;
  LOADED: {
    DICT: Promise<void>;
    TRIE: () => Promise<void>;
    STATS: () => Promise<void>;
    HISTORY: Promise<void>;
    TRAINING: Promise<void>;
    GAMES: () => Promise<void>;
    PLAYED: () => Promise<void>;
  };
} = {
  SETTINGS: (JSON.parse(localStorage.getItem('settings')!) as Settings) || DEFAULTS,
  STORE,
  LIMIT: 500,
  MAX_SEED: 1e12,
  DICT: (undefined as unknown) as Dictionary,
  STATS: (undefined as unknown) as Stats,
  HISTORY: (undefined as unknown) as GameJSON[],
  TRIE: (undefined as unknown) as Trie,
  GAMES: undefined as Array<[{ [word: string]: any }, Set<string>]> | undefined,
  PLAYED: undefined as Set<string> | undefined,
  SEED: 0,
  LOADED: {
    DICT: fetchJSON('data/dict.json').then(d => {
      global.DICT = d;
    }),
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
        fetchJSON('data/stats.json').then(s => {
          stats = s;
        }),
      ]);
      global.STATS = new Stats(stats!, global.DICT);
    },
    HISTORY: STORE.get('history').then(h => {
      global.HISTORY = (h as GameJSON[]) || [];
    }),
    TRAINING: Store.setup('training', ['NWL', 'ENABLE', 'CSW']) as Promise<void>,
    GAMES: async () => {
      if (global.GAMES) return;
      await Promise.all([
        global.LOADED.HISTORY,
        global.LOADED.TRIE(),
        global.LOADED.DICT,
        global.LOADED.STATS(),
      ]);
      global.GAMES = [];
      for (let i = global.HISTORY.length - 1; i >= 0 && global.GAMES.length < global.LIMIT; i--) {
        const game = Game.fromJSON(global.HISTORY[i], global.TRIE, global.DICT, global.STATS);
        const played = new Set<string>();
        for (const w in game.played) {
          if (game.played[w] > 0) played.add(w);
        }
        global.GAMES.push([game.possible, played]);
      }
    },
    PLAYED: async () => {
      if (global.PLAYED) return;
      await global.LOADED.HISTORY;
      global.PLAYED = new Set();
      for (const h of global.HISTORY) global.PLAYED.add(h.seed);
    },
  },
};
