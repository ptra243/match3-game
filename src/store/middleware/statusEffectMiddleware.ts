import { GameState, Player, StatusEffect } from '../types';
import { GameEventPayload, GameEventType, TurnEventPayload } from '../slices/eventSlice';
import { debugLog } from '../slices/debug';
import { toast } from 'react-hot-toast';

export const createStatusEffectMiddleware = (state: GameState) => {
  return (next: (event: GameEventPayload) => void, event: GameEventPayload) => {
    // Process the event first
    next(event);

    // Only process status effects for turn-related events
    if (
      (event as TurnEventPayload).player && 
      (event as TurnEventPayload).turnNumber && 
      (event as TurnEventPayload).player in state
    ) {
      const player = (event as TurnEventPayload).player;
      const playerState = state[player];
      const eventType = (event as any).type as GameEventType;

      // Handle StartOfTurn event
      if (eventType === 'StartOfTurn') {
        // Execute each status effect
        playerState.statusEffects.forEach((effect: StatusEffect) => {
          if (effect.onTurnStart) {
            debugLog('STATUS_EFFECT', `Executing start of turn effect for ${player}`, {
              effect: effect.type,
              strength: effect.strength
            });
            effect.onTurnStart(state, player);
          }
        });
      }

      // Handle EndOfTurn event
      if (eventType === 'EndOfTurn') {
        // Process mana conversion effects first
        playerState.statusEffects.forEach((effect: StatusEffect) => {
          if (effect.manaConversion) {
            const { from, to, ratio } = effect.manaConversion;
            const fromAmount = playerState.matchedColors[from];
            
            if (fromAmount >= ratio) {
              const convertAmount = Math.floor(fromAmount / ratio);
              const remainingAmount = fromAmount % ratio;
              
              debugLog('STATUS_EFFECT', `Converting ${convertAmount * ratio} ${from} mana to ${convertAmount} ${to} mana for ${player}`);
              
              state[player] = {
                ...state[player],
                matchedColors: {
                  ...state[player].matchedColors,
                  [from]: remainingAmount,
                  [to]: state[player].matchedColors[to] + convertAmount
                }
              };
              
              toast.success(`${player === 'human' ? 'You' : 'AI'} converted ${convertAmount * ratio} ${from} mana to ${convertAmount} ${to} mana!`);
            }
          }
        });

        // Update status effect durations
        const newStatusEffects = playerState.statusEffects
          .map((effect: StatusEffect) => ({
            ...effect,
            turnsRemaining: effect.turnsRemaining - 1
          }))
          .filter((effect: StatusEffect) => effect.turnsRemaining > 0);

        // Update player state with new status effects
        state[player] = {
          ...state[player],
          statusEffects: newStatusEffects
        };

        debugLog('STATUS_EFFECT', `Updated status effects for ${player}`, {
          oldEffects: playerState.statusEffects,
          newEffects: newStatusEffects
        });
      }
    }
  };
}; 