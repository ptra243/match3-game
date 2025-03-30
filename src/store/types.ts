import { AnimationSlice } from './slices/animationSlice';
import { GameEventType, EventHandler, EventMiddleware, EventSlice, GameEventPayload } from './slices/eventSlice';
import { GameSlice } from './slices/gameSlice';
import { BoardSlice } from './slices/boardSlice';
import { PlayerSlice } from './slices/playerSlice';
import { MatchSlice } from './slices/matchSlice';
import { ItemSlice } from './slices/itemSlice';
import { BlessingSlice } from './slices/blessingSlice';

export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'black' | 'empty';

export type AnimationType = 'explode' | 'fallIn' | 'swap' | 'bounce';

export type PlayerType = 'human' | 'ai';

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

export interface Player {
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

// New unified effect system
export interface Effect {
  triggerType?: 'immediate' | 'OnDamageDealt' | 'OnDamageTaken' | 'StartOfTurn' | 'EndOfTurn' | 'OnMatch' | 'OnSkillCast' | 'OnResourceGained' | 'OnStatusEffectApplied' | 'OnGameOver';
  colorStats?: Record<Color, number>;
  defense?: number;
  health?: number;
  damageMultiplier?: number;
  resourceMultiplier?: number;
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
  onActivate?: (state: any) => void;
  onTrigger?: (state: any, payload: any) => void;
  onExpire?: (state: any) => void;
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
  onTurnStart?: (state: GameState, player: PlayerType) => void;
  type?: string;
  strength?: number;
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
  cost: Record<Color, number>;
  effects: Effect[];
  duration?: number;
}

export interface BattleState {
  currentBattle: number;
  maxBattles: number;
  blessingsCollected: Blessing[];
  playerWins: number;
  aiWins: number;
}

export interface Board {
  rows: number;
  cols: number;
  tiles: Tile[][];
}

export interface Position {
  row: number;
  col: number;
}

export interface GameEvent {
  type: GameEventType;
  payload: GameEventPayload;
  timestamp: number;
}

export interface GameState extends 
  AnimationSlice, 
  EventSlice, 
  GameSlice, 
  BoardSlice, 
  PlayerSlice, 
  MatchSlice,
  ItemSlice,
  BlessingSlice {
  // Additional state properties
  animationState: {
    activeAnimations: Map<string, AnimationInfo>;
    sequences: Map<string, AnimationSequence>;
  };
  currentPlayer: PlayerType;
  human: PlayerState;
  ai: PlayerState;
  selectedTile: Position | null;
  turnNumber: number;
  isGameOver: boolean;
  currentMatchSequence: number;
  currentCombo: number;
  extraTurnGranted: boolean;
  [key: string]: any; // Allow indexing with string keys
}

export interface GameStore extends GameState {
  set: (state: Partial<GameState>) => void;
}