import {global} from './global';
import {UI, View} from './ui';

export class MenuView implements View {
  menu!: HTMLElement;
  toJSON() {}
  attach() {
    this.menu = UI.createElementWithId('div', 'menu');
    const title = UI.createElementWithId('h1', 'title');
    title.textContent = 'BOGGLE';
    // TODO: needs testing!
    title.addEventListener('long-press', async () => {
      const key = (await caches.keys()).find(n => n.startsWith('cache'));
      if (key) await caches.delete(key);
      document.location.reload(true);
    });
    this.menu.appendChild(title);
    const nav = document.createElement('nav');

    const createButton = (name: string, fn: () => void) => {
      const button = document.createElement('button');
      button.classList.add('toggle');
      button.textContent = name;
      button.addEventListener('click', fn);
      return button;
    }

    if (UI.Views.Board.game) {
      nav.appendChild(createButton('RESUME', () => UI.toggleView('Board', {resume: true})));
      nav.appendChild(createButton('NEW GAME', () => UI.toggleView('Board')));
    } else {
      nav.appendChild(createButton('PLAY', () => UI.toggleView('Board')));
    }
    nav.appendChild(createButton('TRAIN', () => UI.toggleView('Training')));
    nav.appendChild(createButton('DEFINE', () => UI.toggleView('Define')));
    nav.appendChild(createButton('STATS', () => UI.toggleView('Stats')));
    nav.appendChild(createButton('SETTINGS', () => UI.toggleView('Settings')));

    this.menu.appendChild(nav);
    return this.menu;
  }

  detach() {
    return this.menu;
  }
}
