import { GameState } from '../../types';
import { debugLog } from '../../slices/debug';

export const GameActions = {
  grantExtraTurn: (state: GameState, reason: 'special_shape' | 'match_length' | 'combo') => {
    debugLog('GAME_ACTION', `Granting extra turn due to ${reason}`);
    state.setExtraTurn(true);
  }
}; 