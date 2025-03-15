import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';

export interface BoardSlice {
  board: Tile[][];
  initializeBoard: () => void;
  dropTiles: () => void;
  fillEmptyTiles: () => void;
}

const BOARD_SIZE = 8;
const COLORS: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];

const createEmptyTile = (): Tile => ({
  color: 'empty',
  isMatched: false,
  isNew: false,
  isAnimating: false,
});

const createRandomTile = (avoidColors: Color[] = []): Tile => {
  const availableColors = COLORS.filter(color => !avoidColors.includes(color));
  return {
    color: availableColors[Math.floor(Math.random() * availableColors.length)],
    isMatched: false,
    isNew: true,
    isAnimating: false,
  };
};

export const createBoardSlice: StateCreator<GameState, [], [], BoardSlice> = (set, get) => ({
  board: Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(null).map(() => createEmptyTile())
  ),

  initializeBoard: () => {
    const newBoard = Array(BOARD_SIZE).fill(null).map(() =>
      Array(BOARD_SIZE).fill(null).map(() => createEmptyTile())
    );

    // Fill board ensuring no matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const avoidColors: Color[] = [];
        
        // Check horizontal matches
        if (col >= 2) {
          if (newBoard[row][col - 1].color === newBoard[row][col - 2].color) {
            avoidColors.push(newBoard[row][col - 1].color);
          }
        }
        
        // Check vertical matches
        if (row >= 2) {
          if (newBoard[row - 1][col].color === newBoard[row - 2][col].color) {
            avoidColors.push(newBoard[row - 1][col].color);
          }
        }

        newBoard[row][col] = createRandomTile(avoidColors);
      }
    }

    set({ board: newBoard });
  },

  dropTiles: () => {
    const board = get().board;
    const newBoard = board.map(row => [...row]);

    // Drop tiles down
    for (let col = 0; col < BOARD_SIZE; col++) {
      let emptySpaces = 0;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (newBoard[row][col].color === 'empty') {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          // Move tile down and mark it as animating
          newBoard[row + emptySpaces][col] = {
            ...newBoard[row][col],
            isAnimating: true,
            isNew: false,
            isMatched: false
          };
          // Clear original position
          newBoard[row][col] = createEmptyTile();
        }
      }
    }

    set({ board: newBoard });
  },

  fillEmptyTiles: () => {
    const board = get().board;
    const newBoard = board.map(row => [...row]);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newBoard[row][col].color === 'empty') {
          // Create new tile with animation
          newBoard[row][col] = {
            ...createRandomTile(),
            isAnimating: true,
            isNew: true,
            isMatched: false
          };
        } else {
          // Reset animation flags for existing tiles
          newBoard[row][col] = {
            ...newBoard[row][col],
            isAnimating: false,
            isNew: false
          };
        }
      }
    }

    set({ board: newBoard });
  },
}); 