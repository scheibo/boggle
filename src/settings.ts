import { Type, Grade } from './dict';

export type Dice = 'New' | 'Old' | 'Big';
export type MinLength = 3 | 4 | 5;
export type ScoreDisplay = 'Hide' | 'Show' | 'Full';
export type Theme = 'Dark' | 'Light';

export interface Settings {
  dice: Dice;
  dict: Type;
  min: MinLength;
  grade: Exclude<Grade, ' '>;
  display: ScoreDisplay;
  theme?: Theme;
}
