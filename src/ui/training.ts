class TrainingView extends View {
  async attach() {
    await Promise.all([LOADED.TRAINING, LOADED.DICT, LOADED.STATS()]);
    if (!this.pool || this.pool.type !== SETTINGS.dict) {
      const store = new Store('training', SETTINGS.dict);
      this.pool = await TrainingPool.create(
        STATS, SETTINGS.dice, SETTINGS.dict, store, SETTINGS.min);
    }

    this.train = createElementWithId('div', 'train');
    this.next();
    return this.train;
  }

  async detach() {
    if (this.restore) await this.restore();
    this.content = null;
    return this.train;
  }

  next() {
    const content = createElementWithId('div', 'content');
    const progress = createElementWithId('div', 'progress');
    progress.textContent = this.pool.size();

    const {label, group, update, restore} = this.pool.next();
    this.restore = restore;
    const trainWord = document.createElement('div');
    trainWord.classList.add('word');
    trainWord.textContent = label;

    const sizeHint = createElementWithId('div', 'sizeHint');
    sizeHint.classList.add('hidden');
    sizeHint.textContent = group.length;

    const rating = this.createRatingToggles(update);
    const table = document.createElement('table');
    table.classList.add('results', 'hidden');
    addAnagramRows(table, group);

    progress.addEventListener('mouseup', () => UI.toggleView('Review', progress.textContent));
    progress.addEventListener('long-press', () => {
      if (!rating.classList.contains('hidden')) return;
      sizeHint.classList.remove('hidden')
    });
    progress.addEventListener('long-press-up', () => sizeHint.classList.add('hidden'));

    const back = createBackButton(() => UI.toggleView('Menu'));
    content.appendChild(createTopbar(back, null, progress));

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');
    wrapper.appendChild(trainWord);
    wrapper.appendChild(table);

    content.appendChild(wrapper);
    content.appendChild(sizeHint);
    content.appendChild(rating);

    const listener = e => {
      if (![back, progress].includes(e.target)) {
        content.removeEventListener('click', listener);
        trainWord.classList.add('hidden');
        table.classList.remove('hidden');
        rating.classList.remove('hidden');
      }
    };
    content.addEventListener('click', listener);

    if (this.content) this.train.removeChild(this.content);
    this.train.appendChild(content);
    this.content = content;
  }

  createRatingToggles(update) {
    const toggles = document.createElement('div');
    toggles.setAttribute('id', 'rating');
    toggles.classList.add('toggle-group');
    toggles.classList.add('horizontal');
    toggles.classList.add('hidden');

    for (let i = 0; i < 6; i++) {
      const toggle = document.createElement('button');
      toggle.setAttribute('id', `rating${i}`);
      toggle.setAttribute('type', 'button');
      toggle.classList.add('toggle');
      toggle.textContent = i;

      toggles.appendChild(toggle);

      toggle.addEventListener('click', async () => {
        await update(Number(toggle.textContent));
        this.restore = null;
        this.next();
      });
    }

    return toggles;
  }
}