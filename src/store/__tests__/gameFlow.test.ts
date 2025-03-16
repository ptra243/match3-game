import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GameState, PlayerState, Player, Color, Tile } from '../types';
import { createMatchSlice } from '../slices/matchSlice';
import { createPlayerSlice } from '../slices/playerSlice';
import { createBoardSlice } from '../slices/boardSlice';
import { StoreApi } from 'zustand';
import { CLASSES } from '../classes';

const createInitialPlayerState = (isHuman: boolean = false): PlayerState => {
  const className = isHuman ? 'pyromancer' : 'shadowPriest';
  const defaultSkills = CLASSES[className].defaultSkills;
  
  return {
    health: 100,
    matchedColors: {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0,
    },
    className,
    activeSkillId: null,
    equippedSkills: defaultSkills,
    statusEffects: [],
    skillCastCount: {}
  };
};

// Create a real game state with minimal required mocks
const createTestGameState = (): GameState => {
  let store: Partial<GameState> = {
    isGameOver: false,
    animationInProgress: false,
    currentMatchSequence: 0,
    currentCombo: 0,
    signalAnimationComplete: vi.fn(),
    // Make animations instant in tests
    waitForAnimation: vi.fn().mockResolvedValue(undefined),
    currentPlayer: 'human',
    human: createInitialPlayerState(true),
    ai: createInitialPlayerState(false),
    selectedTile: null,
  };

  // Create proper get/set functions that work with our store
  const set = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => {
    const nextState = typeof partial === 'function' ? partial(store as GameState) : partial;
    store = { ...store, ...nextState };
  };

  const get = () => store as GameState;

  // Create a minimal store API implementation
  const storeApi: StoreApi<GameState> = {
    setState: set,
    getState: get,
    subscribe: vi.fn(),
    getInitialState: get,
  };

  // Initialize board with empty tiles
  store.board = Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => ({
      color: 'empty' as Color,
      isMatched: false,
      isNew: false,
      isAnimating: false
    }))
  );

  // Add the slices to our store
  Object.assign(store, {
    set,
    get,
    ...createBoardSlice(set, get, storeApi),
    ...createPlayerSlice(set, get, storeApi),
    ...createMatchSlice(set, get, storeApi),
  });

  return store as GameState;
};

describe('Game Flow Tests', () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = createTestGameState();
    vi.clearAllMocks();
  });

  describe('Turn Management', () => {
    it('should switch turns after a normal move', async () => {
      // Set up a valid match
      gameState.board[0][0].color = 'red';
      gameState.board[0][1].color = 'red';
      gameState.board[0][2].color = 'red';
      gameState.board[1][0].color = 'blue'; // Add a different color to swap with

      // Make a move that creates a match
      await gameState.swapTiles(1, 0, 0, 0);

      // Should switch to AI's turn
      expect(gameState.currentPlayer).toBe('ai');
    });

    it('should grant extra turn for matching 5 tiles', async () => {
      // Set up a 5-tile match
      gameState.board[0][0].color = 'red';
      gameState.board[0][1].color = 'red';
      gameState.board[0][2].color = 'red';
      gameState.board[0][3].color = 'red';
      gameState.board[0][4].color = 'red';
      gameState.board[1][0].color = 'blue'; // Add a different color to swap with

      // Make a move that creates the 5-tile match
      await gameState.swapTiles(1, 0, 0, 0);

      // Should stay on human's turn
      expect(gameState.currentPlayer).toBe('human');
      expect(gameState.human.statusEffects.some(effect => effect.extraTurn)).toBe(true);
    });

    it('should handle skill usage and turn switching', async () => {
      // Set up resources for a skill
      gameState.human = {
        ...createInitialPlayerState(true),
        matchedColors: {
          red: 4,
          yellow: 3,
          blue: 0,
          green: 0,
          black: 0,
          empty: 0,
        }
      };

      // Use Fireball skill
      gameState.toggleSkill('human', 'fireball');
      await gameState.useSkill(0, 0);

      // Should switch to AI's turn after skill use
      expect(gameState.currentPlayer).toBe('ai');
    });
  });

  describe('Match Processing', () => {
    it('should process cascading matches', async () => {
      // Set up a board state that will cause cascading matches
      const setupBoard = [
        ['red', 'red', 'red', 'blue'],
        ['blue', 'blue', 'green', 'blue'],
        ['yellow', 'yellow', 'yellow', 'red'],
      ];

      // Apply the setup to the first few rows
      setupBoard.forEach((row, i) => {
        row.forEach((color, j) => {
          gameState.board[i][j].color = color as Color;
        });
      });

      // Trigger the cascade
      await gameState.processNewBoard(gameState.board);

      // Verify that empty spaces were created
      expect(gameState.board[0].some(tile => tile.color === 'empty')).toBe(true);
      expect(gameState.board[2].some(tile => tile.color === 'empty')).toBe(true);
    });
  });
}); 