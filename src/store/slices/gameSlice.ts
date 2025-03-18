import { StateCreator } from 'zustand';
import { GameState, Color } from '../types';
import { debugLog } from './debug';

const BOARD_SIZE = 8;

export interface GameSlice {
  resetGame: () => void;
  isGameOver: boolean;
  extraTurnGranted: boolean;
  currentMatchSequence: number;
  currentCombo: number;
  setExtraTurn: (granted: boolean) => void;
  incrementMatchSequence: () => void;
  resetMatchSequence: () => void;
  incrementCombo: () => void;
  resetCombo: () => void;
}

export const createGameSlice: StateCreator<GameState, [], [], GameSlice> = (set, get) => {
  return {
    resetGame: () => {
      set({
        board: Array(BOARD_SIZE).fill(null).map(() => 
          Array(BOARD_SIZE).fill(null).map(() => ({
            color: 'empty' as Color,
            isMatched: false,
            isNew: false,
            isAnimating: false,
            isFrozen: false,
            isIgnited: false
          }))
        ),
        currentPlayer: 'human',
        selectedTile: null,
        isGameOver: false,
        currentMatchSequence: 0,
        currentCombo: 0,
        human: {
          health: 100,
          className: '',
          equippedSkills: [],
          activeSkillId: null,
          skillCastCount: {},
          matchedColors: {
            red: 0,
            blue: 0,
            green: 0,
            yellow: 0,
            black: 0,
            empty: 0
          },
          statusEffects: [],
          defense: 0,
          colorStats: {
            red: 0,
            blue: 0,
            green: 0,
            yellow: 0,
            black: 0,
            empty: 0
          },
          equippedItems: {
            weapon: null,
            armor: null,
            accessory: null,
            trinket: null
          },
          inventory: []
        },
        ai: {
          health: 100,
          className: '',
          equippedSkills: [],
          activeSkillId: null,
          skillCastCount: {},
          matchedColors: {
            red: 0,
            blue: 0,
            green: 0,
            yellow: 0,
            black: 0,
            empty: 0
          },
          statusEffects: [],
          defense: 0,
          colorStats: {
            red: 0,
            blue: 0,
            green: 0,
            yellow: 0,
            black: 0,
            empty: 0
          },
          equippedItems: {
            weapon: null,
            armor: null,
            accessory: null,
            trinket: null
          },
          inventory: []
        }
      });
    },
    isGameOver: false,
    extraTurnGranted: false,
    currentMatchSequence: 0,
    currentCombo: 0,

    setExtraTurn: (granted: boolean) => set({ extraTurnGranted: granted }),
    incrementMatchSequence: () => set(state => ({ currentMatchSequence: state.currentMatchSequence + 1 })),
    resetMatchSequence: () => set({ currentMatchSequence: 0 }),
    incrementCombo: () => set(state => ({ currentCombo: state.currentCombo + 1 })),
    resetCombo: () => set({ currentCombo: 0 })
  };
}; 