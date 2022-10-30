import {Type} from './dict';
import {Grade} from './stats';

export type Dice = 'New' | 'Old' | 'Big';
export type MinLength = 3 | 4 | 5;
export type ScoreDisplay = 'Hide' | 'Show' | 'Full';
export type Shortcuts = 'Shortcuts' | 'None';
export type Theme = 'System' | 'Light' | 'Dark';

export interface Settings {
  dice: Dice;
  dict: Type;
  min: MinLength;
  grade: Exclude<Grade, ' '>;
  display: ScoreDisplay;
  shortcuts: Shortcuts;
  theme: Theme;
}
