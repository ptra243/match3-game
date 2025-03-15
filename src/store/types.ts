export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';
export type Player = 'human' | 'ai';

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
  isFrozen?: boolean;  // For Cryomancer effects
}

export interface PlayerState {
  health: number;
  matchedColors: Record<Color, number>;
  className: string;  // Key into CLASSES
  activeSkillIndex: number | null;  // Index of the currently selected skill
  statusEffects: {
    damageMultiplier: number;
    resourceMultiplier: number;
    turnsRemaining: number;
    extraTurn?: boolean;  // For Time Weaver's Temporal Surge
    manaConversion?: {
      from: Color;
      to: Color;
      ratio: number;  // How many 'from' mana needed for 1 'to' mana
    };
    convertTiles?: {
      color: Color;
      count: number;  // Number of tiles to convert after match
    };
  }[];
  skillCastCount: Record<number, number>;  // Track how many times each skill index has been cast
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
  // Animation control
  animationInProgress: boolean;
  signalAnimationComplete: () => void;
  waitForAnimation: () => Promise<void>;  // Add method to wait for animations

  // Board methods
  initializeBoard: () => void;
  dropTiles: () => void;
  fillEmptyTiles: () => void;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;  // New method for handling cascading matches

  // Match methods
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;

  // Player methods
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player, skillIndex: number) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  
  // Class methods
  selectClass: (player: Player, className: string) => void;
} 