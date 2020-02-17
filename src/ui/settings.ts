class SettingsView extends View {
  attach() {
    this.settings = createElementWithId('div', 'settings');

    const createRow = (e) => {
      const row = document.createElement('div');
      row.classList.add('row');
      row.appendChild(e);
      return row;
    };

    const seed = createElementWithId('div', 'seed');
    seed.textContent = Game.encodeID(SETTINGS, SEED);
    seed.setAttribute('contenteditable', true);
    seed.addEventListener('input', () => this.onInput(seed.textContent));
    const back = createBackButton(() => UI.toggleView('Menu'));
    this.settings.appendChild(createTopbar(back, seed, null));

    const checkedRadioRow = (k, opts, fn, id) =>
      createRow(createRadios(id || k, opts.map(s => s === String(SETTINGS[k]) ? [s] : s), fn));
    this.settings.appendChild(checkedRadioRow('dice', ['New', 'Old', 'Big'], function () {
      const min = this.value === 'Big' ? 4 : 3;
      document.getElementById(`min${min}`).checked = true;
      updateSettings({dice: this.value, min});
    }));
    this.settings.appendChild(checkedRadioRow('min', ['3', '4', '5'], function () {
      updateSettings({min: Number(this.value)});
    }));
    this.settings.appendChild(checkedRadioRow('dict', ['NWL', 'ENABLE', 'CSW'], function () {
      updateSettings({dict: this.value});
    }));
    this.settings.appendChild(checkedRadioRow('grade', ['A', 'B', 'C', 'D'], function () {
      updateSettings({grade: this.value});
    }));
    this.settings.appendChild(checkedRadioRow('display', ['Hide', 'Show', 'Full'], function () {
      updateSettings({display: this.value});
    }, 'scoreDisplay'));
    this.settings.appendChild(checkedRadioRow('theme', ['Light', 'Dark'], function () {
      updateSettings({theme: this.value});
      setTheme(this.value);
    }));

    return this.settings;
  }

  detach() {
    return this.settings;
  }

  update() {
    const seed = document.getElementById('seed');
    seed.textContent = Game.encodeID(SETTINGS, SEED);
    seed.classList.remove('error');
    document.getElementById(`dice${SETTINGS.dice}`).checked = true;
    document.getElementById(`min${SETTINGS.min}`).checked = true;
    document.getElementById(`dict${SETTINGS.dict}`).checked = true;
    document.getElementById(`grade${SETTINGS.grade}`).checked = true;
    document.getElementById(`scoreDisplay${SETTINGS.display}`).checked = true;
    document.getElementById(`theme${SETTINGS.theme || 'Light'}`).checked = true;
  }

  onInput(id) {
    const [settings, seed] = Game.decodeID(id);
    if (isNaN(seed) || !(settings.dice && settings.dict && settings.min)) {
      document.getElementById('seed').classList.add('error');
    } else {
      updateSettings(settings, seed, false);
      this.update();
    }
  }
}