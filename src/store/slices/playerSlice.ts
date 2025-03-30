import {StateCreator} from 'zustand';
import {Color, GameState, PlayerType, PlayerState} from '../types';
import {toast} from 'react-hot-toast';
import {CLASSES} from '../classes';
import {ALL_SKILLS} from '../skills';
import {debugLog} from '../slices/debug';
import {PlayerActions} from '../actions/player/playerActions';
import {GameFlow} from '../actions/game/gameflow';
import {AI} from '../actions/ai/ai';

export interface PlayerSlice {
  human: PlayerState;
  ai: PlayerState;
  currentPlayer: PlayerType;
  aiDifficulty: number; // 1-5, where 5 is the hardest
  selectedTile: { row: number; col: number } | null;
  selectTile: (row: number, col: number) => void;
  checkSkillReadiness: (player: PlayerType) => void;
  toggleSkill: (player: PlayerType, skillId: string) => void;
  useSkill: (row: number, col: number) => Promise<void>;
  switchPlayer: () => void;
  makeAiMove: () => Promise<void>;
  selectClass: (player: PlayerType, className: string) => void;
  equipSkill: (player: PlayerType, skillId: string, slotIndex: number) => void;
  setAiDifficulty: (level: number) => void;
  
  // Updated damage function signature
  takeDamage: (attacker: PlayerType, defender: PlayerType, damageAmount: number, isDirectDamage: boolean, isSkillDamage?: boolean) => number;
  
  // Item management functions
  equipItem: (player: PlayerType, itemId: string) => void;
  unequipItem: (player: PlayerType, slot: 'weapon' | 'armor' | 'accessory' | 'trinket') => void;
  addItemToInventory: (player: PlayerType, itemId: string) => void;
  removeItemFromInventory: (player: PlayerType, itemId: string) => void;
  calculatePlayerStats: (player: PlayerType) => void;
}

export const createInitialPlayerState = (isHuman: boolean = false): PlayerState => {
  const className = isHuman ? 'pyromancer' : 'shadowPriest';
  const defaultSkills = CLASSES[className].defaultSkills;
  const characterClass = CLASSES[className];
  
  // Initialize color stats based on character class
  const colorStats: Record<Color, number> = {
    red: 0,
    green: 0,
    blue: 0,
    yellow: 0,
    black: 0,
    empty: 0
  };
  
  // Set primary and secondary color stats
  colorStats[characterClass.primaryColor] = 3;
  colorStats[characterClass.secondaryColor] = 1;
  
  return {
    health: 100,
    defense: 0,
    matchedColors: {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0,
    },
    className,
    activeSkillId: null,
    equippedSkills: defaultSkills,
    statusEffects: [],
    skillCastCount: {},
    colorStats,
    // Keep these for type compatibility but don't use them
    equippedItems: {
      weapon: null,
      armor: null,
      accessory: null,
      trinket: null
    },
    inventory: []
  };
};

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set, get) => ({
  human: createInitialPlayerState(true),
  ai: createInitialPlayerState(false),
  currentPlayer: 'human',
  aiDifficulty: 3, // Default to medium difficulty
  selectedTile: null,

  selectTile: (row: number, col: number) => {
    PlayerActions.selectTile(get(), row, col);
  },

  selectClass: (player: PlayerType, className: string) => {
    PlayerActions.selectClass(get(), player, className);
  },

  equipSkill: (player: PlayerType, skillId: string, slotIndex: number) => {
    PlayerActions.equipSkill(get(), player, skillId, slotIndex);
  },

  checkSkillReadiness: (player: PlayerType) => {
    PlayerActions.checkSkillReadiness(get(), player);
  },

  toggleSkill: (player: PlayerType, skillId: string) => {
    PlayerActions.toggleSkill(get(), player, skillId);
  },

  useSkill: async (row: number, col: number) => {
    await PlayerActions.useSkill(get(), row, col);
  },

  switchPlayer: () => {
    GameFlow.switchPlayer(get());
  },

  makeAiMove: async () => {
    await AI.makeMove(get());
  },

  setAiDifficulty: (level: number) => {
    AI.setDifficulty(get(), level);
  },

  takeDamage: (attacker: 'human' | 'ai', defender: 'human' | 'ai', damageAmount: number, isDirectDamage: boolean, isSkillDamage = false) => {
    return PlayerActions.takeDamage(get(), attacker, defender, damageAmount, isDirectDamage, isSkillDamage);
  },

  // Item management functions - disabled for now
  equipItem: (player: 'human' | 'ai', itemId: string) => {
    console.log('Item functionality is disabled');
  },
  
  unequipItem: (player: 'human' | 'ai', slot: 'weapon' | 'armor' | 'accessory' | 'trinket') => {
    console.log('Item functionality is disabled');
  },
  
  addItemToInventory: (player: 'human' | 'ai', itemId: string) => {
    console.log('Item functionality is disabled');
  },
  
  removeItemFromInventory: (player: 'human' | 'ai', itemId: string) => {
    console.log('Item functionality is disabled');
  },
  
  calculatePlayerStats: (player: 'human' | 'ai') => {
    const state = get();
    const playerState = state[player];
    
    // Reset to base stats from class
    const characterClass = CLASSES[playerState.className];
    const colorStats: Record<Color, number> = {
      red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
    };
    
    // Set primary and secondary color stats
    colorStats[characterClass.primaryColor] = 3;
    colorStats[characterClass.secondaryColor] = 1;
    
    // Apply status effects that modify stats
    playerState.statusEffects.forEach(effect => {
      if (effect.damageMultiplier && effect.damageMultiplier !== 1) {
        // Process damage multiplier if needed
      }
    });
    
    // Update player state with calculated stats
    set(state => ({
      [player]: {
        ...state[player],
        colorStats
      }
    }));
  }
}); 