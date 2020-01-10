'use strict';

function settingsEqual(a, b) {
  return a.dice === b.dice &&
    a.min === b.min &&
    a.dict === b.dict &&
    a.grade === b.grade &&
    a.blind === b.blind;
}

function updateRequired() {
  return SEED !== ORIGINAL.seed || !settingsEqual(SETTINGS, ORIGINAL.settings);
}

function maybePerformUpdate() {
  if (updateRequired()) {
    RANDOM = new Random(seed);
    TRAINING = new TrainingPool(DICT, RANDOM, SETTINGS);
    ORIGINAL.settings = SETTINGS;
    ORIGINAL.seed = SEED;
  }
}

function updateSettings(settings) {
  // TODO: update seed and update field based on setting and vice versa

  Object.assign(SETTINGS, settings);
  localStorage.setItem('settings', JSON.stringify(SETTINGS));

  const id = Game.encodeID(SETTINGS, SEED);
  document.getElementById('seed').textContent = id;
  window.history.pushState(null, null, `#${id}`);

  if (updateRequired()) {
    document.getElementById('back').classList.add('hidden');
    document.getElementById('refresh').classList.remove('hidden');
  } else {
    document.getElementById('refresh').classList.add('hidden');
    document.getElementById('back').classList.remove('hidden');
  }
}

function updateDOMSettings() {
  document.getElementById('seed').textContent = Game.encodeID(SETTINGS, SEED);
  document.getElementById(`dice${SETTINGS.dice}`).checked = true;
  document.getElementById(`min${SETTINGS.min}`).checked = true;
  document.getElementById(`dict${SETTINGS.dict}`).checked = true;
  document.getElementById(`grade${SETTINGS.grade}`).checked = true;
  document.getElementById('blind').checked = !!SETTINGS.blind;
}

(() => {
  document.getElementById('refresh').addEventListener('long-press', e => {
    if (!document.getElementById('settings').classList.contains('hidden')) {
      refreshClick();
      return;
    }

    HASH_REFRESH = false;

    const wrapper = document.getElementById('wrapper');
    if (wrapper) display.removeChild(wrapper);

    const board = document.getElementById('board');
    board.classList.add('hidden');
    word.classList.add('hidden');
    defn.classList.add('hidden');

    updateVisibility({
      show: ['back', 'timer', 'practice', 'settings'],
      hide: ['refresh', 'play', 'score']
    });

    ORIGINAL = {settings: Object.assign({}, SETTINGS), seed: SEED};
    updateDOMSettings();
  });

  for (const radio of document.querySelectorAll('input[name=dice]')) {
    radio.addEventListener('click', e => {
      if (radio.value === 'Big') {
        document.getElementById('min4').checked = true;
      } else {
        document.getElementById('min3').checked = true;
      }
      updateSettings({dice: radio.value, min: radio.value === 'Big' ? 4 : 3});
    });
  }
  for (const radio of document.querySelectorAll('input[name=min]')) {
    radio.addEventListener('click', () => updateSettings({min: Number(radio.value)}));
  }
  for (const radio of document.querySelectorAll('input[name=dict]')) {
    radio.addEventListener('click', () => updateSettings({dict: radio.value}));
  }
  for (const radio of document.querySelectorAll('input[name=grade]')) {
    radio.addEventListener('click', () => updateSettings({grade: radio.value}));
  }
  document.getElementById('blind').addEventListener('click', e => {
    updateSettings({blind: document.getElementById('blind').checked});
  });
})();
