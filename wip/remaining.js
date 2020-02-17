  // - requirement => hash reflects current SETTINGS and SEED value
  // - if on board, the seed and settings applied must reflect hash (and thus SETTINGS and SEED.
  // BoardView MAY have out of date game/game settings (until user switches back)



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