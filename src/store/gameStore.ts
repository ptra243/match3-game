import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { createBoardSlice, BoardSlice } from './slices/boardSlice';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createMatchSlice, MatchSlice } from './slices/matchSlice';
import { Color, PlayerState, Player } from './types';

interface GameStore extends BoardSlice, PlayerSlice, MatchSlice {
  isGameOver: boolean;
  animationInProgress: boolean;
  signalAnimationComplete: () => void;
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
  className: isHuman ? 'pyromancer' : 'shadowPriest',
  activeSkillIndex: null,
  statusEffects: [],
  skillCastCount: {}
});

export const useGameStore = create<GameStore>()((...args) => {
  const [set, get] = args;
  const boardSlice = createBoardSlice(...args);
  const playerSlice = createPlayerSlice(...args);
  const matchSlice = createMatchSlice(...args);

  return {
    isGameOver: false,
    animationInProgress: false,
    signalAnimationComplete: () => {},
    resetGame: () => {
      set({
        human: createInitialPlayerState(true),
        ai: createInitialPlayerState(false),
        currentPlayer: 'human' as Player,
        isGameOver: false,
        selectedTile: null,
        currentMatchSequence: 0,
        currentCombo: 0,
        animationInProgress: false,
      });
      boardSlice.initializeBoard();
    },
    ...boardSlice,
    ...playerSlice,
    ...matchSlice,
  };
}); 