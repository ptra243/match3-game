import { GameState, Color } from '../../types';
import { debugLog } from '../../slices/debug';
import { CLASSES } from '../../classes';

export type MoveOption = {
  row1: number;
  col1: number;
  row2: number;
  col2: number;
  score: number;
};

export const MoveEvaluation = {
  evaluateMove: (state: GameState, row1: number, col1: number, row2: number, col2: number, playerColor?: Color): number => {
    const { board } = state;
    
    // Don't allow moving frozen tiles
    if (board[row1][col1].isFrozen) {
      return -1;
    }

    // Create a temporary board with the move applied
    const tempBoard = board.map(row => [...row]);
    const temp = { ...tempBoard[row1][col1] };
    tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
    tempBoard[row2][col2] = { ...temp };

    // Use our existing findMatches function to find all matches
    const matches = state.findMatches(tempBoard);
    if (matches.length === 0) return -1;

    let score = 0;
    matches.forEach(match => {
      // Base score for any match
      score += 1000;
      
      // Bonus for match length
      if (match.tiles.length > 3) {
        score += (match.tiles.length - 3) * 2000;
      }

      // Color-based scoring if player color is provided
      if (playerColor) {
        const color = match.color;
        if (color === playerColor) {
          score += 5000;
        }
      }
    });

    return score;
  },

  findTopMoves: (state: GameState, playerColor?: Color, maxMoves: number = 5): MoveOption[] => {
    const { board } = state;
    const BOARD_SIZE = board.length;
    const topMoves: MoveOption[] = [];

    // Helper function to add a move to the top moves list
    function addToTopMoves(move: MoveOption) {
      topMoves.push(move);
      // Sort by score descending and keep only the top moves
      topMoves.sort((a, b) => b.score - a.score);
      if (topMoves.length > maxMoves) {
        topMoves.pop();
      }
    }

    // Check horizontal swaps
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        const score = MoveEvaluation.evaluateMove(state, row, col, row, col + 1, playerColor);
        if (score > 0) {
          addToTopMoves({ row1: row, col1: col, row2: row, col2: col + 1, score });
        }
      }
    }

    // Check vertical swaps
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        const score = MoveEvaluation.evaluateMove(state, row, col, row + 1, col, playerColor);
        if (score > 0) {
          addToTopMoves({ row1: row, col1: col, row2: row + 1, col2: col, score });
        }
      }
    }

    return topMoves;
  }
}; 