import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';
import { debugLog } from '../slices/debug';
import { GAME_CONSTANTS, GAME_FLOW, EXTRA_TURN_CONDITIONS } from '../gameRules';

const BOARD_SIZE = GAME_CONSTANTS.BOARD_SIZE;
const COLORS = GAME_CONSTANTS.AVAILABLE_COLORS;

// Define the Match type with additional properties for special matches
interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
  isSpecialShape?: 'T' | 'L';  // Track if this is a special shape match
  length?: number;  // Track match length for extra turn conditions
}

/**
 * Finds all matches on the board, including special shapes (T and L).
 * Implements match rules from MATCH_RULES and EXTRA_TURN_CONDITIONS.
 * 
 * @preserveGameRules This function implements core matching rules.
 */
const findMatches = (board: Tile[][]): Match[] => {
  const matches: Match[] = [];
  const visited = new Set<string>();

  // Helper to check if a tile has been included in a match
  const isVisited = (row: number, col: number) => visited.has(`${row},${col}`);
  const markVisited = (row: number, col: number) => visited.add(`${row},${col}`);

  // Find horizontal matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for horizontal match
      let length = 1;
      while (col + length < BOARD_SIZE && 
             board[row][col + length].color === color &&
             !isVisited(row, col + length)) {
        length++;
      }

      if (length >= GAME_CONSTANTS.MIN_MATCH_LENGTH) {
        const matchTiles = [];
        for (let i = 0; i < length; i++) {
          matchTiles.push({ row, col: col + i });
          markVisited(row, col + i);
        }
        
        matches.push({
          color,
          tiles: matchTiles,
          length
        });

        // Check for T shape if match is 3 tiles
        if (length === 3) {
          // Check for vertical extension in middle tile
          const midCol = col + 1;
          if (row > 0 && row < BOARD_SIZE - 1 &&
              board[row - 1][midCol].color === color &&
              board[row + 1][midCol].color === color) {
            matches.push({
              color,
              tiles: [
                ...matchTiles,
                { row: row - 1, col: midCol },
                { row: row + 1, col: midCol }
              ],
              isSpecialShape: 'T'
            });
            markVisited(row - 1, midCol);
            markVisited(row + 1, midCol);
          }
        }
      }
    }
  }

  // Find vertical matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for vertical match
      let length = 1;
      while (row + length < BOARD_SIZE && 
             board[row + length][col].color === color &&
             !isVisited(row + length, col)) {
        length++;
      }

      if (length >= GAME_CONSTANTS.MIN_MATCH_LENGTH) {
        const matchTiles = [];
        for (let i = 0; i < length; i++) {
          matchTiles.push({ row: row + i, col });
          markVisited(row + i, col);
        }
        
        matches.push({
          color,
          tiles: matchTiles,
          length
        });

        // Check for L shape if match is 3 tiles
        if (length === 3) {
          // Check for horizontal extension at bottom
          const bottomRow = row + 2;
          if (col < BOARD_SIZE - 2 &&
              board[bottomRow][col + 1].color === color &&
              board[bottomRow][col + 2].color === color) {
            matches.push({
              color,
              tiles: [
                ...matchTiles,
                { row: bottomRow, col: col + 1 },
                { row: bottomRow, col: col + 2 }
              ],
              isSpecialShape: 'L'
            });
            markVisited(bottomRow, col + 1);
            markVisited(bottomRow, col + 2);
          }
        }
      }
    }
  }

  return matches;
};

export interface BoardSlice {
  board: Tile[][];
  initializeBoard: () => void;
  dropTiles: () => Promise<Tile[][]>;
  fillEmptyTiles: () => Promise<Tile[][]>;
  markTilesForDestruction: (tiles: { row: number; col: number }[]) => Promise<{ destroyedTiles: { row: number; col: number; color: Color }[] }>;
  markTilesAsMatched: (tiles: { row: number; col: number }[]) => Promise<{ matchedTiles: { row: number; col: number; color: Color }[] }>;
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => Promise<void>;
  updateTile: (row: number, col: number, tile: Partial<Tile>) => void;
  setBoard: (newBoard: Tile[][]) => void;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;  
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
}

const createEmptyTile = (): Tile => ({
  color: 'empty',
  isMatched: false,
  isNew: false,
  isAnimating: false,
  isFrozen: false,
  isIgnited: false
});

export const createBoardSlice: StateCreator<GameState, [], [], BoardSlice> = (set, get) => ({
  board: Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(null).map(() => createEmptyTile())
  ),

  /**
   * Initializes the game board with a valid starting configuration.
   * IMPORTANT: The initial board must NOT contain any matches to ensure fair gameplay.
   * This requirement is defined in GAME_FLOW.BOARD_RULES.INITIALIZE_CONDITIONS.NO_INITIAL_MATCHES
   * 
   * The algorithm works by:
   * 1. Starting with an empty board
   * 2. Filling each position one at a time, left-to-right, top-to-bottom
   * 3. For each position, checking what colors would NOT create a match
   * 4. Only placing colors that don't create matches with existing tiles
   * 
   * Match prevention rules:
   * - No three or more same-colored tiles horizontally
   * - No three or more same-colored tiles vertically
   * - With 5 colors and only checking 2 previous tiles, there will always be valid options
   * 
   * @preserveGameRules This function implements core board initialization rules.
   * @preserveMatchPrevention This function MUST maintain the match prevention logic.
   */
  initializeBoard: () => {
    debugLog('BOARD_SLICE', 'Initializing board');
    const newBoard = Array(BOARD_SIZE).fill(null).map(() =>
      Array(BOARD_SIZE).fill(null).map(() => ({
        color: 'empty' as Color,
        isMatched: false,
        isNew: true,
        isAnimating: true,
        isFrozen: false,
        isIgnited: false
      }))
    );

    /**
     * Checks if placing a color at the given position would create a match.
     * This is critical for preventing initial matches on the board.
     * 
     * @param row - The row index to check
     * @param col - The column index to check
     * @param color - The color to check for matches
     * @returns true if placing the color would create a match, false otherwise
     */
    const wouldCreateMatch = (row: number, col: number, color: Color): boolean => {
      // Check horizontal matches (need at least 2 same colors to the left)
      if (col >= 2) {
        if (newBoard[row][col - 1].color === color && 
            newBoard[row][col - 2].color === color) {
          return true;
        }
      }

      // Check vertical matches (need at least 2 same colors above)
      if (row >= 2) {
        if (newBoard[row - 1][col].color === color && 
            newBoard[row - 2][col].color === color) {
          return true;
        }
      }

      return false;
    };

    // Fill the board one tile at a time, ensuring no matches are created
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Get available colors that won't create a match
        const availableColors = COLORS.filter((color: Color) => !wouldCreateMatch(row, col, color));
        
        // If no colors are available (shouldn't happen with 5 colors), use any color
        const color = availableColors.length > 0 
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : COLORS[Math.floor(Math.random() * COLORS.length)];

        newBoard[row][col] = {
          color: color as Color,
          isMatched: false,
          isNew: true,
          isAnimating: true,
          isFrozen: false,
          isIgnited: false
        };
      }
    }

    set({ board: newBoard });
    debugLog('BOARD_SLICE', 'Board initialized', newBoard);
  },

  dropTiles: async () => {
    debugLog('BOARD_SLICE', 'Starting tile drop');
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasDropped = false;

    // Drop tiles down to fill empty spaces
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (newBoard[row][col].color === 'empty') {
          // Find the next non-empty tile above
          let sourceRow = row - 1;
          while (sourceRow >= 0 && newBoard[sourceRow][col].color === 'empty' && newBoard[sourceRow][col].isFrozen === false) {
            sourceRow--;
          }
          if (sourceRow >= 0) {
            // Drop the tile down
            newBoard[row][col] = { ...newBoard[sourceRow][col], isAnimating: true };
            newBoard[sourceRow][col] = createEmptyTile();
            hasDropped = true;
          }
        }
      }
    }

    if (hasDropped) {
      debugLog('BOARD_SLICE', 'Tiles dropped, updating board');
      get().setBoard(newBoard);
      // Wait for the drop animation to complete
      await get().waitForAnimation();
    }

    return newBoard;
  },

  fillEmptyTiles: async () => {
    debugLog('BOARD_SLICE', 'Filling empty tiles');
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasFilled = false;

    // Fill empty spaces with new tiles
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newBoard[row][col].color === 'empty') {
          // Generate a new tile with random color from Color type
          const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black']; // Using Color type
          const newColor = colors[Math.floor(Math.random() * colors.length)];
          newBoard[row][col] = {
            color: newColor,
            isMatched: false,
            isNew: true,
            isAnimating: true,
            isFrozen: false,
            isIgnited: false
          };
          hasFilled = true;
        }
      }
    }

    if (hasFilled) {
      debugLog('BOARD_SLICE', 'Empty tiles filled, updating board');
      get().setBoard(newBoard);
      // Wait for the fill animation to complete
      await get().waitForAnimation();
    }

    return newBoard;
  },

  /**
   * Processes a new board state, handling cascading matches and animations.
   * Implements the combo system rules from GAME_FLOW.COMBO_RULES.
   * 
   * @preserveGameRules This function implements core cascade and combo mechanics.
   */
  processNewBoard: async (newBoard: Tile[][]) => {
    debugLog('BOARD_SLICE', 'Processing new board');
    let currentBoard = newBoard.map(row => [...row]);
    let hasMatches = false;
    const MAX_CASCADES = 20; // Safety limit to prevent infinite loops
    let cascadeCount = 0;

    // First, check if there are any matched/destroyed tiles that need to be processed
    const matchedTiles: { row: number; col: number; tile: Tile }[] = [];
    currentBoard.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.isMatched) {
          matchedTiles.push({ row: rowIndex, col: colIndex, tile });
        }
      });
    });

    debugLog('BOARD_SLICE', 'Initial board state:', {
      matchedTilesCount: matchedTiles.length,
      matchedTiles,
      hasMatchedTiles: matchedTiles.length > 0
    });

    if (matchedTiles.length > 0) {
      debugLog('BOARD_SLICE', 'Found matched tiles, waiting for destruction animation');
      // Set the current board state with matched tiles
      set({ board: currentBoard });
      await get().waitForAnimation();

      debugLog('BOARD_SLICE', 'Processing drops and fills');
      // Drop existing tiles and fill empty spaces
      currentBoard = await get().dropTiles();
      
      // Check if we have any empty tiles after dropping
      const emptyTiles: { row: number; col: number }[] = [];
      currentBoard.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
          if (tile.color === 'empty') {
            emptyTiles.push({ row: rowIndex, col: colIndex });
          }
        });
      });
      
      debugLog('BOARD_SLICE', 'Board state after drops:', {
        emptyTilesCount: emptyTiles.length,
        emptyTiles
      });
      
      if (emptyTiles.length > 0) {
        debugLog('BOARD_SLICE', 'Found empty tiles after drop, filling with new tiles');
        currentBoard = await get().fillEmptyTiles();
      }
      
      // Set the board state after filling
      set({ board: currentBoard });
      await get().waitForAnimation();
      debugLog('BOARD_SLICE', 'Drops and fills completed');
    }

    do {
      // Set the current board state
      set({ board: currentBoard });

      // Process matches and calculate damage
      hasMatches = await get().processMatches();

      if (hasMatches && cascadeCount < MAX_CASCADES) {
        cascadeCount++;
        debugLog('BOARD_SLICE', `Processing cascade ${cascadeCount}`);

        // Drop existing tiles and fill empty spaces
        currentBoard = await get().dropTiles();
        
        // Check if we have any empty tiles after dropping
        const hasEmptyTiles = currentBoard.some(row => 
          row.some(tile => tile.color === 'empty')
        );
        
        if (hasEmptyTiles) {
          debugLog('BOARD_SLICE', 'Found empty tiles after drop, filling with new tiles');
          currentBoard = await get().fillEmptyTiles();
          // Set the board state after filling
          set({ board: currentBoard });
          await get().waitForAnimation();
        }
      } else {
        hasMatches = false; // Force exit if we hit the cascade limit
      }
    } while (hasMatches);

    // After all cascades, check if board needs reinitialization
    if (GAME_FLOW.BOARD_RULES.REQUIRES_POSSIBLE_MATCH) {
      const hasValidMoves = get().hasValidMoves();
      if (!hasValidMoves) {
        debugLog('BOARD_SLICE', 'No valid moves available, reinitializing board');
        get().initializeBoard();
      }
    }

    get().resetCombo(); // Reset combo counter after all processing is complete
  },

  updateTile: (row: number, col: number, tile: Partial<Tile>) => {
    debugLog('BOARD_SLICE', 'Updating tile', { row, col, tile });
    const board = get().board;
    board[row][col] = { ...board[row][col], ...tile };
    set({ board: [...board] });
  },

  markTilesForDestruction: async (tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_SLICE', 'Marking tiles for destruction', tiles);
    const board = get().board;
    const destroyedTiles: { row: number; col: number; color: Color }[] = [];

    // First, mark all tiles for destruction
    tiles.forEach(({ row, col }) => {
      const tile = board[row][col];
      debugLog('BOARD_SLICE', `Processing tile [${row},${col}] for destruction:`, {
        currentState: tile,
        isAlreadyMatched: tile.isMatched,
        isAnimating: tile.isAnimating
      });

      // Store the tile's info before modifying
      destroyedTiles.push({ row, col, color: tile.color });
      
      // Always mark the tile as matched and animating
      board[row][col] = {
        ...tile,
        isMatched: true,
        isAnimating: true,
        isNew: false // Ensure it's not treated as a new tile
      };

      debugLog('BOARD_SLICE', `Marked tile [${row},${col}] for destruction`, {
        newState: board[row][col]
      });
    });

    // Update the board state with a new array reference to trigger React updates
    set({ board: [...board] });
    
    // Log the final state of all affected tiles
    tiles.forEach(({ row, col }) => {
      debugLog('BOARD_SLICE', `Final state for tile [${row},${col}]:`, {
        tile: board[row][col],
        isMatched: board[row][col].isMatched,
        isAnimating: board[row][col].isAnimating
      });
    });

    debugLog('BOARD_SLICE', 'Tiles marked for destruction, final state:', {
      destroyedTiles,
      centerTileState: destroyedTiles.length > 0 ? board[tiles[0].row][tiles[0].col] : null
    });

    return { destroyedTiles };
  },

  markTilesAsMatched: async (tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_SLICE', 'Marking tiles as matched', tiles);
    const board = get().board;
    const matchedTiles: { row: number; col: number; color: Color }[] = [];

    tiles.forEach(({ row, col }) => {
      const tile = board[row][col];
      if (!tile.isMatched) {
        matchedTiles.push({ row, col, color: tile.color });
        board[row][col] = {
          ...tile,
          isMatched: true,
          isAnimating: true
        };
      }
    });

    set({ board: [...board] });
    await get().waitForAnimation();

    debugLog('BOARD_SLICE', 'Tiles marked as matched', matchedTiles);
    return { matchedTiles };
  },

  convertTiles: async (tiles: { row: number; col: number; color: Color }[]) => {
    debugLog('BOARD_SLICE', 'Converting tiles', tiles);
    const board = get().board;

    tiles.forEach(({ row, col, color }) => {
      board[row][col] = {
        ...board[row][col],
        color,
        isAnimating: true
      };
    });

    set({ board: [...board] });
    await get().waitForAnimation();
    debugLog('BOARD_SLICE', 'Tiles converted');
  },

  setBoard: (newBoard: Tile[][]) => {
    set({ board: newBoard });
  },

  /**
   * Checks if there are any valid moves available on the board.
   * A valid move is one that would create a match.
   * This implements the requirement from GAME_FLOW.BOARD_RULES.REQUIRES_POSSIBLE_MATCH
   * 
   * @preserveGameRules This function ensures the game remains playable.
   * @returns true if there are valid moves available, false otherwise
   */
  hasValidMoves: () => {
    const board = get().board;
    
    // Check horizontal swaps
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        // Create a temporary board with the swap applied
        const tempBoard = board.map(row => [...row]);
        const temp = { ...tempBoard[row][col] };
        tempBoard[row][col] = { ...tempBoard[row][col + 1] };
        tempBoard[row][col + 1] = temp;
        
        // Check if this swap creates a match
        if (findMatches(tempBoard).length > 0) {
          return true;
        }
      }
    }
    
    // Check vertical swaps
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 1; row++) {
        // Create a temporary board with the swap applied
        const tempBoard = board.map(row => [...row]);
        const temp = { ...tempBoard[row][col] };
        tempBoard[row][col] = { ...tempBoard[row + 1][col] };
        tempBoard[row + 1][col] = temp;
        
        // Check if this swap creates a match
        if (findMatches(tempBoard).length > 0) {
          return true;
        }
      }
    }
    
    return false;
  },

  swapTiles: async (row1: number, col1: number, row2: number, col2: number) => {
    debugLog('BOARD_SLICE', 'Attempting tile swap', { row1, col1, row2, col2 });
    if (!get().wouldCreateMatch(row1, col1, row2, col2)) {
      debugLog('BOARD_SLICE', 'Invalid swap - no match would be created');
      return false;
    }

    const board = get().board;
    const newBoard = board.map(row => [...row]);
    const temp = { ...newBoard[row1][col1] };
    newBoard[row1][col1] = { ...newBoard[row2][col2], isAnimating: true };
    newBoard[row2][col2] = { ...temp, isAnimating: true };

    debugLog('BOARD_SLICE', 'Processing board after swap');
    await get().processNewBoard(newBoard);

    // Only switch players if no extra turn was granted
    if (!get().extraTurnGranted) {
      get().switchPlayer();
    } else {
      // Reset extraTurnGranted for next turn
      get().setExtraTurn(false);
    }
    return true;
  },

}); 