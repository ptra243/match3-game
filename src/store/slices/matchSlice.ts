import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';

export interface MatchSlice {
  board: Tile[][];
  currentMatchSequence: number;
  currentCombo: number;
  animationInProgress: boolean;
  signalAnimationComplete: () => void;
  waitForAnimation: () => Promise<void>;
  dropTiles: () => void;
  fillEmptyTiles: () => void;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
  updateTile: (row: number, col: number, tile: Partial<Tile>) => void;
}

const BOARD_SIZE = 8;

// Define the Match type locally if it's not exported from types.ts
interface Match {
  color: Color;
  tiles: { row: number; col: number }[];
}

const findMatches = (board: Tile[][]): Match[] => {
  const matches: Match[] = [];
  const BOARD_SIZE = board.length;

  // Helper function to add a match
  const addMatch = (tiles: { row: number; col: number }[], color: Color) => {
    matches.push({ color, tiles });
  };

  // Check T and L shapes
  for (let row = 0; row < BOARD_SIZE - 2; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (color === 'empty') continue;

      // Check T shape (facing down)
      if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
          color === board[row][col + 1].color &&
          color === board[row][col + 2].color &&
          color === board[row + 1][col + 1].color &&
          color === board[row + 2][col + 1].color) {
        addMatch([
          {row, col}, {row, col: col + 1}, {row, col: col + 2},
          {row: row + 1, col: col + 1}, {row: row + 2, col: col + 1}
        ], color);
        continue;
      }

      // Check T shape (facing up)
      if (row >= 2 && col < BOARD_SIZE - 2 &&
          color === board[row][col + 1].color &&
          color === board[row][col + 2].color &&
          color === board[row - 1][col + 1].color &&
          color === board[row - 2][col + 1].color) {
        addMatch([
          {row, col}, {row, col: col + 1}, {row, col: col + 2},
          {row: row - 1, col: col + 1}, {row: row - 2, col: col + 1}
        ], color);
        continue;
      }

      // Check T shape (facing right)
      if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 1 &&
          color === board[row + 1][col].color &&
          color === board[row + 2][col].color &&
          color === board[row + 1][col + 1].color) {
        addMatch([
          {row, col}, {row: row + 1, col}, {row: row + 2, col},
          {row: row + 1, col: col + 1}
        ], color);
        continue;
      }

      // Check T shape (facing left)
      if (row < BOARD_SIZE - 2 && col > 0 &&
          color === board[row + 1][col].color &&
          color === board[row + 2][col].color &&
          color === board[row + 1][col - 1].color) {
        addMatch([
          {row, col}, {row: row + 1, col}, {row: row + 2, col},
          {row: row + 1, col: col - 1}
        ], color);
        continue;
      }

      // Check L shape (bottom right)
      if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
          color === board[row + 1][col].color &&
          color === board[row + 2][col].color &&
          color === board[row + 2][col + 1].color &&
          color === board[row + 2][col + 2].color) {
        addMatch([
          {row, col}, {row: row + 1, col}, {row: row + 2, col},
          {row: row + 2, col: col + 1}, {row: row + 2, col: col + 2}
        ], color);
        continue;
      }

      // Check L shape (bottom left)
      if (row < BOARD_SIZE - 2 && col >= 2 &&
          color === board[row + 1][col].color &&
          color === board[row + 2][col].color &&
          color === board[row + 2][col - 1].color &&
          color === board[row + 2][col - 2].color) {
        addMatch([
          {row, col}, {row: row + 1, col}, {row: row + 2, col},
          {row: row + 2, col: col - 1}, {row: row + 2, col: col - 2}
        ], color);
        continue;
      }

      // Check L shape (top right)
      if (row >= 2 && col < BOARD_SIZE - 2 &&
          color === board[row - 1][col].color &&
          color === board[row - 2][col].color &&
          color === board[row][col + 1].color &&
          color === board[row][col + 2].color) {
        addMatch([
          {row, col}, {row: row - 1, col}, {row: row - 2, col},
          {row, col: col + 1}, {row, col: col + 2}
        ], color);
        continue;
      }

      // Check L shape (top left)
      if (row >= 2 && col >= 2 &&
          color === board[row - 1][col].color &&
          color === board[row - 2][col].color &&
          color === board[row][col - 1].color &&
          color === board[row][col - 2].color) {
        addMatch([
          {row, col}, {row: row - 1, col}, {row: row - 2, col},
          {row, col: col - 1}, {row, col: col - 2}
        ], color);
        continue;
      }
    }
  }

  // Check regular horizontal matches (3 in a row)
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE - 2; col++) {
      const color = board[row][col].color;
      if (
        color !== 'empty' &&
        color === board[row][col + 1].color &&
        color === board[row][col + 2].color
      ) {
        addMatch([
          {row, col}, {row, col: col + 1}, {row, col: col + 2}
        ], color);
      }
    }
  }

  // Check regular vertical matches (3 in a row)
  for (let col = 0; col < BOARD_SIZE; col++) {
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      const color = board[row][col].color;
      if (
        color !== 'empty' &&
        color === board[row + 1][col].color &&
        color === board[row + 2][col].color
      ) {
        addMatch([
          {row, col}, {row: row + 1, col}, {row: row + 2, col}
        ], color);
      }
    }
  }

  return matches;
};

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  board: [],
  currentMatchSequence: 0,
  currentCombo: 0,
  animationInProgress: false,
  signalAnimationComplete: () => {},
  waitForAnimation: () => {
    console.log('Waiting for animation. Current state:', {
      animationInProgress: get().animationInProgress,
      animatingTiles: get().board.reduce((count, row) => 
        count + row.reduce((rowCount, tile) => 
          rowCount + (tile.isAnimating ? 1 : 0), 0), 0)
    });
    
    // If there are no animating tiles, resolve immediately
    const animatingTiles = get().board.reduce((count, row) => 
      count + row.reduce((rowCount, tile) => 
        rowCount + (tile.isAnimating ? 1 : 0), 0), 0);
        
    if (animatingTiles === 0) {
      console.log('No animating tiles, resolving immediately');
      return Promise.resolve();
    }
    
    return new Promise<void>(resolve => {
      set({ animationInProgress: true });
      get().signalAnimationComplete = () => {
        console.log('Animation complete signal received');
        set({ animationInProgress: false });
        resolve();
      };
    });
  },
  dropTiles: async () => {
    console.log('dropTiles called');
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasDropped = false;

    // Process each column
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Find the lowest empty space
      let emptyRow = BOARD_SIZE - 1;
      let nextTileRow = BOARD_SIZE - 1;

      // Keep going until we've processed all rows
      while (emptyRow >= 0) {
        // Find the next empty space
        while (emptyRow >= 0 && (newBoard[emptyRow][col].color !== 'empty' || newBoard[emptyRow][col].isFrozen)) {
          emptyRow--;
        }

        // If we found an empty space
        if (emptyRow >= 0) {
          // Find the next non-empty tile above it
          nextTileRow = emptyRow - 1;
          while (nextTileRow >= 0 && (newBoard[nextTileRow][col].color === 'empty' || newBoard[nextTileRow][col].isFrozen)) {
            nextTileRow--;
          }

          // If we found a tile to drop
          if (nextTileRow >= 0) {
            console.log(`Moving tile from [${nextTileRow},${col}] to [${emptyRow},${col}]`);
            newBoard[emptyRow][col] = {
              ...newBoard[nextTileRow][col],
              isAnimating: true
            };
            newBoard[nextTileRow][col] = {
              color: 'empty' as Color,
              isMatched: false,
              isNew: false,
              isAnimating: true,  // Mark empty tile as animating
              isFrozen: false,
              isIgnited: false
            };
            hasDropped = true;
            // Don't decrement emptyRow since we might need to fill it again from above
          } else {
            // No more tiles to drop in this column
            emptyRow--;
          }
        }
      }
    }

    if (hasDropped) {
      console.log('Setting new board after dropping tiles:', newBoard);
      set({ board: newBoard });
      await get().waitForAnimation();
    } else {
      console.log('No tiles needed to drop');
    }
  },
  fillEmptyTiles: async () => {
    console.log('fillEmptyTiles called');
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'black'];
    let hasFilled = false;
    let animatingTileCount = 0;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (newBoard[row][col].color === 'empty') {
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          console.log(`Filling empty tile at [${row},${col}] with ${randomColor}`);
          newBoard[row][col] = {
            color: randomColor,
            isMatched: false,
            isNew: true,
            isAnimating: true,
            isFrozen: false,
            isIgnited: false
          };
          animatingTileCount++;
          hasFilled = true;
        }
      }
    }

    if (hasFilled) {
      console.log('Setting new board after filling empty tiles:', {
        filledTileCount: animatingTileCount,
        board: newBoard
      });
      set({ board: newBoard });
      await get().waitForAnimation();
    } else {
      console.log('No empty tiles to fill');
    }
  },
  processNewBoard: async (newBoard: Tile[][]) => {
    console.log('processNewBoard called');
    // Set the new board state and wait for any current animations
    set({ board: newBoard });
    await get().waitForAnimation();
    
    // Check for matches and continue cascading until no more matches are found
    let hasMoreMatches = true;
    let iteration = 0;
    while (hasMoreMatches) {
      console.log(`Processing iteration ${iteration++}`);
      hasMoreMatches = await get().checkMatches();
      
      // Break the loop if no more matches to prevent infinite recursion
      if (!hasMoreMatches) {
        console.log('No more matches found');
        break;
      }
    }

    // Reset animation state at the end
    console.log('Resetting animation state');
    set({ animationInProgress: false });
  },
  checkMatches: async () => {
    console.log('checkMatches called');
    const { currentPlayer, waitForAnimation, dropTiles, fillEmptyTiles } = get();
    const board = get().board;
    const newBoard = board.map(row => [...row]);
    let hasMatches = false;
    let matchedColors: Record<Color, number> = {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0,
    };

    // Find all matches
    const matches = findMatches(newBoard);
    console.log('Found matches:', matches);
    
    if (matches.length > 0) {
      hasMatches = true;
      
      // Create a Set to track tiles that have been matched to avoid duplicates
      const matchedTiles = new Set<string>();
      
      matches.forEach((match: Match) => {
        // Count matched colors (only once per unique tile)
        match.tiles.forEach(({ row, col }) => {
          const tileKey = `${row},${col}`;
          if (!matchedTiles.has(tileKey)) {
            matchedColors[match.color]++;
            matchedTiles.add(tileKey);
            
            console.log(`Marking tile at [${row},${col}] as matched`);
            newBoard[row][col] = {
              ...newBoard[row][col],
              isMatched: true,
              isAnimating: true
            };
          }
        });
      });

      // Check for matches greater than 3 tiles and add extra turn status effect
      const hasLongMatch = matches.some(match => match.tiles.length > 3);
      if (hasLongMatch) {
        const currentPlayerState = get()[currentPlayer];
        // Check if player already has an extra turn effect
        const hasExtraTurn = currentPlayerState.statusEffects.some(effect => effect.extraTurn);
        if (!hasExtraTurn) {
          set(state => ({
            [currentPlayer]: {
              ...state[currentPlayer],
              statusEffects: [
                ...currentPlayerState.statusEffects,
                {
                  damageMultiplier: 1,
                  resourceMultiplier: 1, 
                  turnsRemaining: 1,
                  extraTurn: true
                }
              ]
            }
          }));
          toast.success('Match of 4 or more - Extra turn granted!');
        }
      }
      // Add matches length to current combo
      set(state => ({
        currentCombo: state.currentCombo + matches.length
      }));

      // Update matched colors for the current player
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

      // Calculate damage based on matched tiles
      let totalDamage = 0;
      matches.forEach((match: Match) => {
        // Base damage is 1 per tile
        const baseDamage = match.tiles.length;
        
        // Bonus damage for longer matches
        const lengthBonus = match.tiles.length > 3 ? (match.tiles.length - 3) * 2 : 0;
        
        // Color bonus for primary/secondary colors
        const characterClass = CLASSES[get()[currentPlayer].className];
        let colorMultiplier = 1;
        if (match.color === characterClass.primaryColor) colorMultiplier = 2;
        else if (match.color === characterClass.secondaryColor) colorMultiplier = 1.5;
        
        totalDamage += (baseDamage + lengthBonus) * colorMultiplier;
      });

      // Get damage multipliers from status effects
      const currentPlayerEffects = get()[currentPlayer].statusEffects;
      const opponent = currentPlayer === 'human' ? 'ai' : 'human';
      const opponentEffects = get()[opponent].statusEffects;
      
      const playerDamageMultiplier = currentPlayerEffects.reduce(
        (multiplier, effect) => multiplier * effect.damageMultiplier, 
        1
      );
      
      const opponentDamageMultiplier = opponentEffects.reduce(
        (multiplier, effect) => multiplier * effect.damageMultiplier, 
        1
      );
      
      // Apply both multipliers
      totalDamage = Math.round(totalDamage * playerDamageMultiplier * opponentDamageMultiplier);
      
      if (totalDamage > 0) {
        console.log(`Dealing ${totalDamage} damage to ${opponent} (multipliers: player ${playerDamageMultiplier}, opponent ${opponentDamageMultiplier})`);
        
        // Update opponent's health
        set(state => ({
          [opponent]: {
            ...state[opponent],
            health: Math.max(0, state[opponent].health - totalDamage)
          }
        }));
        
        // Show damage toast
        toast.success(`Dealt ${totalDamage} damage to opponent!`);
      }

      // Set the board with matched tiles and wait for animation
      console.log('Setting board with matched tiles');
      set({ board: newBoard });
      
      // Wait for the explode animation to complete
      await waitForAnimation();

      // Clear matched tiles but keep them animating for the fall
      console.log('Clearing matched tiles');
      const clearedBoard = newBoard.map(row =>
        row.map(tile =>
          tile.isMatched ? {
            color: 'empty' as Color,
            isMatched: false,
            isNew: false,
            isAnimating: true,  // Keep animating for the fall
            isFrozen: false,
            isIgnited: false
          } : tile
        )
      );
      
      // Set the board with cleared tiles
      set({ board: clearedBoard });
      
      // Immediately drop tiles to fill the gaps
      await dropTiles();
      
      // Immediately fill empty tiles
      await fillEmptyTiles();
      
      // Process any new matches that might have formed
      return true;
    }

    return false;
  },
  swapTiles: async (row1: number, col1: number, row2: number, col2: number) => {
    if (!get().wouldCreateMatch(row1, col1, row2, col2)) {
      return false;
    }

    const board = get().board;
    const newBoard = board.map(row => [...row]);
    const temp = { ...newBoard[row1][col1] };
    newBoard[row1][col1] = { ...newBoard[row2][col2], isAnimating: true };
    newBoard[row2][col2] = { ...temp, isAnimating: true };

    // Process matches and wait for all cascading to complete
    await get().processNewBoard(newBoard);

    // Switch turns if no extra turn was granted
    const currentPlayer = get().currentPlayer;
    const hasExtraTurn = get()[currentPlayer].statusEffects.some(effect => effect.extraTurn);
    if (!hasExtraTurn) {
      get().switchPlayer();
    }

    return true;
  },
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number): boolean => {
    const board = get().board;
    const tempBoard = board.map(row => [...row]);
    const temp = { ...tempBoard[row1][col1] };
    tempBoard[row1][col1] = { ...tempBoard[row2][col2] };
    tempBoard[row2][col2] = { ...temp };

    // Check T and L shapes
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = tempBoard[row][col].color;
        if (color === 'empty') continue;

        // Check T shape (facing down)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color &&
            color === tempBoard[row + 1][col + 1].color &&
            color === tempBoard[row + 2][col + 1].color) {
          return true;
        }

        // Check T shape (facing up)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color &&
            color === tempBoard[row - 1][col + 1].color &&
            color === tempBoard[row - 2][col + 1].color) {
          return true;
        }

        // Check T shape (facing right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 1 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 1][col + 1].color) {
          return true;
        }

        // Check T shape (facing left)
        if (row < BOARD_SIZE - 2 && col > 0 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 1][col - 1].color) {
          return true;
        }

        // Check L shape (bottom right)
        if (row < BOARD_SIZE - 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 2][col + 1].color &&
            color === tempBoard[row + 2][col + 2].color) {
          return true;
        }

        // Check L shape (bottom left)
        if (row < BOARD_SIZE - 2 && col >= 2 &&
            color === tempBoard[row + 1][col].color &&
            color === tempBoard[row + 2][col].color &&
            color === tempBoard[row + 2][col - 1].color &&
            color === tempBoard[row + 2][col - 2].color) {
          return true;
        }

        // Check L shape (top right)
        if (row >= 2 && col < BOARD_SIZE - 2 &&
            color === tempBoard[row - 1][col].color &&
            color === tempBoard[row - 2][col].color &&
            color === tempBoard[row][col + 1].color &&
            color === tempBoard[row][col + 2].color) {
          return true;
        }

        // Check L shape (top left)
        if (row >= 2 && col >= 2 &&
            color === tempBoard[row - 1][col].color &&
            color === tempBoard[row - 2][col].color &&
            color === tempBoard[row][col - 1].color &&
            color === tempBoard[row][col - 2].color) {
          return true;
        }
      }
    }

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const color = tempBoard[row][col].color;
        if (
          color !== 'empty' &&
          color === tempBoard[row][col + 1].color &&
          color === tempBoard[row][col + 2].color
        ) {
          return true;
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        const color = tempBoard[row][col].color;
        if (
          color !== 'empty' &&
          color === tempBoard[row + 1][col].color &&
          color === tempBoard[row + 2][col].color
        ) {
          return true;
        }
      }
    }

    return false;
  },
  updateTile: (row: number, col: number, tile: Partial<Tile>) => {
    const board = get().board;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = {
      ...newBoard[row][col],
      ...tile
    };
    set({ board: newBoard });
  },
}); 