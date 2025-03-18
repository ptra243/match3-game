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