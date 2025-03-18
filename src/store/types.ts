import { AnimationSlice } from './slices/animationSlice';
import { GameEventType, EventHandler, EventMiddleware, EventSlice } from './slices/eventSlice';
import { GameSlice } from './slices/gameSlice';
import { BoardSlice } from './slices/boardSlice';
import { PlayerSlice } from './slices/playerSlice';
import { MatchSlice } from './slices/matchSlice';

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

// Combine all slices into the GameState interface
export interface GameState extends 
  AnimationSlice, 
  EventSlice, 
  GameSlice, 
  BoardSlice, 
  PlayerSlice, 
  MatchSlice {
  // Additional state properties
  activeAnimations: Map<string, AnimationInfo>;
  sequences: Map<string, AnimationSequence>;
  currentPlayer: Player;
  human: PlayerState;
  ai: PlayerState;
  selectedTile: { row: number; col: number } | null;
}

export interface GameStore extends GameState {
  set: (state: Partial<GameState>) => void;
} 