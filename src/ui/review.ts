class ReviewView extends View {
  constructor(json) {
    super();
    this.size = json ? json.size : 0;
  }

  toJSON() {
    return {size: this.size};
  }

  async attach(size) {
    await Promise.all([LOADED.DICT, LOADED.STATS()]);

    this.review = createElementWithId('div', 'review');
    if (size) this.size = size;

    const back = createBackButton(() => UI.toggleView('Training'));
    const progress = createElementWithId('div', 'progress');
    progress.textContent = this.size;
    this.review.appendChild(createTopbar(back, null, progress));

    const d = SETTINGS.dice.charAt(0).toLowerCase();
    const score = k => STATS.anagrams(k, SETTINGS.dice)[d] || 0;

    const store = new Store('training', SETTINGS.dict);
    const data = await store.get('data');
    const keys = data
      .filter(w => w.e < 2.0) // TODO: !v.c, figure out 2.0 based on average?
      .sort((a, b) => score(b.k) / b.e - score(a.k) / a.e)
      .map(w => w.k);

    const wrapper = document.createElement('div');
    wrapper.classList.add('wrapper');

    for (const k of keys) {
      const table = document.createElement('table');
      table.classList.add('results');
      addAnagramRows(table, order(STATS.anagrams(k, SETTINGS.dice).words));
      wrapper.appendChild(table);
    }
    this.review.appendChild(wrapper);

    return this.review;
  }

  detach() {
    return this.review;
  }
}