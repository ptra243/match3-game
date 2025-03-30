import { GameState } from '../../types';
import { debugLog } from '../../slices/debug';
import { AI } from '../ai/ai';

export const GameFlow = {
  switchPlayer: async (state: GameState) => {
    const currentPlayer = state.currentPlayer;
    const nextPlayer = currentPlayer === 'human' ? 'ai' : 'human';
    
    // Process end-of-turn item effects for current player
    const currentPlayerState = state[currentPlayer];
    //TODO items and item middlewares
    // Object.values(currentPlayerState.equippedItems).forEach(item => {
    //   if (item) {
    //     item.effects.forEach(effect => {
    //       if (effect.onTurnEnd) {
    //         effect.onTurnEnd(state);
    //       }
    //     });
    //   }
    // });
    
    // Emit EndOfTurn event for current player
    state.emit('EndOfTurn', {
      player: currentPlayer,
      turnNumber: state.turnNumber
    });

    // Check for extra turn
    const hasExtraTurn = currentPlayerState.statusEffects.some(effect => effect.extraTurn);
    
    if (hasExtraTurn) {
      // Grant extra turn to current player
      state.extraTurnGranted = true;
      debugLog('GAME_FLOW', `${currentPlayer} granted extra turn`);
      
      // Emit StartOfTurn event for current player again
      state.emit('StartOfTurn', {
        player: currentPlayer,
        turnNumber: state.turnNumber
      });
    } else {
      // No extra turn, switch to next player
      state.extraTurnGranted = false;
      state.currentPlayer = nextPlayer;
      
      // Emit StartOfTurn event for next player
      state.emit('StartOfTurn', {
        player: nextPlayer,
        turnNumber: state.turnNumber
      });
      
      // If next player is AI, make their move
      if (nextPlayer === 'ai') {
        await AI.makeMove(state);
      }
    }
  },

  grantExtraTurn: (state: GameState, reason: 'special_shape' | 'match_length' | 'combo') => {
    debugLog('GAME_FLOW', `Granting extra turn: ${reason}`);
    state.setExtraTurn(true);
  },

  endTurn: (state: GameState) => {
    GameFlow.switchPlayer(state);
  }
}; 