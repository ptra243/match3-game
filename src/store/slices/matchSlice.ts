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
  convertTiles: (tiles: { row: number; col: number; color: Color }[]) => Promise<void>;
}

class UnionFind {
  private parent: Map<string, string>;
  private sets: Map<string, { color: Color; tiles: { row: number; col: number }[] }>;

  constructor() {
    this.parent = new Map();
    this.sets = new Map();
  }

  makeSet(tile: { row: number; col: number }, color: Color) {
    const key = `${tile.row},${tile.col}`;
    if (!this.parent.has(key)) {
      this.parent.set(key, key);
      this.sets.set(key, { color, tiles: [tile] });
    }
  }

  find(tile: { row: number; col: number }): string {
    const key = `${tile.row},${tile.col}`;
    if (!this.parent.has(key)) return key;
    
    let root = this.parent.get(key)!;
    if (root !== key) {
      root = this.find({ row: parseInt(root.split(',')[0]), col: parseInt(root.split(',')[1]) });
      this.parent.set(key, root); // Path compression
    }
    return root;
  }

  union(tile1: { row: number; col: number }, tile2: { row: number; col: number }) {
    const root1 = this.find(tile1);
    const root2 = this.find(tile2);

    if (root1 !== root2) {
      this.parent.set(root2, root1);
      const set1 = this.sets.get(root1)!;
      const set2 = this.sets.get(root2)!;
      
      // Merge sets
      const allTiles = [...set1.tiles, ...set2.tiles];
      const distinctTiles = allTiles.filter((tile, index, self) => 
        index === self.findIndex(t => t.row === tile.row && t.col === tile.col)
      );
      
      this.sets.set(root1, {
        color: set1.color,
        tiles: distinctTiles
      });
      this.sets.delete(root2);
    }
  }

  getSets(): Match[] {
    const uniqueSets = new Set<string>();
    const matches: Match[] = [];

    for (const [key, value] of this.sets.entries()) {
      const root = this.find({ row: parseInt(key.split(',')[0]), col: parseInt(key.split(',')[1]) });
      if (!uniqueSets.has(root)) {
        uniqueSets.add(root);
        const set = this.sets.get(root)!;
        if (set.tiles.length >= 3) {
          matches.push({
            color: set.color,
            tiles: set.tiles,
            length: set.tiles.length
          });
        }
      }
    }

    return matches;
  }
}

/**
 * Finds all matches on the board using a color island approach.
 * @param board The current game board
 * @returns Array of matches found
 */
const findMatches = (board: Tile[][]): TileMatch[] => {
  const BOARD_SIZE = board.length;
  const visited = new Set<string>();
  const unionFind = new UnionFind();

  // Helper to check/mark visited tiles
  const getTileKey = (row: number, col: number) => `${row},${col}`;
  const isVisited = (row: number, col: number) => visited.has(getTileKey(row, col));
  const markVisited = (row: number, col: number) => visited.add(getTileKey(row, col));
  const isValidTile = (row: number, col: number) => 
    row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

  // Helper to check if a tile matches color and isn't visited
  const isMatchingTile = (row: number, col: number, color: Color) => 
    isValidTile(row, col) && 
    board[row][col].color === color && 
    !isVisited(row, col) &&
    board[row][col].color !== 'empty';

  // Process each tile on the board
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isVisited(row, col) || board[row][col].color === 'empty') continue;

      const color = board[row][col].color;
      const currentTile = { row, col };
      
      // Initialize the set for current tile
      unionFind.makeSet(currentTile, color);
      markVisited(row, col);

      // Check horizontal and vertical lines separately
      const directions = [
        [[0, 1], [0, -1]], // horizontal: right and left
        [[1, 0], [-1, 0]]  // vertical: down and up
      ];

      for (const [dir1, dir2] of directions) {
        const lineTiles = [currentTile];
        
        // Check first direction
        let nextRow = row + dir1[0];
        let nextCol = col + dir1[1];
        while (isMatchingTile(nextRow, nextCol, color)) {
          const nextTile = { row: nextRow, col: nextCol };
          lineTiles.push(nextTile);
          markVisited(nextRow, nextCol);
          nextRow += dir1[0];
          nextCol += dir1[1];
        }
        
        // Check opposite direction
        nextRow = row + dir2[0];
        nextCol = col + dir2[1];
        while (isMatchingTile(nextRow, nextCol, color)) {
          const nextTile = { row: nextRow, col: nextCol };
          lineTiles.unshift(nextTile); // Add to start to maintain order
          markVisited(nextRow, nextCol);
          nextRow += dir2[0];
          nextCol += dir2[1];
        }

        // If we found a valid line (≥ 3 tiles), create the island
        if (lineTiles.length >= 3) {
          lineTiles.forEach(tile => {
            unionFind.makeSet(tile, color);
            unionFind.union(currentTile, tile);
          });
        } else {
          // If not a valid line, unmark the visited tiles so they can be part of other potential matches
          lineTiles.forEach(tile => {
            if (tile !== currentTile) { // Keep current tile marked as visited
              visited.delete(getTileKey(tile.row, tile.col));
            }
          });
        }
      }
    }
  }

  // Get all valid matches (sets with 3 or more tiles)
  return unionFind.getSets();
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