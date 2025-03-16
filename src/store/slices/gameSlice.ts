import { StateCreator } from 'zustand';
import { GameState, Color } from '../types';

const BOARD_SIZE = 8;

export interface GameSlice {
  resetGame: () => void;
}

export const createGameSlice: StateCreator<GameState, [], [], GameSlice> = (set) => ({
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
        equippedSkills: ['', '', ''],
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
        statusEffects: []
      },
      ai: {
        health: 100,
        className: '',
        equippedSkills: ['', '', ''],
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
        statusEffects: []
      }
    });
  },
}); 