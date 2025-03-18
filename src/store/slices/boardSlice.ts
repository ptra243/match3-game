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
      await get().waitForAllAnimations();
    }

    return newBoard;
  },

  fillEmptyTiles: async () => {
    debugLog('BOARD_SLICE', 'Filling empty tiles');
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasFilled = false;
    
    // Get empty positions for animations
    const emptyPositions = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newBoard[row][col].color === 'empty') {
          emptyPositions.push({ row, col });
        }
      }
    }
    
    // Register fallIn animations for all empty positions first
    const animationIds = [];
    for (const { row, col } of emptyPositions) {
      const tileId = `tile-${row}-${col}`;
      // Generate a new color for this position
      const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
      const newColor = colors[Math.floor(Math.random() * colors.length)];
      
      const animId = get().registerAnimation('fallIn', [tileId], { 
        row, 
        col, 
        color: newColor
      });
      animationIds.push(animId);
      
      // Update the board with the new color and animation state
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

    if (hasFilled) {
      debugLog('BOARD_SLICE', 'Empty tiles filled, updating board');
      get().setBoard(newBoard);
      
      // Start all fallIn animations
      for (const animId of animationIds) {
        get().startAnimation(animId);
      }
      
      // Wait for the fill animation to complete
      await get().waitForAllAnimations();
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
      await get().waitForAllAnimations();

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
      await get().waitForAllAnimations();
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
          await get().waitForAllAnimations();
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

    // 1. Create animation sequence for destroyed tiles
    const animationIds = [];

    // Register explode animations for all tiles being destroyed
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], { 
        row, 
        col, 
        color: board[row][col].color 
      });
      animationIds.push(animId);
      
      // Store the tile's info
      destroyedTiles.push({ row, col, color: board[row][col].color });
    }

    // 2. Update the board state with marked tiles
    const newBoard = board.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const isDestroyed = tiles.some(t => t.row === rowIndex && t.col === colIndex);
        if (isDestroyed) {
          return { 
            ...tile, 
            isMatched: true, 
            isAnimating: true,
            isNew: false // Ensure it's not treated as a new tile
          };
        }
        return tile;
      })
    );

    // 3. Update the board state
    set({ board: newBoard });
    
    // 4. Start the animations
    for (const animId of animationIds) {
      get().startAnimation(animId);
    }
    
    // 5. Wait for animations to complete
    await get().waitForAllAnimations();
    
    debugLog('BOARD_SLICE', 'Tiles marked for destruction, animations complete', { destroyedTiles });
    return { destroyedTiles };
  },

  markTilesAsMatched: async (tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_SLICE', 'Marking tiles as matched', tiles);
    const board = get().board;
    const matchedTiles: { row: number; col: number; color: Color }[] = [];

    // 1. Create animation sequence for matched tiles
    const sequenceId = `match-sequence-${Date.now()}`;
    const animationIds = [];

    // Register explode animations for all matched tiles
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], { 
        row, 
        col, 
        color: board[row][col].color 
      });
      animationIds.push(animId);
    }

    // 2. Mark tiles as matched in the board state
    const newBoard = board.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const isMatched = tiles.some(t => t.row === rowIndex && t.col === colIndex);
        if (isMatched) {
          matchedTiles.push({ row: rowIndex, col: colIndex, color: tile.color });
          return { ...tile, isMatched: true, isAnimating: true };
        }
        return tile;
      })
    );

    // 3. Update the board state
    set({ board: newBoard });
    
    // 4. Start the animations and wait for them to complete
    for (const animId of animationIds) {
      get().startAnimation(animId);
    }
    
    // 5. Wait for all animations to complete
    await get().waitForAllAnimations();
    
    return { matchedTiles };
  },

  convertTiles: async (tiles: { row: number; col: number; color: Color }[]) => {
    debugLog('BOARD_SLICE', 'Converting tiles', tiles);
    
    // 1. First mark the tiles as matched/empty and animate the explosion
    const board = get().board;
    const destroyAnimIds = [];
    
    // Register explode animations for all tiles first
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], { 
        row, 
        col, 
        color: board[row][col].color 
      });
      destroyAnimIds.push(animId);
    }
    
    // Update the board with exploding tiles
    const explodeBoard = board.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const convertedTile = tiles.find(t => t.row === rowIndex && t.col === colIndex);
        if (convertedTile) {
          return { 
            ...tile, 
            isMatched: true,
            isAnimating: true 
          };
        }
        return tile;
      })
    );
    
    // Update board state for explode animation
    set({ board: explodeBoard });
    
    // Start all explode animations
    for (const animId of destroyAnimIds) {
      get().startAnimation(animId);
    }
    
    // Wait for explosion animations to complete
    await get().waitForAllAnimations();
    
    // 2. Now set tiles to empty to prepare for fallIn
    const emptyBoard = explodeBoard.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const convertedTile = tiles.find(t => t.row === rowIndex && t.col === colIndex);
        if (convertedTile) {
          return { 
            ...tile, 
            color: 'empty' as Color,
            isMatched: false,
            isAnimating: true 
          };
        }
        return tile;
      })
    );
    
    // Update to empty state
    set({ board: emptyBoard });
    
    // 3. Register fallIn animations
    const fallInAnimIds = [];
    for (const { row, col, color } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('fallIn', [tileId], { 
        row, 
        col, 
        color: color
      });
      fallInAnimIds.push(animId);
    }

    // 4. Update the board with the new colors
    const newBoard = emptyBoard.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const convertedTile = tiles.find(t => t.row === rowIndex && t.col === colIndex);
        if (convertedTile) {
          return { 
            ...tile, 
            color: convertedTile.color,
            isMatched: false,
            isAnimating: true 
          };
        }
        return tile;
      })
    );

    // Update board state with new colors
    set({ board: newBoard });
    
    // Start fallIn animations
    for (const animId of fallInAnimIds) {
      get().startAnimation(animId);
    }
    
    // Wait for fallIn animations to complete
    await get().waitForAllAnimations();
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
    const BOARD_SIZE = board.length;
    
    // Check horizontal swaps
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        // Create a temporary board with the swap applied
        const tempBoard = board.map(row => [...row]);
        const temp = { ...tempBoard[row][col] };
        tempBoard[row][col] = { ...tempBoard[row][col + 1] };
        tempBoard[row][col + 1] = temp;
        
        // Check if this swap creates a match
        if (get().findMatches(tempBoard).length > 0) {
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
        if (get().findMatches(tempBoard).length > 0) {
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