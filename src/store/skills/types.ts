import { Color } from '../types';
import { GameState } from '../types';

export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  cost: Partial<Record<Color, number>>;
  primaryColor: Color;
  secondaryColor?: Color;
  targetColor?: Color;
  requiresTarget?: boolean;
  effect: (state: GameState, row: number, col: number) => Promise<void>;
} 