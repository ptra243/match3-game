export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';
export type Player = 'human' | 'ai';

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
}

export interface Skill {
  name: string;
  description: string;
  isReady: boolean;
  isSelected: boolean;
  cost: number;
  damage: number;
  color?: Color;
  targetColor?: Color;
}

export interface PlayerState {
  health: number;
  matchedColors: Record<Color, number>;
  skill: Skill;
}

export interface GameState {
  // State
  board: Tile[][];
  human: PlayerState;
  ai: PlayerState;
  currentPlayer: Player;
  selectedTile: { row: number; col: number } | null;
  isGameOver: boolean;
  currentMatchSequence: number;
  currentCombo: number;

  // Board methods
  initializeBoard: () => void;
  dropTiles: () => void;
  fillEmptyTiles: () => void;

  // Match methods
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;

  // Player methods
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
} 