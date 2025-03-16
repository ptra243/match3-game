export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';
export type Player = 'human' | 'ai';

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
  isFrozen: boolean;
  isIgnited: boolean;
}

export interface PlayerState {
  health: number;
  matchedColors: Record<Color, number>;
  className: string;  // Key into CLASSES
  activeSkillId: string | null;  // ID of the currently selected skill
  equippedSkills: string[];  // List of equipped skill IDs
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
    resourceBonus?: {
      matchColor: Color;  // When this color is matched
      bonusColor: Color;  // Gain this color as bonus
      bonusAmount: number;  // Amount to gain per match
    };
  }[];
  skillCastCount: Record<string, number>;  // Track how many times each skill has been cast
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
  updateTile: (row: number, col: number, tile: Partial<Tile>) => void;  // New method for updating a single tile

  // Match methods
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;

  // Player methods
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: Player) => void;
  toggleSkill: (player: Player, skillId: string) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  
  // Class methods
  selectClass: (player: Player, className: string) => void;
  equipSkill: (player: Player, skillId: string, slotIndex: number) => void;
}

export interface GameStore extends GameState {
  set: (state: Partial<GameState>) => void;
}

export interface ClassSkill {
  id: string;
  name: string;
  description: string;
  cost: Partial<Record<Color, number>>;
  primaryColor: Color;
  secondaryColor: Color;
  targetColor?: Color;
  requiresTarget?: boolean;
  effect: (state: GameState, row?: number, col?: number) => Promise<void>;
} 