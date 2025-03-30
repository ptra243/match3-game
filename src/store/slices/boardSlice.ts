import { StateCreator } from 'zustand';
import { Color, GameState, Tile } from '../types';
import { debugLog } from '../slices/debug';
import { GAME_CONSTANTS, GAME_FLOW } from '../gameRules';
import { TileHelpers } from '../skills/effects/TileHelpers';

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
  markTilesAsMatched: (tiles: { row: number; col: number }[]) => Promise<{
    matchedTiles: { row: number; col: number; color: Color }[];
    explosionTilesCount: number;
  }>;
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

    // Create the initial board array
    const initialBoard = Array(BOARD_SIZE).fill(null).map(() =>
      Array(BOARD_SIZE).fill(null).map(() => ({
        color: 'empty' as Color,
        isMatched: false,
        isNew: true,
        isAnimating: true,
        isFrozen: false,
        isIgnited: false
      }))
    );

    // Fill the board with valid colors
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Get available colors that won't create a match
        const availableColors = COLORS.filter((color: Color) => {
          // Check horizontal matches
          if (col >= 2) {
            if (initialBoard[row][col - 1].color === color &&
              initialBoard[row][col - 2].color === color) {
              return false;
            }
          }

          // Check vertical matches
          if (row >= 2) {
            if (initialBoard[row - 1][col].color === color &&
              initialBoard[row - 2][col].color === color) {
              return false;
            }
          }

          return true;
        });

        // If no colors are available (shouldn't happen with 5 colors), use any color
        const color = availableColors.length > 0
          ? availableColors[Math.floor(Math.random() * availableColors.length)]
          : COLORS[Math.floor(Math.random() * COLORS.length)];

        initialBoard[row][col] = {
          ...initialBoard[row][col],
          color: color as Color
        };
      }
    }

    // Set the board state once with the complete initial board
    set((state) => {
      state.board = initialBoard;
      return state;
    });

    debugLog('BOARD_SLICE', 'Board initialized');
  },

  dropTiles: async () => {
    debugLog('BOARD_SLICE', 'Starting tile drop');
    let hasDropped = false;
    const state = get();

    // Track which tiles have been dropped to avoid processing them again
    const droppedTiles = new Set<string>();

    // Collect all drops first
    const drops: Array<{
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
      color: Color;
      animId: string;
    }> = [];

    // Process each column from bottom to top
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        // Skip if tile is frozen
        if (state.board[row][col].isFrozen) {
          continue;
        }

        // If current tile is empty or has been dropped, find the next non-empty tile above
        if (state.board[row][col].color === 'empty' || droppedTiles.has(`${row},${col}`)) {
          let sourceRow = row - 1;
          while (sourceRow >= 0 &&
            (state.board[sourceRow][col].color === 'empty' ||
              state.board[sourceRow][col].isFrozen ||
              droppedTiles.has(`${sourceRow},${col}`))) {
            sourceRow--;
          }

          if (sourceRow >= 0) {
            hasDropped = true;
            const sourceColor = state.board[sourceRow][col].color;

            // Register animation for this specific tile
            const tileId = `tile-${row}-${col}`;
            const animId = get().registerAnimation('fallIn', [tileId], {
              fromRow: sourceRow,
              toRow: row,
              col: col,
              color: sourceColor
            });

            drops.push({
              fromRow: sourceRow,
              fromCol: col,
              toRow: row,
              toCol: col,
              color: sourceColor,
              animId
            });

            // Mark the source tile as dropped
            droppedTiles.add(`${sourceRow},${col}`);
          }
        }
      }
    }

    // Update the board state for all drops at once
    if (hasDropped) {
      set((state) => {
        for (const drop of drops) {
          // Move the tile down
          state.board[drop.toRow][drop.toCol] = {
            ...state.board[drop.fromRow][drop.fromCol],
            isAnimating: true,
            isNew: false
          };
          // Clear the source tile
          state.board[drop.fromRow][drop.fromCol] = createEmptyTile();
        }
        return state;
      });

      // Start all animations at once
      for (const drop of drops) {
        get().startAnimation(drop.animId);
      }
    }

    return get().board;
  },

  fillEmptyTiles: async () => {
    debugLog('BOARD_SLICE', 'Filling empty tiles');
    let hasFilled = false;

    // Get empty positions and register animations first
    const emptyPositions: Array<{ row: number; col: number; color: Color }> = [];
    const animationIds: string[] = [];
    const state = get();

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (state.board[row][col].color === 'empty') {
          const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black'];
          const newColor = colors[Math.floor(Math.random() * colors.length)];
          
          emptyPositions.push({ row, col, color: newColor });
          const tileId = `tile-${row}-${col}`;
          
          const animId = get().registerAnimation('fallIn', [tileId], {
            row,
            col,
            color: newColor
          });
          animationIds.push(animId);
          hasFilled = true;
        }
      }
    }

    // Then update the board state
    if (hasFilled) {
      set((state) => {
        for (const { row, col, color } of emptyPositions) {
          state.board[row][col] = {
            color,
            isMatched: false,
            isNew: true,
            isAnimating: true,
            isFrozen: false,
            isIgnited: false
          };
        }
        return state;
      });

      // Start all fallIn animations
      for (const animId of animationIds) {
        get().startAnimation(animId);
      }
    }

    return get().board;
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

    // First, check if there are any empty tiles that need to be processed
    const emptyTiles: { row: number; col: number }[] = [];
    currentBoard.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.color === 'empty') {
          emptyTiles.push({ row: rowIndex, col: colIndex });
        }
      });
    });

    debugLog('BOARD_SLICE', 'Initial empty tiles check:', {
      emptyTilesCount: emptyTiles.length,
      emptyTiles
    });

    if (emptyTiles.length > 0) {
      debugLog('BOARD_SLICE', 'Found empty tiles, filling with new tiles');
      // Process drops and fills for empty tiles
      currentBoard = await get().dropTiles();
      currentBoard = await get().fillEmptyTiles();

      // Set the board state after filling
      set({ board: currentBoard });
      await get().waitForAllAnimations();
      debugLog('BOARD_SLICE', 'Empty tiles filled');
    }

    // Now, check if there are any matched/destroyed tiles that need to be processed
    const matchedTiles: { row: number; col: number; tile: Tile }[] = [];
    currentBoard.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        if (tile.isMatched) {
          matchedTiles.push({ row: rowIndex, col: colIndex, tile });
        }
      });
    });

    debugLog('BOARD_SLICE', 'Matched tiles check:', {
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
      const emptyTilesAfterDrop: { row: number; col: number }[] = [];
      currentBoard.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
          if (tile.color === 'empty') {
            emptyTilesAfterDrop.push({ row: rowIndex, col: colIndex });
          }
        });
      });

      debugLog('BOARD_SLICE', 'Board state after drops:', {
        emptyTilesCount: emptyTilesAfterDrop.length,
        emptyTiles: emptyTilesAfterDrop
      });

      if (emptyTilesAfterDrop.length > 0) {
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
    if (cascadeCount === MAX_CASCADES) {
      debugLog('BOARD_SLICE', 'Max cascades reached');
    }
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
    set((state) => {
      state.board[row][col] = { ...state.board[row][col], ...tile };
      return state;
    });
  },

  markTilesForDestruction: async (tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_SLICE', 'Marking tiles for destruction', tiles);
    const destroyedTiles: { row: number; col: number; color: Color }[] = [];
    const animationIds: string[] = [];
    const state = get();

    // Register explode animations for all tiles being destroyed
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], {
        row,
        col,
        color: state.board[row][col].color
      });
      animationIds.push(animId);

      // Store the tile's info
      destroyedTiles.push({ row, col, color: state.board[row][col].color });
    }

    // Update tile states
    set((state) => {
      for (const { row, col } of tiles) {
        state.board[row][col] = {
          ...state.board[row][col],
          isMatched: true,
          isAnimating: true,
          isNew: false
        };
      }
      return state;
    });

    // Start the animations
    for (const animId of animationIds) {
      get().startAnimation(animId);
    }

    // Wait for animations to complete
    await get().waitForAllAnimations();

    debugLog('BOARD_SLICE', 'Tiles marked for destruction, animations complete', { destroyedTiles });
    return { destroyedTiles };
  },

  markTilesAsMatched: async (tiles: { row: number; col: number }[]) => {
    debugLog('BOARD_SLICE', 'Marking tiles as matched', tiles);
    const matchedTiles: { row: number; col: number; color: Color }[] = [];

    // First pass: identify ignited tiles and their chain reactions
    const state = get();
    const ignitedTilesQueue: { row: number; col: number }[] = [];

    // Helper function to get tile key for Set
    const getTileKey = (row: number, col: number) => `${row},${col}`;

    // Process ignited tiles with BFS (Breadth-First Search)
    function processIgnitedTiles(state: GameState, tiles: { row: number; col: number; }[]) {
      const explosionTiles: { row: number; col: number; }[] = [];
      const processedTiles = new Set();
      const ignitedTilesQueue: { row: number; col: number; }[] = [];

      // Helper to check if a tile is valid for processing
      const isValidTile = (row: number, col: number) => {
        const tileKey = getTileKey(row, col);
        return !processedTiles.has(tileKey) &&
          state.board[row][col].color !== 'empty' &&
          !tiles.some(t => t.row === row && t.col === col);
      };

      // Add initial ignited tiles to queue
      tiles.forEach(({ row, col }) => {
        if (state.board[row][col].isIgnited) {
          ignitedTilesQueue.push({ row, col });
          processedTiles.add(getTileKey(row, col));
        }
      });

      // Process queue with BFS
      while (ignitedTilesQueue.length > 0) {
        const tile = ignitedTilesQueue.shift();
        if (!tile) continue;
        const { row, col } = tile;

        debugLog('BOARD_SLICE', 'Processing ignited tile', {
          row, col, color: state.board[row][col].color
        });

        // Get and process valid surrounding tiles
        TileHelpers.selectPattern(state.board, row, col, 'square', 3)
          .filter(({ row, col }) => isValidTile(row, col))
          .forEach(({ row, col }) => {
            explosionTiles.push({ row, col });
            processedTiles.add(getTileKey(row, col));

            // Check for chain reactions
            if (state.board[row][col].isIgnited) {
              ignitedTilesQueue.push({ row, col });
              debugLog('BOARD_SLICE', 'Found chain reaction ignited tile', { row, col });
            }
          });
      }

      return explosionTiles;
    }

    // Using the function
    const explosionTiles = processIgnitedTiles(state, tiles);

    // Combine original matched tiles with explosion tiles
    const allTiles = [...tiles, ...explosionTiles];

    // Clear the selected tile to prevent interference with animations
    set((state) => {
      state.selectedTile = null;
      return state;
    });

    // Register explode animations for all matched tiles
    const animationIds: string[] = [];
    
    // First update the board state
    set((state) => {
      for (const { row, col } of allTiles) {
        // Mark tiles as matched
        matchedTiles.push({ row, col, color: state.board[row][col].color });
        state.board[row][col] = {
          ...state.board[row][col],
          isMatched: true,
          isAnimating: true
        };
      }
      return state;
    });

    // Then register animations outside of set
    for (const { row, col } of allTiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], {
        row,
        col,
        color: get().board[row][col].color
      });
      animationIds.push(animId);
    }

    // Start the animations and wait for them to complete
    for (const animId of animationIds) {
      get().startAnimation(animId);
    }

    // Wait for all animations to complete
    await get().waitForAllAnimations();

    // Add a debug message about ignited tile explosions if any occurred
    if (explosionTiles.length > 0) {
      debugLog('BOARD_SLICE', 'Ignited tile explosion chain', {
        ignitedCount: explosionTiles.length,
        totalMatched: matchedTiles.length,
        chainReactions: ignitedTilesQueue.length > 0
      });
    }

    return {
      matchedTiles,
      explosionTilesCount: explosionTiles.length
    };
  },

  convertTiles: async (tiles: { row: number; col: number; color: Color }[]) => {
    debugLog('BOARD_SLICE', 'Converting tiles', tiles);
    const state = get();

    // Register explode animations for all tiles first
    const destroyAnimIds: string[] = [];
    for (const { row, col } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('explode', [tileId], {
        row,
        col,
        color: state.board[row][col].color
      });
      destroyAnimIds.push(animId);
    }

    // Update the board with exploding tiles
    set((state) => {
      for (const { row, col } of tiles) {
        state.board[row][col] = {
          ...state.board[row][col],
          isMatched: true,
          isAnimating: true
        };
      }
      return state;
    });

    // Start all explode animations
    for (const animId of destroyAnimIds) {
      get().startAnimation(animId);
    }

    // Wait for explosion animations to complete
    await get().waitForAllAnimations();

    // Set tiles to empty to prepare for fallIn
    set((state) => {
      for (const { row, col } of tiles) {
        state.board[row][col] = {
          ...state.board[row][col],
          color: 'empty' as Color,
          isMatched: false,
          isAnimating: true
        };
      }
      return state;
    });

    // Register fallIn animations
    const fallInAnimIds: string[] = [];
    for (const { row, col, color } of tiles) {
      const tileId = `tile-${row}-${col}`;
      const animId = get().registerAnimation('fallIn', [tileId], {
        row,
        col,
        color: color
      });
      fallInAnimIds.push(animId);
    }

    // Update the board with the new colors
    set((state) => {
      for (const { row, col, color } of tiles) {
        state.board[row][col] = {
          ...state.board[row][col],
          color: color,
          isMatched: false,
          isAnimating: true
        };
      }
      return state;
    });

    // Start fallIn animations
    for (const animId of fallInAnimIds) {
      get().startAnimation(animId);
    }

    // Wait for fallIn animations to complete
    await get().waitForAllAnimations();
  },

  setBoard: (newBoard: Tile[][]) => {
    set((state) => {
      state.board = newBoard;
      return state;
    });
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

    set((state) => {
      const temp = { ...state.board[row1][col1] };
      state.board[row1][col1] = { ...state.board[row2][col2], isAnimating: true };
      state.board[row2][col2] = { ...temp, isAnimating: true };
      return state;
    });

    debugLog('BOARD_SLICE', 'Processing board after swap');
    await get().processNewBoard(get().board);

    // Let switchPlayer handle extra turns
    get().switchPlayer();
    return true;
  },
}); 