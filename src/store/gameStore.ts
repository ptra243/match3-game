import { createWithEqualityFn } from 'zustand/traditional';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { createBoardSlice } from './slices/boardSlice';
import { createMatchSlice } from './slices/matchSlice';
import { createPlayerSlice, createInitialPlayerState } from './slices/playerSlice';
import { createAnimationSlice } from './slices/animationSlice';
import { createEventSlice, GameEventType, EventHandler } from './slices/eventSlice';
import { createBlessingSlice } from './slices/blessingSlice';
import { createItemSlice } from './slices/itemSlice';
import { createGameSlice } from './slices/gameSlice';
import { createLoggerMiddleware } from './middleware/loggerMiddleware';
import { createStatusEffectMiddleware } from './middleware/statusEffectMiddleware';
import { createBlessingMiddleware } from './middleware/blessingMiddleware';
import { Player, GameState, BattleState, AnimationInfo, AnimationSequence, PlayerType } from './types';
import { getRandomBlessingsForColors } from './blessings';
import { shallow } from 'zustand/shallow';
import { StoreApi, UseBoundStore } from 'zustand';

// Enable Immer's MapSet plugin
enableMapSet();

// Add the createSelectors utility
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  let store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (let k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s: any) => s[k as keyof typeof s])
  }

  return store
}

// Combine all slices
interface GameStore extends GameState {
  waitForNextFrame: () => Promise<void>;
  resetGame: () => void;
  startNewBattle: () => void;
  endBattle: (winner: PlayerType) => void;
  offerPostBattleReward: () => void;
}

// Initial values for store
const initialState: Partial<GameState> = {
  battleState: {
    currentBattle: 1,
    maxBattles: 5,
    blessingsCollected: [],
    playerWins: 0,
    aiWins: 0
  } as BattleState,
  animationState: {
    activeAnimations: new Map<string, AnimationInfo>(),
    sequences: new Map<string, AnimationSequence>()
  },
  eventState: {
    events: new Map<GameEventType, Set<EventHandler>>(),
    middleware: []
  },
  middleware: [],
  turnNumber: 1,
  isGameOver: false,
  currentMatchSequence: 0,
  currentCombo: 0,
  extraTurnGranted: false,
  matchSequence: [],
  combo: 0,
  extraTurn: false,
  gameOver: false,
  currentPlayer: 'human' as const
};

// Create the base store
const useGameStoreBase = createWithEqualityFn<GameStore>()(
  devtools(
    immer(
      (set, get, store) => {
        // Create slices with the original set function
        const boardSlice = createBoardSlice(set, get, store);
        const playerSlice = createPlayerSlice(set, get, store);
        const matchSlice = createMatchSlice(set, get, store);
        const animationSlice = createAnimationSlice(set, get, store);
        const eventSlice = createEventSlice(set, get, store);
        const blessingSlice = createBlessingSlice(set, get, store);
        const itemSlice = createItemSlice(set, get, store);
        const gameSlice = createGameSlice(set, get, store);

        // Create the store with all slices
        const storeWithSlices = {
          ...initialState,
          ...boardSlice,
          ...playerSlice,
          ...matchSlice,
          ...animationSlice,
          ...eventSlice,
          ...blessingSlice,
          ...itemSlice,
          ...gameSlice,
          
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
              state.gameOver = false;
              state.isGameOver = false;
              state.selectedTile = null;
              state.currentMatchSequence = 0;
              state.matchSequence = [];
              state.currentCombo = 0;
              state.combo = 0;
              state.extraTurnGranted = false;
              state.extraTurn = false;
              state.turnNumber = 1;
              
              // Reset board
              state.board = 
                Array(8).fill(null).map(() => 
                  Array(8).fill(null).map(() => ({
                    color: 'empty',
                    isMatched: false,
                    isNew: false,
                    isAnimating: false,
                    isFrozen: false,
                    isIgnited: false
                  }))
                )
              ;
              
              // Reset Maps using new Map instances
              state.animationState = {
                activeAnimations: new Map(),
                sequences: new Map()
              };
              state.eventState = {
                events: new Map(),
                middleware: []
              };
              
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
          endBattle: (winner: PlayerType) => {
            // Implementation for ending a battle
          },
          offerPostBattleReward: () => {
            // Implementation for offering a post-battle reward
          }
        };

        // Setup handlers for event-based blessing triggers
        setTimeout(() => {
          // Add status effect middleware
          const statusEffectMiddleware = createStatusEffectMiddleware(storeWithSlices as unknown as GameState);
          storeWithSlices.eventState.middleware.push(statusEffectMiddleware);
          
          // Add blessing middleware
          const blessingMiddleware = createBlessingMiddleware(storeWithSlices as unknown as GameState);
          storeWithSlices.eventState.middleware.push(blessingMiddleware);
        }, 0);

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
  ),
  shallow
);

// Apply selectors to the store
export const useGameStore = createSelectors(useGameStoreBase); 