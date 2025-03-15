import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { createBoardSlice, BoardSlice } from './slices/boardSlice';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createMatchSlice, MatchSlice } from './slices/matchSlice';
import { Color, PlayerState, Player } from './types';

interface GameStore extends BoardSlice, PlayerSlice, MatchSlice {
  isGameOver: boolean;
  resetGame: () => void;
}

const createInitialPlayerState = (isHuman: boolean = false): PlayerState => ({
  health: 100,
  matchedColors: {
    red: 0,
    green: 0,
    blue: 0,
    yellow: 0,
    black: 0,
    empty: 0,
  },
  skill: isHuman ? {
    name: "Cyclone",
    description: "Use 5 red gems to destroy a black tile and its surrounding tiles",
    isReady: false,
    isSelected: false,
    cost: 5,
    damage: 0,
    color: 'red' as Color,
    targetColor: 'black' as Color
  } : {
    name: "Power Blast",
    description: "Deal 5 damage using 5 matched gems",
    isReady: false,
    isSelected: false,
    cost: 5,
    damage: 5
  }
});

export const useGameStore = create<GameStore>()((...args) => {
  const [set, get] = args;
  const boardSlice = createBoardSlice(...args);
  const playerSlice = createPlayerSlice(...args);
  const matchSlice = createMatchSlice(...args);

  return {
    isGameOver: false,
    resetGame: () => {
      set({
        human: createInitialPlayerState(true),
        ai: createInitialPlayerState(false),
        currentPlayer: 'human' as Player,
        isGameOver: false,
        selectedTile: null,
        currentMatchSequence: 0,
        currentCombo: 0,
      });
      boardSlice.initializeBoard();
    },
    ...boardSlice,
    ...playerSlice,
    ...matchSlice,
  };
}); 