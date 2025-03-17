export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
  isFrozen: boolean;
  isIgnited: boolean;
}

export type Player = 'human' | 'ai';

export interface StatusEffect {
  damageMultiplier: number;
  resourceMultiplier: number;
  turnsRemaining: number;
  extraTurn?: boolean;
  resourceBonus?: {
    matchColor: Color;
    bonusColor: Color;
    bonusAmount: number;
  };
  manaConversion?: {
    from: Color;
    to: Color;
    ratio: number;
  };
  convertTiles?: {
    count: number;
    color: Color;
  };
}

export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  cost: { [key in Color]?: number };
  primaryColor: Color;
  secondaryColor: Color;
  targetColor?: Color;
  requiresTarget: boolean;
  effect: (state: GameState, row?: number, col?: number) => Promise<void>;
}

export interface PlayerState {
  health: number;
  matchedColors: Record<Color, number>;
  className: string;
  activeSkillId: string | null;
  equippedSkills: string[];
  statusEffects: StatusEffect[];
  skillCastCount: Record<string, number>;
}

export interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
  isSpecialShape?: 'T' | 'L';
  length?: number;
}

export interface GameState {
  // Animation state
  animationInProgress: boolean;
  waitForAnimation: () => Promise<void>;
  signalAnimationComplete: () => void;

  // Game state
  isGameOver: boolean;
  extraTurnGranted: boolean;
  currentMatchSequence: number;
  currentCombo: number;
  setExtraTurn: (granted: boolean) => void;
  incrementMatchSequence: () => void;
  resetMatchSequence: () => void;
  incrementCombo: () => void;
  resetCombo: () => void;

  // Board state
  board: Tile[][];
  setBoard: (newBoard: Tile[][]) => void;
  initializeBoard: () => void;
  dropTiles: () => Promise<Tile[][]>;
  fillEmptyTiles: () => Promise<Tile[][]>;
  updateTile: (row: number, col: number, tile: Partial<Tile>) => void;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  
  // Player state
  currentPlayer: Player;
  human: PlayerState;
  ai: PlayerState;
  selectedTile: { row: number; col: number } | null;
  
  // Match handling
  hasValidMoves: () => boolean;
  findMatches: (board: Tile[][]) => Match[];
  processMatches: () => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
  markTilesAsMatched: (tiles: { row: number; col: number }[]) => Promise<{ matchedTiles: { row: number; col: number; color: Color }[] }>;
  markTilesForDestruction: (tiles: { row: number; col: number }[]) => Promise<{ destroyedTiles: { row: number; col: number; color: Color }[] }>;
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => Promise<void>;
  
  // Player actions
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  useSkill: (row: number, col: number) => Promise<void>;
  toggleSkill: (player: Player, skillId: string) => void;
  selectTile: (row: number, col: number) => void;
}

export interface GameStore extends GameState {
  set: (state: Partial<GameState>) => void;
} 