import { AnimationSlice } from './slices/animationSlice';
import { GameEventType, EventHandler, EventMiddleware, EventSlice, GameEventPayload } from './slices/eventSlice';
import { GameSlice } from './slices/gameSlice';
import { BoardSlice } from './slices/boardSlice';
import { PlayerSlice } from './slices/playerSlice';
import { MatchSlice } from './slices/matchSlice';
import { BlessingSlice } from './slices/blessingSlice';
import { ItemSlice } from './slices/itemSlice';

export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';

export type AnimationType = 'explode' | 'fallIn' | 'swap' | 'bounce';

export interface AnimationInfo {
  id: string;
  type: AnimationType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  elementIds: string[];
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

export interface AnimationSequence {
  id: string;
  animations: AnimationInfo[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface Tile {
  color: Color;
  isMatched: boolean;
  isNew: boolean;
  isAnimating: boolean;
  isFrozen: boolean;
  isIgnited: boolean;
}

export type Player = 'human' | 'ai';

// New unified effect system
export interface Effect {
  // Stats that can be granted
  colorStats?: Partial<Record<Color, number>>;
  defense?: number;
  health?: number;
  resourceBonus?: Partial<Record<Color, number>>;
  damageMultiplier?: number;
  resourceMultiplier?: number;
  
  // Callbacks for different events
  onTurnStart?: (state: GameState) => void;
  onTurnEnd?: (state: GameState) => void;
  onMatch?: (state: GameState, color: Color) => void;
  onDamageDealt?: (state: GameState, damage: number) => number;
  onDamageTaken?: (state: GameState, damage: number) => number;
  onActivate?: (state: GameState) => void;
  onExpire?: (state: GameState) => void;
  
  // Event-based trigger system
  triggerType?: 'immediate' | GameEventType; // When this effect should be activated
  onTrigger?: (state: GameState, event: GameEventPayload) => void;
  
  // For status effects
  turnsRemaining?: number;
  extraTurn?: boolean;
  resourceConversion?: {
    from: Color;
    to: Color;
    ratio: number;
  };
  convertTiles?: {
    count: number;
    color: Color;
  };
}

export interface StatusEffect {
  damageMultiplier: number;
  resourceMultiplier: number;
  turnsRemaining: number;
  extraTurn?: boolean;
  skillDamageMultiplier?: number; // Multiplier specifically for skill damage
  skillDamageReduction?: number; // Flat reduction specifically for skill damage
  colorStatBonus?:  Record<Color, number>,
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
  onExpire?: () => void;
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

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  slot: 'weapon' | 'armor' | 'accessory' | 'trinket';
  effects: Effect[];
}

export interface PlayerState {
  health: number;
  defense: number;
  matchedColors: Record<Color, number>;
  className: string;
  activeSkillId: string | null;
  equippedSkills: string[];
  statusEffects: StatusEffect[];
  skillCastCount: Record<string, number>;
  colorStats: Record<Color, number>;
  equippedItems: {
    weapon: Item | null;
    armor: Item | null;
    accessory: Item | null;
    trinket: Item | null;
  };
  inventory: Item[];
}

export interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
  isSpecialShape?: 'T' | 'L';
  length?: number;
}

// Updated blessing interface to use effects
export interface Blessing {
  id: string;
  name: string;
  description: string;
  color: Color;
  cost: number;
  effects: Effect[];
  duration?: number; // How many turns the blessing lasts, undefined means permanent
}

export interface BattleState {
  currentBattle: number;
  maxBattles: number;
  blessingsCollected: Blessing[];
  playerWins: number;
  aiWins: number;
}

// Combine all slices into the GameState interface
export interface GameState extends 
  AnimationSlice, 
  EventSlice, 
  GameSlice, 
  BoardSlice, 
  PlayerSlice, 
  MatchSlice,
  BlessingSlice,
  ItemSlice {
  // Additional state properties
  animationState: {
    activeAnimations: Map<string, AnimationInfo>;
    sequences: Map<string, AnimationSequence>;
  };
  currentPlayer: Player;
  human: PlayerState;
  ai: PlayerState;
  selectedTile: { row: number; col: number } | null;
  
  // Battle progression
  battleState: BattleState;
  startNewBattle: () => void;
  endBattle: (winner: Player) => void;
  offerPostBattleReward: () => void;
}

export interface GameStore extends GameState {
  set: (state: Partial<GameState>) => void;
} 