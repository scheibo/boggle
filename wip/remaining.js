var LAST = '';
var LAST_DEFINITION = '';

let kept = false;

const TOUCH = ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0);

let existing = JSON.parse(localStorage.getItem('current'));
if (existing && existing.timer > 0 &&
  (!document.location.hash || document.location.hash.slice(1) === existing.game.seed) &&
  Object.values(existing.game.words).filter(v => v > 0).length > 0) {
  const game = Game.fromJSON(existing.game, TRIE, DICT, STATS);
  SEED = game.random.seed;
  Object.assign(SETTINGS, game.settings);
  game.settings = SETTINGS;
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
} else {
  existing = null;
  const initial = setup();
  SEED = initial.seed;
  Object.assign(SETTINGS, initial.settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));
}
fn(existing);

document.getElementById('menuPlay').addEventListener('click', () => init(async (existing) => {
  if (existing) {
    const timer = new Timer(existing.timer, () => {
      if (!game.expired) game.expired = +new Date();
    }, saveGame);
    STATE = await refresh(false, timer, game);
    LAST = existing.last;
  } else {
    STATE = await refresh();
  }
}));

function setup() {
  if (document.location.hash && document.location.hash.length > 1) {
    const [settings, seed] = Game.decodeID(document.location.hash.slice(1));
    if (!isNaN(seed)) return {settings, seed};
  }

  if (HISTORY.length) {
    const id = HISTORY[HISTORY.length - 1].seed;
    const [settings] = Game.decodeID(id);
    const rand = new Random();
    rand.seed = SEED;
    rand.next();

    return {settings, seed: rand.seed};
  }

  return {settings: SETTINGS, seed: SEED};
}

async function refresh(allowDupes, timer, game) {

  if (STATE) {
    const last = HISTORY[HISTORY.length];
    if (last && !Object.keys(last.words).length) HISTORY.pop();
    updateGames(STATE.game);
    HISTORY.push(STATE.game.toJSON());
    PLAYED.add(STATE.game.id);
    await STORE.set('history', HISTORY);
    STATE.timer.stop();
  }

}