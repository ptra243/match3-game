import { StateCreator } from 'zustand';
import { GameState, Color, Blessing } from '../types';
import { ALL_BLESSINGS, getRandomBlessingsForColors } from '../blessings';
import { debugLog } from './debug';
import { GameEventType, GameEventPayload } from './eventSlice';
import { toast } from 'react-hot-toast';

export interface BlessingSlice {
  availableBlessings: Blessing[];
  purchaseBlessing: (blessingId: string) => void;
  convertBlessingsToItem: () => void;
  setupBlessingEventHandlers: () => void;
}

export const createBlessingSlice: StateCreator<GameState, [], [], BlessingSlice> = (set, get) => ({
  availableBlessings: getRandomBlessingsForColors(),

  purchaseBlessing: async (blessingId: string) => {
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
    // process new board state
    await get().processNewBoard(get().board);
    // End turn after using a blessing
    get().switchPlayer();
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

  setupBlessingEventHandlers: () => {
    const state = get();
    const { on } = state;
    
    const handleBlessingTriggers = (eventType: GameEventType) => {
      return (payload: GameEventPayload) => {
        const state = get();
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
  }
}); 