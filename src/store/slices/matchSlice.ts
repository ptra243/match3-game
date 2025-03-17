import { StateCreator } from 'zustand';
import { GameState, Color, Match as TileMatch, Tile } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';
import { GAME_CONSTANTS, MATCH_RULES } from '../gameRules';

// Import debug configuration
import { debugLog } from '../slices/debug';

interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
  isSpecialShape?: 'T' | 'L';
  length?: number;
}

export interface MatchSlice {
  currentMatchSequence: number;
  currentCombo: number;
  processMatches: () => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
  findMatches: (board: Tile[][]) => Match[];
  hasValidMoves: () => boolean;
  markTilesAsMatched: (tiles: { row: number; col: number }[]) => Promise<{ matchedTiles: { row: number; col: number; color: Color }[] }>;
  markTilesForDestruction: (tiles: { row: number; col: number }[]) => Promise<{ destroyedTiles: { row: number; col: number; color: Color }[] }>;
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => Promise<void>;
}


/**
 * Finds all matches on the board, including special shapes (T and L).
 * @param board The current game board
 * @returns Array of matches found
 */
const findMatches = (board: Tile[][]): TileMatch[] => {
  const matches: TileMatch[] = [];
  const BOARD_SIZE = board.length;
  const visited = new Set<string>();

  // Helper to check if a tile has been included in a match
  const isVisited = (row: number, col: number) => visited.has(`${row},${col}`);
  const markVisited = (row: number, col: number) => visited.add(`${row},${col}`);
  const markTilesVisited = (tiles: { row: number; col: number }[]) => {
    tiles.forEach(tile => markVisited(tile.row, tile.col));
  };

  // First, find all potential T and L shapes and 5-matches
  // Check for horizontal 5-matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 4; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for 5 in a row
      if (board[row][col + 1].color === color &&
          board[row][col + 2].color === color &&
          board[row][col + 3].color === color &&
          board[row][col + 4].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 5; i++) {
          matchTiles.push({ row, col: col + i });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 5
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  // Check for vertical 5-matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 4; row++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for 5 in a column
      if (board[row + 1][col].color === color &&
          board[row + 2][col].color === color &&
          board[row + 3][col].color === color &&
          board[row + 4][col].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 5; i++) {
          matchTiles.push({ row: row + i, col });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 5
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  // Check for T shapes
  for (let row = 1; row < BOARD_SIZE - 1; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for horizontal part of T
      if (board[row][col + 1].color === color &&
          board[row][col + 2].color === color) {
        // Check for vertical part at middle tile
        const midCol = col + 1;
        if (board[row - 1][midCol].color === color &&
            board[row + 1][midCol].color === color) {
          const tShapeTiles = [
            { row, col },
            { row, col: col + 1 },
            { row, col: col + 2 },
            { row: row - 1, col: midCol },
            { row: row + 1, col: midCol }
          ];
          matches.push({
            color,
            tiles: tShapeTiles,
            isSpecialShape: 'T',
            length: 5
          });
          markTilesVisited(tShapeTiles);
        }
      }
    }
  }

  // Check for L shapes
  for (let row = 0; row < BOARD_SIZE - 2; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      // Check for vertical part of L
      if (board[row + 1][col].color === color &&
          board[row + 2][col].color === color) {
        // Check for horizontal part at bottom
        if (board[row + 2][col + 1].color === color &&
            board[row + 2][col + 2].color === color) {
          const lShapeTiles = [
            { row, col },
            { row: row + 1, col },
            { row: row + 2, col },
            { row: row + 2, col: col + 1 },
            { row: row + 2, col: col + 2 }
          ];
          matches.push({
            color,
            tiles: lShapeTiles,
            isSpecialShape: 'L',
            length: 5
          });
          markTilesVisited(lShapeTiles);
        }
      }
    }
  }

  // Then find 4-matches
  // Horizontal 4-matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 3; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      if (board[row][col + 1].color === color &&
          board[row][col + 2].color === color &&
          board[row][col + 3].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 4; i++) {
          matchTiles.push({ row, col: col + i });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 4
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  // Vertical 4-matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 3; row++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      if (board[row + 1][col].color === color &&
          board[row + 2][col].color === color &&
          board[row + 3][col].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 4; i++) {
          matchTiles.push({ row: row + i, col });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 4
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  // Finally, find regular 3-matches
  // Horizontal 3-matches
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      if (board[row][col + 1].color === color &&
          board[row][col + 2].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 3; i++) {
          matchTiles.push({ row, col: col + i });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 3
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  // Vertical 3-matches
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      const color = board[row][col].color;
      if (color === 'empty' || isVisited(row, col)) continue;

      if (board[row + 1][col].color === color &&
          board[row + 2][col].color === color) {
        const matchTiles = [];
        for (let i = 0; i < 3; i++) {
          matchTiles.push({ row: row + i, col });
        }
        matches.push({
          color,
          tiles: matchTiles,
          length: 3
        });
        markTilesVisited(matchTiles);
      }
    }
  }

  return matches;
};

/**
 * Calculates damage for a match based on MATCH_RULES.DAMAGE_CALCULATION
 * 
 * @preserveGameRules This function implements core damage calculation rules
 */
const calculateMatchDamage = (match: TileMatch, isPrimaryColor: boolean, isSecondaryColor: boolean): number => {
  // Base damage = number of tiles in match
  let damage = match.tiles.length;

  // Length bonus for matches > 3
  if (match.length && match.length > GAME_CONSTANTS.MIN_MATCH_LENGTH) {
    const lengthBonus = (match.length - GAME_CONSTANTS.MIN_MATCH_LENGTH) * 
                       MATCH_RULES.DAMAGE_CALCULATION.LENGTH_BONUS_MULTIPLIER;
    damage += lengthBonus;
  }

  // Apply color multipliers
  if (isPrimaryColor) {
    damage *= MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.PRIMARY;
  } else if (isSecondaryColor) {
    damage *= MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.SECONDARY;
  }else{
    damage *= MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.NEUTRAL;
  }

  return Math.floor(damage);
};

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  currentMatchSequence: 0,
  currentCombo: 0,
  findMatches,
  
  processMatches: async () => {
    debugLog('MATCH_SLICE', 'Processing matches');
    const { currentPlayer } = get();
    const board = get().board;
    let hasMatches = false;
    let matchedColors: Record<Color, number> = {
      red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0,
    };

    // Find all matches
    const matches = findMatches(board);
    debugLog('MATCH_SLICE', 'Found matches', matches);
    
    if (matches.length > 0) {
      hasMatches = true;
      
      // Create a Set to track tiles that have been matched to avoid duplicates
      const matchedTiles = new Set<string>();
      const tilesToMark: { row: number; col: number }[] = [];
      
      matches.forEach((match: Match) => {
        match.tiles.forEach(({ row, col }) => {
          const tileKey = `${row},${col}`;
          if (!matchedTiles.has(tileKey)) {
            matchedColors[match.color]++;
            matchedTiles.add(tileKey);
            tilesToMark.push({ row, col });
          }
        });
      });

      debugLog('MATCH_SLICE', 'Processing matches', {
        matchedColors,
        tilesToMark,
        matches
      });

      // Mark tiles as matched in the current board and set board state
      tilesToMark.forEach(({ row, col }) => {
        board[row][col] = {
          ...board[row][col],
          isMatched: true,
          isAnimating: true
        };
      });
      get().setBoard([...board]);
      // Wait for match animation to complete
      await get().waitForAnimation();

      // Handle extra turn for special matches or matches > 3
      const hasSpecialMatch = matches.some(match => 
        match.isSpecialShape || 
        (match.tiles.length > GAME_CONSTANTS.MIN_MATCH_LENGTH)
      );
      if (hasSpecialMatch) {
        debugLog('MATCH_SLICE', 'Special match detected, granting extra turn');
        get().setExtraTurn(true);
        const reason = matches.find(m => m.isSpecialShape)?.isSpecialShape || 'long match';
        toast.success(`${reason === 'T' ? 'T-shape' : reason === 'L' ? 'L-shape' : 'Match of 4+'} - Extra turn granted!`);
      }

      // Update combo and matched colors
      get().incrementCombo();
      const currentPlayerState = get()[currentPlayer];
      set(state => ({
        [currentPlayer]: {
          ...state[currentPlayer],
          matchedColors: {
            ...currentPlayerState.matchedColors,
            red: currentPlayerState.matchedColors.red + matchedColors.red,
            blue: currentPlayerState.matchedColors.blue + matchedColors.blue,
            green: currentPlayerState.matchedColors.green + matchedColors.green,
            yellow: currentPlayerState.matchedColors.yellow + matchedColors.yellow,
            black: currentPlayerState.matchedColors.black + matchedColors.black,
          }
        }
      }));

      // Calculate and apply damage
      let totalDamage = 0;
      const characterClass = CLASSES[get()[currentPlayer].className];
      
      matches.forEach((match: Match) => {
        const isPrimaryColor = characterClass.primaryColor === match.color;
        const isSecondaryColor = characterClass.secondaryColor === match.color;
        const damage = calculateMatchDamage(match, isPrimaryColor, isSecondaryColor);
        debugLog('MATCH_SLICE', 'Calculated damage for match', {
          match,
          isPrimaryColor,
          isSecondaryColor,
          damage,
          characterClass
        });
        totalDamage += damage;
      });

      const opponent = currentPlayer === 'human' ? 'ai' : 'human';
      const playerDamageMultiplier = get()[currentPlayer].statusEffects.reduce(
        (multiplier, effect) => multiplier * (effect.damageMultiplier || 1), 1
      );
      const opponentDamageMultiplier = get()[opponent].statusEffects.reduce(
        (multiplier, effect) => multiplier * (effect.damageMultiplier || 1), 1
      );
      
      totalDamage = Math.round(totalDamage * playerDamageMultiplier * opponentDamageMultiplier);
      
      if (totalDamage > 0) {
        set(state => ({
          [opponent]: {
            ...state[opponent],
            health: Math.max(0, state[opponent].health - totalDamage)
          }
        }));
        toast.success(`Dealt ${totalDamage} damage to opponent!`);
      }
    }

    return hasMatches;
  },

  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
    debugLog('MATCH_SLICE', 'Checking potential match', { row1, col1, row2, col2 });
    const board = get().board;
    const tempBoard = board.map(row => [...row]);
    const temp = { ...tempBoard[row1][col1] };
    tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
    tempBoard[row2][col2] = { ...temp };
    const hasMatch = findMatches(tempBoard).length > 0;
    debugLog('MATCH_SLICE', 'Match check result', { hasMatch });
    return hasMatch;
  },

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

  markTilesAsMatched: async (tiles: { row: number; col: number }[]) => {
    const board = get().board;
    const matchedTiles: { row: number; col: number; color: Color }[] = [];

    // Create new board with matched tiles
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

    get().setBoard(newBoard);
    return { matchedTiles };
  },

  markTilesForDestruction: async (tiles: { row: number; col: number }[]) => {
    const board = get().board;
    const destroyedTiles: { row: number; col: number; color: Color }[] = [];

    // Create new board with destroyed tiles
    const newBoard = board.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const isDestroyed = tiles.some(t => t.row === rowIndex && t.col === colIndex);
        if (isDestroyed) {
          destroyedTiles.push({ row: rowIndex, col: colIndex, color: tile.color });
          return { ...tile, isMatched: true, isAnimating: true };
        }
        return tile;
      })
    );

    get().setBoard(newBoard);
    return { destroyedTiles };
  },

  convertTiles: async (tiles: { row: number; col: number; color: Color }[]) => {
    const board = get().board;

    // Create new board with converted tiles
    const newBoard = board.map((row, rowIndex) => 
      row.map((tile, colIndex) => {
        const convertedTile = tiles.find(t => t.row === rowIndex && t.col === colIndex);
        if (convertedTile) {
          return { 
            ...tile, 
            color: convertedTile.color,
            isAnimating: true 
          };
        }
        return tile;
      })
    );

    get().setBoard(newBoard);
  }
}); 