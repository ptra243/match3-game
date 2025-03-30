import { GameState, Player, Blessing, Effect } from '../types';
import { GameEventPayload, GameEventType, TurnEventPayload } from '../slices/eventSlice';
import { debugLog } from '../slices/debug';
import { toast } from 'react-hot-toast';

export const createBlessingMiddleware = (state: GameState) => {
  return (next: (event: GameEventPayload) => void, event: GameEventPayload) => {
    // Process the event first
    next(event);

    // Handle all blessing events
    const eventType = (event as any).type as GameEventType;

    // Process blessing triggers for all event types
    state.battleState.blessingsCollected.forEach((blessing: Blessing) => {
      blessing.effects.forEach((effect: Effect) => {
        // Handle trigger-based effects
        if (effect.triggerType === eventType && effect.onTrigger) {
          debugLog('BLESSING', `Triggering blessing ${blessing.id} on ${eventType}`, { blessing, payload: event });
          effect.onTrigger(state, event);
        }
      });
    });

    // Handle turn-related events
    if (
      (event as TurnEventPayload).player && 
      (event as TurnEventPayload).turnNumber && 
      (event as TurnEventPayload).player in state
    ) {
      const player = (event as TurnEventPayload).player;

      // Handle EndOfTurn event
      if (eventType === 'EndOfTurn') {
        // Update blessing durations for the human player
        const blessings = state.battleState.blessingsCollected;
        const newBlessings = blessings.filter(blessing => {
          if (blessing.duration === undefined) return true; // Permanent blessings
          
          // Decrement duration
          blessing.duration--;
          
          // If duration is 0, call onExpire for each effect
          if (blessing.duration === 0) {
            blessing.effects.forEach(effect => {
              if (effect.onExpire) {
                debugLog('BLESSING', `Blessing ${blessing.id} expired, calling onExpire`);
                effect.onExpire(state);
              }
            });
            return false;
          }
          
          return true;
        });

        // Update state with new blessings
        state.battleState = {
          ...state.battleState,
          blessingsCollected: newBlessings
        };

        debugLog('BLESSING', `Updated blessing durations for ${player}`, {
          oldBlessings: blessings,
          newBlessings
        });
      }

      // Handle StartOfTurn event
      if (eventType === 'StartOfTurn') {
        // Execute start of turn effects for active blessings
        state.battleState.blessingsCollected.forEach((blessing: Blessing) => {
          blessing.effects.forEach(effect => {
            if (effect.triggerType === 'StartOfTurn' && effect.onTrigger) {
              debugLog('BLESSING', `Executing start of turn effect for blessing ${blessing.id}`);
              effect.onTrigger(state, event);
            }
          });
        });
      }
    }
  };
}; 