import { StateCreator } from 'zustand';
import { GameState, Color } from '../types';
import { GAME_CONSTANTS } from '../gameRules';
import { createInitialPlayerState } from '../slices/playerSlice';
import { getRandomBlessingsForColors } from '../blessings';
import { debugLog } from './debug';

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
      console.log('GameSlice - Resetting game');
      set((state) => {
        const newState = { ...state };
        
        // Reset basic state properties
        newState.human = createInitialPlayerState(true);
        newState.ai = createInitialPlayerState(false);
        newState.currentPlayer = 'human';
        newState.isGameOver = false;
        newState.selectedTile = null;
        newState.currentMatchSequence = 0;
        newState.currentCombo = 0;
        newState.extraTurnGranted = false;
        newState.turnNumber = 1;
        
        // Reset board
        newState.board = Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() => 
          Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() => ({
            color: 'empty' as Color,
            isMatched: false,
            isNew: false,
            isAnimating: false,
            isFrozen: false,
            isIgnited: false
          }))
        );
        
        // Reset Maps using new Map instances
        newState.animationState = {
          activeAnimations: new Map(),
          sequences: new Map()
        };
        newState.eventState = {
          events: new Map(),
          middleware: []
        };
        
        // Reset battle state
        newState.battleState = {
          currentBattle: 1,
          maxBattles: 5,
          blessingsCollected: [],
          playerWins: 0,
          aiWins: 0
        };
        
        // Reset available blessings
        newState.availableBlessings = getRandomBlessingsForColors();
        
        return newState;
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