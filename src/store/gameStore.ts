import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { createBoardSlice } from './slices/boardSlice';
import { createInitialPlayerState, createPlayerSlice } from './slices/playerSlice';
import { createMatchSlice } from './slices/matchSlice';
import { createGameSlice } from './slices/gameSlice';
import { createAnimationSlice } from './slices/animationSlice';
import { createEventSlice, GameEventType, EventHandler } from './slices/eventSlice';
import { createBlessingSlice } from './slices/blessingSlice';
import { createItemSlice } from './slices/itemSlice';
import { createLoggerMiddleware } from './middleware/loggerMiddleware';
import { Color, Player, GameState, BattleState, AnimationInfo, AnimationSequence } from './types';
import { getRandomBlessingsForColors } from './blessings';
import { toast } from 'react-hot-toast';
import { debugLog } from './slices/debug';

// Enable Immer's MapSet plugin
enableMapSet();

// Combine all slices
interface GameStore extends GameState {
  waitForNextFrame: () => Promise<void>;
  resetGame: () => void;
  startNewBattle: () => void;
  endBattle: (winner: Player) => void;
  offerPostBattleReward: () => void;
}

// Initial values for store
const initialState = {
  battleState: {
    currentBattle: 1,
    maxBattles: 5,
    blessingsCollected: [],
    playerWins: 0,
    aiWins: 0
  } as BattleState,
  middleware: []
};

// Create the store with proper middleware order
export const useGameStore = create<GameStore>()(
  devtools(
    immer(
      (set, get, store) => {
        // Create slices with the original set function
        const boardSlice = createBoardSlice(set, get, store);
        const playerSlice = createPlayerSlice(set, get, store);
        const matchSlice = createMatchSlice(set, get, store);
        const gameSlice = createGameSlice(set, get, store);
        const animationSlice = createAnimationSlice(set, get, store);
        const eventSlice = createEventSlice(set, get, store);
        const blessingSlice = createBlessingSlice(set, get, store);
        const itemSlice = createItemSlice(set, get, store);

        // Setup handlers for event-based blessing triggers
        setTimeout(() => {
          blessingSlice.setupBlessingEventHandlers();
          itemSlice.setupItemEventHandlers();
        }, 0);

        // Create the store with all slices
        const storeWithSlices = {
          ...initialState,
          ...boardSlice,
          ...playerSlice,
          ...matchSlice,
          ...gameSlice,
          ...animationSlice,
          ...eventSlice,
          ...blessingSlice,
          ...itemSlice,
          
          waitForNextFrame: () => new Promise<void>(resolve => {
            requestAnimationFrame(() => resolve());
          }),
          
          resetGame: () => {
            console.log('GameStore - Resetting game');
            set((state: GameState) => {
              // Reset basic state properties
              state.human = createInitialPlayerState(true);
              state.ai = createInitialPlayerState(false);
              state.currentPlayer = 'human';
              state.isGameOver = false;
              state.selectedTile = null;
              state.currentMatchSequence = 0;
              state.currentCombo = 0;
              state.extraTurnGranted = false;
              
              // Reset board
              state.board = Array(8).fill(null).map(() => 
                Array(8).fill(null).map(() => ({
                  color: 'empty',
                  isMatched: false,
                  isNew: false,
                  isAnimating: false,
                  isFrozen: false,
                  isIgnited: false
                }))
              );
              
              // Reset Maps using Immer's draft state
              state.activeAnimations.clear();
              state.sequences.clear();
              state.events.clear();
              
              // Reset battle state
              state.battleState = {
                currentBattle: 1,
                maxBattles: 5,
                blessingsCollected: [],
                playerWins: 0,
                aiWins: 0
              };
              
              // Reset available blessings
              state.availableBlessings = getRandomBlessingsForColors();
            });
          },
          startNewBattle: () => {
            // Implementation for starting a new battle
          },
          endBattle: (winner: Player) => {
            // Implementation for ending a battle
          },
          offerPostBattleReward: () => {
            // Implementation for offering a post-battle reward
          }
        };

        // Apply logger middleware to the store
        const storeWithLogger = createLoggerMiddleware({
          enabled: process.env.NODE_ENV === 'development',
          logStateChanges: true,
          logErrors: true
        })(set, get, storeWithSlices);

        return storeWithLogger;
      }
    ),
    {
      name: 'game-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
); 