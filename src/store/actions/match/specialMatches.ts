import { GameState, Match, StatusEffect } from '../../types';
import { EXTRA_TURN_CONDITIONS } from '../../gameRules';
import { GameActions } from '../game/gameActions';

export const isSpecialMatch = (match: Match): boolean => {
  return Boolean(match.isSpecialShape) || Boolean(match.length && match.length >= 4);
};

export const handleSpecialMatch = async (state: GameState, match: Match) => {
  const currentPlayer = state.currentPlayer;
  const player = state[currentPlayer];
  
  if (match.isSpecialShape) {
    const effect: StatusEffect = {
      damageMultiplier: 1,
      resourceMultiplier: 1,
      turnsRemaining: 1
    };
    player.statusEffects.push(effect);
    
    if (EXTRA_TURN_CONDITIONS.SPECIAL_SHAPES.includes(match.isSpecialShape as 'T' | 'L')) {
      GameActions.grantExtraTurn(state, 'special_shape');
    }
  }
  
  if (match.length && match.length >= 4) {
    const effect: StatusEffect = {
      damageMultiplier: 1,
      resourceMultiplier: 1,
      turnsRemaining: 1
    };
    player.statusEffects.push(effect);
    
    if (EXTRA_TURN_CONDITIONS.MATCH_LENGTHS.includes(match.length as 4 | 5)) {
      GameActions.grantExtraTurn(state, 'match_length');
    }
  }
}; 