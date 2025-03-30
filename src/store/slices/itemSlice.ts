import { StateCreator } from 'zustand';
import { GameState, Color, Item } from '../types';
import { WEAPONS, ARMOR, ACCESSORIES } from '../items';
import { debugLog } from './debug';
import { GameEventType, GameEventPayload } from './eventSlice';
import { toast } from 'react-hot-toast';

export interface ItemSlice {
  showItemReward: boolean;
  itemRewardOptions: string[];
  itemRewardCost: { color: Color; amount: number };
  setItemReward: (options: string[], cost: { color: Color; amount: number }) => void;
  clearItemReward: () => void;
  selectItemReward: (itemId: string) => void;
  setupItemEventHandlers: () => void;
}

export const createItemSlice: StateCreator<GameState, [], [], ItemSlice> = (set, get) => ({
  showItemReward: false,
  itemRewardOptions: [],
  itemRewardCost: { color: 'red', amount: 0 },

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

  setupItemEventHandlers: () => {
    const state = get();
    const { on } = state;
    
    const handleItemTriggers = (eventType: GameEventType) => {
      return (payload: GameEventPayload) => {
        const state = get();
        const { human, ai } = state;
        
        // Process for both players
        [human, ai].forEach(playerState => {
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
      on(eventType, handleItemTriggers(eventType));
    });
    
    debugLog('GAME_STORE', 'Set up item event handlers');
  }
}); 