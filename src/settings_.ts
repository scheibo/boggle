import { Type, Grade } from './dict';

export type Dice = 'New' | 'Old' | 'Big';

export type MinLength = 3 | 4 | 5;

export interface Settings {
  dice: Dice;
  dict: Type;
  min: MinLength;
  grade: Exclude<Grade, ' '>;
  blind?: boolean;
}
