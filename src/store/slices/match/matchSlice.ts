import { StateCreator } from 'zustand';
import { GameState } from '../../types';
import { MatchState } from './types';
import { MatchActions } from '../../actions/match/matchActions';

export const createMatchSlice: StateCreator<GameState, [], [], MatchState> = (set, get) => ({
  currentMatchSequence: 0,
  currentCombo: 0,

  // Simple state updates
  incrementCombo: () => 
    set(state => ({ currentCombo: state.currentCombo + 1 })),

  resetCombo: () => 
    set({ currentCombo: 0 }),

  // Action wrappers
  processMatches: () => MatchActions.processMatches(get()),
  findMatches: (board) => MatchActions.findMatches(board),
  hasValidMoves: () => {
    const board = get().board;
    const BOARD_SIZE = board.length;

    // Check horizontal swaps
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        const tempBoard = board.map(row => [...row]);
        const temp = {...tempBoard[row][col]};
        tempBoard[row][col] = {...tempBoard[row][col + 1]};
        tempBoard[row][col + 1] = temp;

        if (get().findMatches(tempBoard).length > 0) {
          return true;
        }
      }
    }

    // Check vertical swaps
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        const tempBoard = board.map(row => [...row]);
        const temp = {...tempBoard[row][col]};
        tempBoard[row][col] = {...tempBoard[row + 1][col]};
        tempBoard[row + 1][col] = temp;

        if (get().findMatches(tempBoard).length > 0) {
          return true;
        }
      }
    }

    return false;
  },

  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
    const board = get().board;
    const tempBoard = board.map(row => [...row]);
    const temp = {...tempBoard[row1][col1]};
    tempBoard[row1][col1] = {...tempBoard[row2][col2]};
    tempBoard[row2][col2] = {...temp};
    return get().findMatches(tempBoard).length > 0;
  }
}); 