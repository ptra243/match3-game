import { create } from 'zustand';
import { createBoardSlice, BoardSlice } from './slices/boardSlice';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createMatchSlice, MatchSlice } from './slices/matchSlice';
import { createGameSlice, GameSlice } from './slices/gameSlice';
import { Color, PlayerState, Player } from './types';
import { CLASSES } from './classes';
import { ALL_SKILLS } from './skills';

interface GameStore extends BoardSlice, PlayerSlice, MatchSlice, GameSlice {
  animationInProgress: boolean;
  signalAnimationComplete: () => void;
  waitForNextFrame: () => Promise<void>;
}

const createInitialPlayerState = (isHuman: boolean = false): PlayerState => {
  const className = isHuman ? 'pyromancer' : 'shadowPriest';
  return {
    health: 100,
    matchedColors: {
      red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0,
    },
    className,
    activeSkillId: null,
    equippedSkills: CLASSES[className].defaultSkills,
    statusEffects: [],
    skillCastCount: {}
  };
};

export const useGameStore = create<GameStore>()((...args) => {
  const [set, get] = args;
  const boardSlice = createBoardSlice(...args);
  const playerSlice = createPlayerSlice(...args);
  const matchSlice = createMatchSlice(...args);
  const gameSlice = createGameSlice(...args);

  return {
    ...boardSlice,
    ...playerSlice,
    ...matchSlice,
    ...gameSlice,
    animationInProgress: false,
    signalAnimationComplete: () => {},
    waitForNextFrame: () => new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    }),
    resetGame: () => {
      console.log('GameStore - Resetting game');
      set({
        human: createInitialPlayerState(true),
        ai: createInitialPlayerState(false),
        currentPlayer: 'human' as Player,
        isGameOver: false,
        selectedTile: null,
        currentMatchSequence: 0,
        currentCombo: 0,
        extraTurnGranted: false,
        animationInProgress: false,
        board: Array(8).fill(null).map(() => 
          Array(8).fill(null).map(() => ({
            color: 'empty',
            isMatched: false,
            isNew: false,
            isAnimating: false,
            isFrozen: false,
            isIgnited: false
          }))
        )
      });
    }
  };
}); 