import { StateCreator } from 'zustand';
import { GameState, Color, Match as TileMatch, Tile } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';
import { GAME_CONSTANTS, MATCH_RULES, EXTRA_TURN_CONDITIONS } from '../gameRules';

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
  findMatches: (board: Tile[][]) => Match[];
  hasValidMoves: () => boolean;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
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

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  currentMatchSequence: 0,
  currentCombo: 0,
  
  findMatches: (board: Tile[][]): Match[] => {
    const BOARD_SIZE = board.length;
    const unionFind = new UnionFind();
    const horizontalVisited = new Set<string>();
    const verticalVisited = new Set<string>();
    
    // Helper to check/mark visited tiles
    const getTileKey = (row: number, col: number) => `${row},${col}`;
    const isHorizontallyVisited = (row: number, col: number) => horizontalVisited.has(getTileKey(row, col));
    const markHorizontallyVisited = (row: number, col: number) => horizontalVisited.add(getTileKey(row, col));
    const isVerticallyVisited = (row: number, col: number) => verticalVisited.has(getTileKey(row, col));
    const markVerticallyVisited = (row: number, col: number) => verticalVisited.add(getTileKey(row, col));
    
    // Process the board in a single pass
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col].color === 'empty') continue;
        
        const color = board[row][col].color;
        
        // Check for horizontal match starting from this tile
        if (col < BOARD_SIZE - 2 && !isHorizontallyVisited(row, col)) { // Need at least 3 tiles horizontally
          let hLength = 1;
          while (col + hLength < BOARD_SIZE && board[row][col + hLength].color === color) {
            hLength++;
          }
          
          // If we found a valid horizontal match (3+ tiles)
          if (hLength >= 3) {
            const currentTile = { row, col };
            
            // Create a set for this horizontal match
            unionFind.makeSet(currentTile, color);
            markHorizontallyVisited(row, col);
            
            // Add all tiles in this horizontal match to the set
            for (let i = 1; i < hLength; i++) {
              const nextTile = { row, col: col + i };
              unionFind.makeSet(nextTile, color);
              unionFind.union(currentTile, nextTile);
              markHorizontallyVisited(row, col + i);
            }
          }
        }
        
        // Check for vertical match starting from this tile
        if (row < BOARD_SIZE - 2 && !isVerticallyVisited(row, col)) { // Need at least 3 tiles vertically
          let vLength = 1;
          while (row + vLength < BOARD_SIZE && board[row + vLength][col].color === color) {
            vLength++;
          }
          
          // If we found a valid vertical match (3+ tiles)
          if (vLength >= 3) {
            const currentTile = { row, col };
            
            // Create a set for this vertical match
            unionFind.makeSet(currentTile, color);
            markVerticallyVisited(row, col);
            
            // Add all tiles in this vertical match to the set
            for (let i = 1; i < vLength; i++) {
              const nextTile = { row: row + i, col };
              unionFind.makeSet(nextTile, color);
              unionFind.union(currentTile, nextTile);
              markVerticallyVisited(row + i, col);
            }
          }
        }
      }
    }
    
    // Get all the matches
    const matches = unionFind.getSets();
    
    // Identify special shapes within the matches
    return matches.map(match => {
      if (match.tiles.length !== 5) return match; // Special shapes have exactly 5 tiles
      
      // Check for T shape
      const rowCounts = new Map<number, number>();
      const colCounts = new Map<number, number>();
      
      match.tiles.forEach(tile => {
        rowCounts.set(tile.row, (rowCounts.get(tile.row) || 0) + 1);
        colCounts.set(tile.col, (colCounts.get(tile.col) || 0) + 1);
      });
      
      // T shape: one row has 3 tiles, another two rows have 1 tile each in the same column
      let isTShape = false;
      let isLShape = false;
      
      // Check for horizontal bar with vertical extension (T shape)
      const rowWith3 = Array.from(rowCounts.entries()).find(([_, count]) => count === 3);
      if (rowWith3) {
        const [rowIndex] = rowWith3;
        const colsInRow3 = match.tiles
          .filter(t => t.row === rowIndex)
          .map(t => t.col)
          .sort((a, b) => a - b);
        
        // Check if it's a contiguous row
        if (colsInRow3[2] - colsInRow3[0] === 2) {
          // Check for the vertical part (2 tiles)
          const middleCol = colsInRow3[1];
          const verticalTiles = match.tiles.filter(t => t.col === middleCol && t.row !== rowIndex);
          
          if (verticalTiles.length === 2 && 
              Math.abs(verticalTiles[0].row - verticalTiles[1].row) === 1) {
            isTShape = true;
          }
        }
      }
      
      // Check for vertical bar with horizontal extension (L shape)
      const colWith3 = Array.from(colCounts.entries()).find(([_, count]) => count === 3);
      if (colWith3 && !isTShape) {
        const [colIndex] = colWith3;
        const rowsInCol3 = match.tiles
          .filter(t => t.col === colIndex)
          .map(t => t.row)
          .sort((a, b) => a - b);
        
        // Check if it's a contiguous column
        if (rowsInCol3[2] - rowsInCol3[0] === 2) {
          // Bottom row of the vertical part
          const bottomRow = rowsInCol3[2];
          
          // Check for the horizontal part (2 tiles extending right from bottom)
          const horizontalTiles = match.tiles.filter(t => 
            t.row === bottomRow && t.col !== colIndex
          );
          
          if (horizontalTiles.length === 2 && 
              horizontalTiles.every(t => t.col > colIndex) &&
              horizontalTiles.sort((a, b) => a.col - b.col)[1].col - horizontalTiles[0].col === 1) {
            isLShape = true;
          }
        }
      }
      
      // Return the match with shape information
      if (isTShape) {
        return { ...match, isSpecialShape: 'T' as const };
      } else if (isLShape) {
        return { ...match, isSpecialShape: 'L' as const };
      }
      
      return match;
    });
  },

  processMatches: async () => {
    debugLog('MATCH_SLICE', 'Processing matches');
    const board = get().board;
    
    // Find all matches on the board
    const matches = get().findMatches(board);
    const hasMatches = matches.length > 0;
    
    if (hasMatches) {
      debugLog('MATCH_SLICE', 'Found matches', matches);
      
      // Increment combo counter for cascades
      get().incrementCombo();
      
      // Collect all matched tiles
      const matchedTilesSet = new Set<string>();
      const matched: { row: number; col: number; color: Color }[] = [];
      const matchedColors: Record<Color, number> = {
        red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
      };
      
      // Process all matches
      let hasSpecialMatch = false;
      matches.forEach(match => {
        match.tiles.forEach(tile => {
          const key = `${tile.row},${tile.col}`;
          if (!matchedTilesSet.has(key)) {
            matchedTilesSet.add(key);
            matched.push({ ...tile, color: match.color });
            matchedColors[match.color] = (matchedColors[match.color] || 0) + 1;
          }
        });
        
        if (match.isSpecialShape) {
          hasSpecialMatch = true;
          // Grant an extra turn if this is a special match and the condition is met
          if (EXTRA_TURN_CONDITIONS.SPECIAL_SHAPES.includes(match.isSpecialShape as 'T' | 'L')) {
            get().setExtraTurn(true);
            toast.success('Special match! Extra turn granted!');
          }
        }
        
        // Check for extra turn based on match length
        if (match.length && EXTRA_TURN_CONDITIONS.MATCH_LENGTHS.some(len => len === match.length)) {
          get().setExtraTurn(true);
          toast.success(`${match.length}-tile match! Extra turn granted!`);
        }
      });
      
      // Increment the match sequence counter
      get().incrementMatchSequence();
      
      // Mark all matched tiles on the board
      await get().markTilesAsMatched(matched);
      
      // Calculate and apply damage
      const currentPlayer = get().currentPlayer;
      let totalDamage = 0;
      
      // Calculate damage based on matched colors
      const characterClass = CLASSES[get()[currentPlayer].className];
      const calculateMatchDamage = (match: Match, isPrimary: boolean, isSecondary: boolean) => {
        // Base damage calculation
        let baseDamage = match.tiles.length;
        
        // Bonus for primary/secondary colors
        if (isPrimary) baseDamage *= MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.PRIMARY;
        else if (isSecondary) baseDamage *= MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.SECONDARY;
        
        // Bonus for special shapes
        if (match.isSpecialShape) baseDamage *= 1.5; // Special shape multiplier
        
        // Combo multiplier
        const comboCount = get().currentCombo;
        if (comboCount > 1) {
          baseDamage *= (1 + (comboCount - 1) * 0.5); // Combo multiplier increment
        }
        
        return Math.round(baseDamage);
      };
      
      // Calculate damage for each match
      matches.forEach(match => {
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

      // Emit match event
      if (get().emit) {
        get().emit('OnMatch', {
          tiles: matched,
          colors: matchedColors,
          player: currentPlayer,
          isSpecialShape: hasSpecialMatch
        });
      }
    }

    return hasMatches;
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

  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
    debugLog('BOARD_SLICE', 'Checking potential match', { row1, col1, row2, col2 });
    const board = get().board;
    const tempBoard = board.map(row => [...row]);
    const temp = { ...tempBoard[row1][col1] };
    tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
    tempBoard[row2][col2] = { ...temp };
    const hasMatch = get().findMatches(tempBoard).length > 0;
    debugLog('BOARD_SLICE', 'Match check result', { hasMatch });
    return hasMatch;
  },

}); 