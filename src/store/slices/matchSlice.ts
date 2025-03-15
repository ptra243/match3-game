import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';
import { toast } from 'react-hot-toast';

export interface MatchSlice {
  currentMatchSequence: number;
  currentCombo: number;
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
}

const BOARD_SIZE = 8;

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  currentMatchSequence: 0,
  currentCombo: 0,

  checkMatches: async () => {
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasMatches = false;
    let matchedColors: Record<Color, number> = {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0,
    };

    // Helper function to mark tiles as matched and update count
    const markMatch = (tiles: { row: number; col: number }[], color: Color) => {
      tiles.forEach(({row, col}) => {
        newBoard[row][col].isMatched = true;
      });
      matchedColors[color] += tiles.length;
      hasMatches = true;
    };

    // Check T and L shapes
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = board[row][col].color;
        if (color === 'empty') continue;

        // Check T shape (facing down)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === board[row][col + 1].color &&
            color === board[row][col + 2].color &&
            color === board[row + 1][col + 1].color &&
            color === board[row + 2][col + 1].color) {
          markMatch([
            {row, col}, {row, col: col + 1}, {row, col: col + 2},
            {row: row + 1, col: col + 1}, {row: row + 2, col: col + 1}
          ], color);
          continue;
        }

        // Check T shape (facing up)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === board[row][col + 1].color &&
            color === board[row][col + 2].color &&
            color === board[row - 1][col + 1].color &&
            color === board[row - 2][col + 1].color) {
          markMatch([
            {row, col}, {row, col: col + 1}, {row, col: col + 2},
            {row: row - 1, col: col + 1}, {row: row - 2, col: col + 1}
          ], color);
          continue;
        }

        // Check T shape (facing right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 1 &&
            color === board[row + 1][col].color &&
            color === board[row + 2][col].color &&
            color === board[row + 1][col + 1].color) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col},
            {row: row + 1, col: col + 1}
          ], color);
          continue;
        }

        // Check T shape (facing left)
        if (row < BOARD_SIZE - 2 && col > 0 &&
            color === board[row + 1][col].color &&
            color === board[row + 2][col].color &&
            color === board[row + 1][col - 1].color) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col},
            {row: row + 1, col: col - 1}
          ], color);
          continue;
        }

        // Check L shape (bottom right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === board[row + 1][col].color &&
            color === board[row + 2][col].color &&
            color === board[row + 2][col + 1].color &&
            color === board[row + 2][col + 2].color) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col},
            {row: row + 2, col: col + 1}, {row: row + 2, col: col + 2}
          ], color);
          continue;
        }

        // Check L shape (bottom left)
        if (row < BOARD_SIZE - 2 && col >= 2 &&
            color === board[row + 1][col].color &&
            color === board[row + 2][col].color &&
            color === board[row + 2][col - 1].color &&
            color === board[row + 2][col - 2].color) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col},
            {row: row + 2, col: col - 1}, {row: row + 2, col: col - 2}
          ], color);
          continue;
        }

        // Check L shape (top right)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === board[row - 1][col].color &&
            color === board[row - 2][col].color &&
            color === board[row][col + 1].color &&
            color === board[row][col + 2].color) {
          markMatch([
            {row, col}, {row: row - 1, col}, {row: row - 2, col},
            {row, col: col + 1}, {row, col: col + 2}
          ], color);
          continue;
        }

        // Check L shape (top left)
        if (row >= 2 && col >= 2 &&
            color === board[row - 1][col].color &&
            color === board[row - 2][col].color &&
            color === board[row][col - 1].color &&
            color === board[row][col - 2].color) {
          markMatch([
            {row, col}, {row: row - 1, col}, {row: row - 2, col},
            {row, col: col - 1}, {row, col: col - 2}
          ], color);
          continue;
        }
      }
    }

    // Check regular horizontal matches (3 in a row)
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = board[row][col].color;
        if (
          color !== 'empty' &&
          color === board[row][col + 1].color &&
          color === board[row][col + 2].color &&
          !newBoard[row][col].isMatched && // Check all three tiles aren't already matched
          !newBoard[row][col + 1].isMatched &&
          !newBoard[row][col + 2].isMatched
        ) {
          markMatch([
            {row, col}, {row, col: col + 1}, {row, col: col + 2}
          ], color);
        }
      }
    }

    // Check regular vertical matches (3 in a row)
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        const color = board[row][col].color;
        if (
          color !== 'empty' &&
          color === board[row + 1][col].color &&
          color === board[row + 2][col].color &&
          !newBoard[row][col].isMatched && // Check all three tiles aren't already matched
          !newBoard[row + 1][col].isMatched &&
          !newBoard[row + 2][col].isMatched
        ) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col}
          ], color);
        }
      }
    }

    if (hasMatches) {
      // Update the board with matched tiles
      set(state => ({
        board: newBoard,
        currentMatchSequence: state.currentMatchSequence + 1,
        currentCombo: state.currentCombo + 1,
        [state.currentPlayer]: {
          ...state[state.currentPlayer],
          matchedColors: {
            ...state[state.currentPlayer].matchedColors,
            ...Object.entries(matchedColors).reduce((acc, [color, count]) => ({
              ...acc,
              [color]: (state[state.currentPlayer].matchedColors[color as Color] || 0) + count
            }), {})
          }
        }
      }));

      // Show combo toast if it's more than 1
      const combo = get().currentCombo;
      if (combo > 1) {
        toast.success(`${combo}x Combo!`);
      }

      // Clear matched tiles
      await new Promise(resolve => setTimeout(resolve, 300));
      set(state => ({
        board: state.board.map(row =>
          row.map(tile =>
            tile.isMatched ? { ...tile, color: 'empty', isMatched: false } : tile
          )
        )
      }));

      // Drop tiles
      await new Promise(resolve => setTimeout(resolve, 300));
      get().dropTiles();

      // Fill empty spaces
      await new Promise(resolve => setTimeout(resolve, 300));
      get().fillEmptyTiles();

      // Check for skill readiness
      const currentPlayer = get().currentPlayer;
      const playerState = get()[currentPlayer];
      if (playerState.skill.color && playerState.matchedColors[playerState.skill.color] >= playerState.skill.cost) {
        set(state => ({
          [currentPlayer]: {
            ...state[currentPlayer],
            skill: {
              ...state[currentPlayer].skill,
              isReady: true
            }
          }
        }));
        toast.success(`${currentPlayer === 'human' ? 'Your' : 'AI\'s'} ${playerState.skill.name} is ready!`);
      }

      // Recursively check for new matches after dropping tiles
      await new Promise(resolve => setTimeout(resolve, 300));
      const hasMoreMatches = await get().checkMatches();
      
      // If this is the end of all cascading matches, switch turns
      if (!hasMoreMatches) {
        const finalCombo = get().currentCombo;
        if (finalCombo > 1) {
          toast.success(`Match complete! ${finalCombo}x combo!`);
        }
        set({ currentCombo: 0 });
        get().switchPlayer();
      }
      
      return true;
    }

    set({ currentCombo: 0 });
    return false;
  },

  swapTiles: async (row1: number, col1: number, row2: number, col2: number) => {
    if (!get().wouldCreateMatch(row1, col1, row2, col2)) {
      return false;
    }

    const board = get().board;
    const newBoard = board.map(row => [...row]);
    const temp = { ...newBoard[row1][col1] };
    newBoard[row1][col1] = { ...newBoard[row2][col2], isAnimating: true };
    newBoard[row2][col2] = { ...temp, isAnimating: true };

    set({ board: newBoard });
    await new Promise(resolve => setTimeout(resolve, 300));

    // Reset animation flags
    set(state => ({
      board: state.board.map(row =>
        row.map(tile => ({ ...tile, isAnimating: false }))
      )
    }));

    return true;
  },

  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
    const board = get().board;
    const tempBoard = board.map(row => [...row]);
    const temp = { ...tempBoard[row1][col1] };
    tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
    tempBoard[row2][col2] = { ...temp };

    // Check T and L shapes
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = tempBoard[row][col].color;
        if (color === 'empty') continue;

        // Check T shape (facing down)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color &&
            color === tempBoard[row + 1][col + 1].color &&
            color === tempBoard[row + 2][col + 1].color) {
          return true;
        }

        // Check T shape (facing up)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color &&
            color === tempBoard[row - 1][col + 1].color &&
            color === tempBoard[row - 2][col + 1].color) {
          return true;
        }

        // Check T shape (facing right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 1 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 1][col + 1].color) {
          return true;
        }

        // Check T shape (facing left)
        if (row < BOARD_SIZE - 2 && col > 0 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 1][col - 1].color) {
          return true;
        }

        // Check L shape (bottom right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 2][col + 1].color &&
            color === tempBoard[row + 2][col + 2].color) {
          return true;
        }

        // Check L shape (bottom left)
        if (row < BOARD_SIZE - 2 && col >= 2 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 2][col - 1].color &&
            color === tempBoard[row + 2][col - 2].color) {
          return true;
        }

        // Check L shape (top right)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row - 1][col].color &&
            color === tempBoard[row - 2][col].color &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color) {
          return true;
        }

        // Check L shape (top left)
        if (row >= 2 && col >= 2 &&
            color === tempBoard[row - 1][col].color &&
            color === tempBoard[row - 2][col].color &&
            color === tempBoard[row][col - 1].color &&
            color === tempBoard[row][col - 2].color) {
          return true;
        }
      }
    }

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = tempBoard[row][col].color;
        if (
          color !== 'empty' &&
          color === tempBoard[row][col + 1].color &&
          color === tempBoard[row][col + 2].color
        ) {
          return true;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        const color = tempBoard[row][col].color;
        if (
          color !== 'empty' &&
          color === tempBoard[row + 1][col].color &&
          color === tempBoard[row + 2][col].color
        ) {
          return true;
        }
      }
    }

    return false;
  },
}); 