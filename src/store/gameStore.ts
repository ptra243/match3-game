import { create } from 'zustand';
import { createBoardSlice, BoardSlice } from './slices/boardSlice';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createMatchSlice, MatchSlice } from './slices/matchSlice';
import { createGameSlice, GameSlice } from './slices/gameSlice';
import { createAnimationSlice, AnimationSlice } from './slices/animationSlice';
import { createEventSlice, EventSlice } from './slices/eventSlice';
import { Color, PlayerState, Player, GameState } from './types';
import { CLASSES } from './classes';
import { ALL_SKILLS } from './skills';

// Combine all slices
interface GameStore extends GameState {
  waitForNextFrame: () => Promise<void>;
  resetGame: () => void;
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
  const animationSlice = createAnimationSlice(...args);
  const eventSlice = createEventSlice(...args);

  return {
    ...boardSlice,
    ...playerSlice,
    ...matchSlice,
    ...gameSlice,
    ...animationSlice,
    ...eventSlice,
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
        board: Array(8).fill(null).map(() => 
          Array(8).fill(null).map(() => ({
            color: 'empty',
            isMatched: false,
            isNew: false,
            isAnimating: false,
            isFrozen: false,
            isIgnited: false
          }))
        ),
        activeAnimations: new Map(),
        sequences: new Map(),
        events: new Map(),
        middleware: []
      });
    }
  };
}); 