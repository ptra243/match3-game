import { StateCreator } from 'zustand';
import { GameState, Color } from '../../types';
import { BoardState, Tile } from './types';
import { BoardActions } from '../../actions/board/boardActions';
import { TileActions } from '../../actions/board/tileActions';
import { GAME_CONSTANTS } from '../../gameRules';

export const createBoardSlice: StateCreator<GameState, [], [], BoardState> = (set, get) => ({
  board: Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() =>
    Array(GAME_CONSTANTS.BOARD_SIZE).fill(null).map(() => ({
      color: 'empty',
      isMatched: false,
      isNew: false,
      isAnimating: false,
      isFrozen: false,
      isIgnited: false
    }))
  ),
  selectedTile: null,

  // Simple state updates
  updateTile: (row: number, col: number, tile: Partial<Tile>) => 
    set(state => {
      state.board[row][col] = { ...state.board[row][col], ...tile };
      return state;
    }),

  setSelectedTile: (tile: { row: number; col: number } | null) => 
    set({ selectedTile: tile }),

  setBoard: (newBoard: Tile[][]) => 
    set({ board: newBoard }),

  // Action wrappers
  initializeBoard: () => BoardActions.initializeBoard(get()),
  dropTiles: () => BoardActions.dropTiles(get()),
  fillEmptyTiles: () => BoardActions.fillEmptyTiles(get()),
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => 
    TileActions.swapTiles(get(), row1, col1, row2, col2),
  markTilesForDestruction: (tiles: { row: number; col: number }[]) => 
    TileActions.markTilesForDestruction(get(), tiles),
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => 
    TileActions.convertTiles(get(), tiles),
  markTilesAsMatched: async (tiles: { row: number; col: number }[]) => {
    const matchedTiles = tiles.map(({ row, col }) => ({
      row,
      col,
      color: get().board[row][col].color
    }));

    const explosionTilesCount = tiles.filter(({ row, col }) => 
      get().board[row][col].isIgnited
    ).length;

    return { matchedTiles, explosionTilesCount };
  },
  processNewBoard: async (newBoard: Tile[][]) => {
    let currentBoard = newBoard;
    
    // Process empty tiles
    const emptyTiles = findEmptyTiles(currentBoard);
    if (emptyTiles.length > 0) {
      currentBoard = await BoardActions.dropTiles(get());
      currentBoard = await BoardActions.fillEmptyTiles(get());
    }

    // Process matches
    let hasMatches;
    do {
      hasMatches = await get().processMatches();
      if (hasMatches) {
        currentBoard = await BoardActions.dropTiles(get());
        currentBoard = await BoardActions.fillEmptyTiles(get());
      }
    } while (hasMatches);

    // Check for valid moves
    if (!get().hasValidMoves()) {
      get().initializeBoard();
    }
  }
});

function findEmptyTiles(board: Tile[][]): { row: number; col: number }[] {
  const emptyTiles: { row: number; col: number }[] = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col].color === 'empty') {
        emptyTiles.push({ row, col });
      }
    }
  }
  return emptyTiles;
} 