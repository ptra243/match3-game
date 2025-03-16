import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';

export interface BoardSlice {
  board: Tile[][];
  initializeBoard: () => void;
}

const BOARD_SIZE = 8;
const COLORS: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];

const createEmptyTile = (): Tile => ({
  color: 'empty',
  isMatched: false,
  isNew: false,
  isAnimating: false,
  isFrozen: false,
  isIgnited: false
});

const createRandomTile = (avoidColors: Color[] = []): Tile => {
  const availableColors = COLORS.filter(color => !avoidColors.includes(color));
  return {
    color: availableColors[Math.floor(Math.random() * availableColors.length)],
    isMatched: false,
    isNew: true,
    isAnimating: false,
    isFrozen: false,
    isIgnited: false
  };
};

export const createBoardSlice: StateCreator<GameState, [], [], BoardSlice> = (set, get) => ({
  board: Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(null).map(() => createEmptyTile())
  ),

  initializeBoard: () => {
    console.log('BoardSlice - Initializing board');
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

    console.log('BoardSlice - Board initialized with:', {
      emptyTiles: newBoard.flat().filter(t => t.color === 'empty').length,
      nonEmptyTiles: newBoard.flat().filter(t => t.color !== 'empty').length,
      totalTiles: newBoard.flat().length
    });

    set({ board: newBoard });
  },
}); 