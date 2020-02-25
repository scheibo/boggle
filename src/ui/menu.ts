import { UI, View } from './ui';
import { BoardView } from './board';

export class MenuView implements View {
  menu!: HTMLElement;

  toJSON() {}

  attach() {
    // NOTE: The id here would make more sense as '#menu', but uBlock's "Web Annoyances Ultralist" has:
    // 'github.io###menu, .fixedHeaderContainer, .menu-btn:style(position: absolute !important;)'
    this.menu = UI.createElementWithId('div', 'men');
    const title = UI.createElementWithId('h1', 'title');
    title.textContent = 'BOGGLE';
    title.addEventListener('long-press', async () => {
      const key = (await caches.keys()).find(n => n.includes(':cache:'));
      if (key) await caches.delete(key);
      // tslint:disable-next-line: deprecation
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
    };

    if ((UI.Views.Board as BoardView).game) {
      nav.appendChild(createButton('RESUME', () => UI.toggleView('Board')));
      nav.appendChild(createButton('NEW GAME', () => UI.toggleView('Board', { new: true })));
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
