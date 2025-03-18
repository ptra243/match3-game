import { create } from 'zustand';
import { createBoardSlice, } from './slices/boardSlice';
import { createInitialPlayerState, createPlayerSlice } from './slices/playerSlice';
import { createMatchSlice } from './slices/matchSlice';
import { createGameSlice } from './slices/gameSlice';
import { createAnimationSlice } from './slices/animationSlice';
import { createEventSlice, GameEventType, GameEventPayload } from './slices/eventSlice';
import { Color, Player, GameState, BattleState } from './types';
import { ALL_BLESSINGS, getRandomBlessingsForColors } from './blessings';
import { ALL_ITEMS } from './items';
import { toast } from 'react-hot-toast';
import { debugLog } from './slices/debug';

// Combine all slices
interface GameStore extends GameState {
  waitForNextFrame: () => Promise<void>;
  resetGame: () => void;
  showItemReward: boolean;
  itemRewardOptions: string[];
  itemRewardCost: { color: Color; amount: number };
  setItemReward: (options: string[], cost: { color: Color; amount: number }) => void;
  clearItemReward: () => void;
  selectItemReward: (itemId: string) => void;
  startNewBattle: () => void;
  endBattle: (winner: Player) => void;
  offerPostBattleReward: () => void;
  convertBlessingsToItem: () => void;
  purchaseBlessing: (blessingId: string) => void;
}

// Initial values for store
const initialState = {
  showItemReward: false,
  itemRewardOptions: [] as string[],
  itemRewardCost: { color: 'red' as Color, amount: 0 },
  availableBlessings: getRandomBlessingsForColors(),
  battleState: {
    currentBattle: 1,
    maxBattles: 5,
    blessingsCollected: [],
    playerWins: 0,
    aiWins: 0
  } as BattleState
};

export const useGameStore = create<GameStore>()((...args) => {
  const [set, get] = args;
  const boardSlice = createBoardSlice(...args);
  const playerSlice = createPlayerSlice(...args);
  const matchSlice = createMatchSlice(...args);
  const gameSlice = createGameSlice(...args);
  const animationSlice = createAnimationSlice(...args);
  const eventSlice = createEventSlice(...args);

  // Setup handlers for event-based blessing triggers
  const setupBlessingEventHandlers = () => {
    const { on, emit } = eventSlice;
    
    // We'll initialize some event handlers by default
    // These will look at the player's blessings and run any that match the triggered event
    const handleBlessingTriggers = (eventType: GameEventType) => {
      return (payload: GameEventPayload) => {
        const state = get();
        const currentPlayer = state.currentPlayer;
        
        // Check if any blessings have effects that trigger on this event
        const { human, ai } = state;
        
        // Process for both players
        [human, ai].forEach(playerState => {
          // Check collected blessings for triggers
          if (playerState === human) {
            state.battleState.blessingsCollected.forEach(blessing => {
              blessing.effects.forEach(effect => {
                if (effect.triggerType === eventType && effect.onTrigger) {
                  debugLog('BLESSING', `Triggering blessing ${blessing.id} on ${eventType}`, { blessing, payload });
                  effect.onTrigger(state, payload);
                }
              });
            });
          }
          
          // Check equipped items for triggers
          Object.values(playerState.equippedItems).forEach(item => {
            if (!item) return;
            
            item.effects.forEach(effect => {
              if (effect.triggerType === eventType && effect.onTrigger) {
                debugLog('ITEM', `Triggering item effect on ${eventType}`, { item, payload });
                effect.onTrigger(state, payload);
              }
            });
          });
        });
      };
    };
    
    // Register handlers for all event types
    const eventTypes: GameEventType[] = [
      'OnDamageDealt', 'OnDamageTaken', 'StartOfTurn', 'EndOfTurn',
      'OnMatch', 'OnSkillCast', 'OnResourceGained', 'OnStatusEffectApplied',
      'OnGameOver'
    ];
    
    eventTypes.forEach(eventType => {
      on(eventType, handleBlessingTriggers(eventType));
    });
    
    debugLog('GAME_STORE', 'Set up blessing event handlers');
  };
  
  // Call setup on store initialization
  setTimeout(() => {
    setupBlessingEventHandlers();
  }, 0);

  return {
    ...initialState,
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
        middleware: [],
        showItemReward: false,
        itemRewardOptions: [],
        itemRewardCost: { color: 'red', amount: 0 },
        battleState: {
          currentBattle: 1,
          maxBattles: 5,
          blessingsCollected: [],
          playerWins: 0,
          aiWins: 0
        },
        availableBlessings: getRandomBlessingsForColors(),
      });
    },
    setItemReward: (options: string[], cost: { color: Color; amount: number }) => {
      // Disabled item rewards for now
      console.log('Item rewards are disabled');
      return;
    },
    clearItemReward: () => {
      set({
        showItemReward: false,
        itemRewardOptions: []
      });
    },
    selectItemReward: (itemId: string) => {
      // Disabled item rewards for now
      console.log('Item selection is disabled');
      return;
    },
    startNewBattle: () => {
      const state = get();
      const newBattleNumber = state.battleState.currentBattle + 1;
      
      // Reset the board and player resources, but keep inventory and battle state
      set(state => ({
        board: Array(6).fill(null).map(() => Array(6).fill({ 
          color: 'empty', 
          isMatched: false, 
          isNew: false, 
          isAnimating: false, 
          isFrozen: false,
          isIgnited: false
        })),
        human: {
          ...state.human,
          health: 100,
          matchedColors: {
            red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
          },
          statusEffects: []
        },
        ai: {
          ...state.ai,
          // Increase AI health and defense based on battle number
          health: 100 + (newBattleNumber - 1) * 20,
          defense: (newBattleNumber - 1) * 2,
          matchedColors: {
            red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
          },
          statusEffects: []
        },
        battleState: {
          ...state.battleState,
          currentBattle: newBattleNumber
        },
        // Refresh available blessings
        availableBlessings: getRandomBlessingsForColors(),
        showItemReward: false,
        itemRewardOptions: []
      }));
      
      // Initialize the board with new tiles
      get().initializeBoard();
    },
    endBattle: (winner: Player) => {
      const battleState = get().battleState;
      
      // Update win counts
      set(state => ({
        battleState: {
          ...state.battleState,
          playerWins: winner === 'human' ? state.battleState.playerWins + 1 : state.battleState.playerWins,
          aiWins: winner === 'ai' ? state.battleState.aiWins + 1 : state.battleState.aiWins
        }
      }));
      
      // If player won, offer rewards
      if (winner === 'human') {
        get().offerPostBattleReward();
      }
      
      // If max battles reached, show final result
      if (battleState.currentBattle >= battleState.maxBattles) {
        // Game complete - could show a victory/defeat screen here
        toast.success(`Game complete! Player wins: ${battleState.playerWins}, AI wins: ${battleState.aiWins + (winner === 'ai' ? 1 : 0)}`);
      } else {
        // Prepare for next battle if player won
        if (winner === 'human') {
          toast.success(`Battle ${battleState.currentBattle} complete! Preparing for next battle...`);
        }
      }
    },
    offerPostBattleReward: () => {
      // Skip item rewards for now
      toast.success("Battle complete! You've earned a blessing for the next battle.");
      
      // Refresh available blessings instead of offering items
      set({
        availableBlessings: getRandomBlessingsForColors(),
      });
    },
    convertBlessingsToItem: () => {
      const blessings = get().battleState.blessingsCollected;
      
      if (blessings.length < 3) {
        toast.error('You need at least 3 blessings to convert!');
        return;
      }
      
      // Just clear the blessings without creating an item
      set(state => ({
        battleState: {
          ...state.battleState,
          blessingsCollected: []
        }
      }));
      
      toast.success(`Cleared ${blessings.length} blessings!`);
    },
    purchaseBlessing: (blessingId: string) => {
      const state = get();
      const blessing = ALL_BLESSINGS[blessingId];
      const player = state.currentPlayer;
      
      if (!blessing) {
        toast.error('Invalid blessing!');
        return;
      }
      
      // Check if player has enough resources
      if (state[player].matchedColors[blessing.color] < blessing.cost) {
        toast.error(`Not enough ${blessing.color} resources! Need ${blessing.cost}.`);
        return;
      }
      
      // Deduct resources
      set(state => ({
        [player]: {
          ...state[player],
          matchedColors: {
            ...state[player].matchedColors,
            [blessing.color]: state[player].matchedColors[blessing.color] - blessing.cost
          }
        }
      }));
      
      // Process each effect in the blessing
      blessing.effects.forEach(effect => {
        // Apply immediate stat changes
        if (effect.colorStats) {
          set(state => {
            const newColorStats = { ...state[player].colorStats };
            
            Object.entries(effect.colorStats || {}).forEach(([color, value]) => {
              if (value) {
                newColorStats[color as Color] = (newColorStats[color as Color] || 0) + value;
              }
            });
            
            return {
              [player]: {
                ...state[player],
                colorStats: newColorStats
              }
            };
          });
        }
        
        if (effect.defense) {
          set(state => ({
            [player]: {
              ...state[player],
              defense: state[player].defense + (effect.defense || 0)
            }
          }));
        }
        
        if (effect.health) {
          set(state => {
            const newHealth = Math.min(100 + (effect.health || 0), state[player].health + (effect.health || 0));
            return {
              [player]: {
                ...state[player],
                health: newHealth
              }
            };
          });
        }
        
        // Add as status effect if it has turns remaining
        if (effect.turnsRemaining) {
          set(state => ({
            [player]: {
              ...state[player],
              statusEffects: [
                ...state[player].statusEffects,
                {
                  damageMultiplier: effect.damageMultiplier || 1,
                  resourceMultiplier: effect.resourceMultiplier || 1,
                  turnsRemaining: effect.turnsRemaining || 1,
                  extraTurn: effect.extraTurn || false,
                  manaConversion: effect.resourceConversion,
                  convertTiles: effect.convertTiles,
                  onExpire: effect.onExpire ? () => effect.onExpire!(get()) : undefined
                }
              ]
            }
          }));
        }
        
        // Run the onActivate hook if this is an immediate effect
        if ((effect.triggerType === 'immediate' || !effect.triggerType) && effect.onActivate) {
          effect.onActivate(get());
        }
      });
      
      // If human player, add to collected blessings
      if (player === 'human') {
        set(state => ({
          battleState: {
            ...state.battleState,
            blessingsCollected: [...state.battleState.blessingsCollected, blessing]
          }
        }));
      }
      
      // Refresh available blessings
      set({
        availableBlessings: getRandomBlessingsForColors()
      });
      
      // End turn after using a blessing
      get().switchPlayer();
    }
  };
}); 