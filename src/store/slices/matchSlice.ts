import { StateCreator } from 'zustand';
import { GameState, Tile, Color } from '../types';
import { toast } from 'react-hot-toast';
import { CLASSES } from '../classes';

export interface MatchSlice {
  currentMatchSequence: number;
  currentCombo: number;
  checkMatches: () => Promise<boolean>;
  swapTiles: (row1: number, col1: number, row2: number, col2: number) => Promise<boolean>;
  wouldCreateMatch: (row1: number, col1: number, row2: number, col2: number) => boolean;
  waitForAnimation: () => Promise<void>;
  processNewBoard: (newBoard: Tile[][]) => Promise<void>;
}

const BOARD_SIZE = 8;

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  currentMatchSequence: 0,
  currentCombo: 0,

  // Helper function to wait for animations
  waitForAnimation: () => {
    return new Promise<void>(resolve => {
      set({ animationInProgress: true });
      get().signalAnimationComplete = () => {
        set({ animationInProgress: false });
        resolve();
      };
    });
  },

  // New method to handle any board changes and check for cascading matches
  processNewBoard: async (newBoard: Tile[][]) => {
    set({ board: newBoard });
    await get().waitForAnimation();
    
    // Check for matches and continue cascading until no more matches are found
    let hasMoreMatches = true;
    while (hasMoreMatches) {
      hasMoreMatches = await get().checkMatches();
      if (hasMoreMatches) {
        await get().waitForAnimation();
      }
    }
  },

  checkMatches: async () => {
    const { currentPlayer, waitForAnimation } = get();
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

    // Helper function to mark tiles as matched and update count
    const markMatch = (tiles: { row: number; col: number }[], color: Color) => {
      tiles.forEach(({row, col}) => {
        if (!newBoard[row][col].isFrozen) {
          newBoard[row][col] = {
            ...newBoard[row][col],
            isMatched: true,
            isAnimating: true
          };
        }
      });
      // Count all tiles in match, even frozen ones
      matchedColors[color] += tiles.length;
      hasMatches = true;
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          markMatch([
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
          color === board[row][col + 2].color &&
          !newBoard[row][col].isMatched && // Check all three tiles aren't already matched
          !newBoard[row][col + 1].isMatched &&
          !newBoard[row][col + 2].isMatched
        ) {
          markMatch([
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
          color === board[row + 2][col].color &&
          !newBoard[row][col].isMatched && // Check all three tiles aren't already matched
          !newBoard[row + 1][col].isMatched &&
          !newBoard[row + 2][col].isMatched
        ) {
          markMatch([
            {row, col}, {row: row + 1, col}, {row: row + 2, col}
          ], color);
        }
      }
    }

    if (hasMatches) {
      // Apply status effects to resource generation
      const playerState = get()[currentPlayer];
      const resourceMultiplier = playerState.statusEffects.reduce(
        (mult, effect) => mult * effect.resourceMultiplier,
        1
      );

      // Update matched colors with multiplier
      Object.entries(matchedColors).forEach(([color, count]) => {
        matchedColors[color as Color] = Math.floor(count * resourceMultiplier);
      });

      // Update opponent's health based on matches and damage multipliers
      const opponent = currentPlayer === 'human' ? 'ai' : 'human';
      const opponentState = get()[opponent];
      const playerClass = CLASSES[playerState.className];

      // Calculate class-based damage
      let classDamage = 0;
      Object.entries(matchedColors).forEach(([color, count]) => {
        if (color === playerClass.primaryColor) {
          // Primary color damage: 3 for 3-match, 5 for 4-match, 8 for 5-match
          if (count >= 5) classDamage += 8;
          else if (count >= 4) classDamage += 5;
          else if (count >= 3) classDamage += 3;
        } else if (color === playerClass.secondaryColor) {
          // Secondary color damage: 1 for 3-match, 2 for 4-match, 3 for 5-match
          if (count >= 5) classDamage += 3;
          else if (count >= 4) classDamage += 2;
          else if (count >= 3) classDamage += 1;
        }
      });

      const baseDamage = Object.values(matchedColors).reduce((sum, count) => sum + count, 0) + classDamage;
      const damageMultiplier = opponentState.statusEffects.reduce(
        (mult, effect) => mult * effect.damageMultiplier,
        1
      );
      
      set(state => ({
        [opponent]: {
          ...state[opponent],
          health: Math.max(0, state[opponent].health - Math.floor(baseDamage * damageMultiplier))
        }
      }));

      // Show damage toast if class damage was dealt
      if (classDamage > 0) {
        toast.success(`${playerClass.name} dealt ${classDamage} bonus damage!`);
      }

      // Update current player's matched colors and handle conversions
      set(state => {
        const currentPlayerState = state[currentPlayer];
        const newMatchedColors = { ...currentPlayerState.matchedColors };
        const newStatusEffects = [...currentPlayerState.statusEffects];

        // First, add all matched colors with resource multiplier
        Object.entries(matchedColors).forEach(([color, count]) => {
          newMatchedColors[color as Color] += Math.floor(count * resourceMultiplier);
          // Grant extra turn for matching 5 or more tiles
          if (count >= 5) {
            newStatusEffects.push({
              damageMultiplier: 1,
              resourceMultiplier: 1,
              turnsRemaining: 1,
              extraTurn: true
            });
            toast.success('Matched 5 tiles - Extra turn granted!');
          }
        });

        // Handle mana conversion effects
        currentPlayerState.statusEffects.forEach(effect => {
          if (effect.manaConversion) {
            const { from, to, ratio } = effect.manaConversion;
            const convertibleAmount = Math.floor(matchedColors[from] / ratio);
            if (convertibleAmount > 0) {
              newMatchedColors[to] += convertibleAmount;
              toast.success(`Converted ${convertibleAmount * ratio} ${from} mana into ${convertibleAmount} ${to} mana!`);
            }
          }
        });

        return {
          [currentPlayer]: {
            ...currentPlayerState,
            matchedColors: newMatchedColors,
            statusEffects: newStatusEffects
          },
          currentCombo: state.currentCombo + 1,
          board: newBoard
        };
      });

      // Show combo toast if it's more than 1
      const combo = get().currentCombo;
      if (combo > 1) {
        toast.success(`${combo}x Combo!`);
      }

      // Wait for match animation to complete
      await waitForAnimation();

      // Clear matched tiles
      set(state => ({
        board: state.board.map(row =>
          row.map(tile =>
            tile.isMatched ? { ...tile, color: 'empty', isMatched: false, isAnimating: false } : tile
          )
        )
      }));

      // Drop tiles
      get().dropTiles();
      await waitForAnimation();

      // Fill empty spaces
      get().fillEmptyTiles();
      await waitForAnimation();

      // Handle tile conversion effects
      const currentPlayerState = get()[currentPlayer];
      const newBoardAfterConversion = get().board.map(row => [...row]);
      let needsProcessing = false;

      currentPlayerState.statusEffects.forEach(effect => {
        if (effect.convertTiles) {
          const { color, count } = effect.convertTiles;
          let converted = 0;
          
          // Find random non-empty tiles to convert
          while (converted < count) {
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);
            if (newBoardAfterConversion[row][col].color !== 'empty' && 
                newBoardAfterConversion[row][col].color !== color) {
              newBoardAfterConversion[row][col] = {
                ...newBoardAfterConversion[row][col],
                color: color,
                isAnimating: true
              };
              converted++;
              needsProcessing = true;
            }
          }
          
          if (converted > 0) {
            toast.success(`Converted ${converted} tiles to ${color}!`);
          }
        }
      });

      if (needsProcessing) {
        await get().processNewBoard(newBoardAfterConversion);
      } else {
        // If this is the end of all cascading matches, switch turns
        const finalCombo = get().currentCombo;
        if (finalCombo > 1) {
          toast.success(`Match complete! ${finalCombo}x combo!`);
        }
        set({ currentCombo: 0 });
        get().switchPlayer();
      }
      
      return true;
    }

    set({ currentCombo: 0 });
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

    // Use processNewBoard to handle cascading matches
    await get().processNewBoard(newBoard);
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
}); 