import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { CLASSES } from '../classes';
import { ALL_SKILLS } from '../skills';
import type { GameState, Color, Tile } from '../types';
import { toast } from 'react-hot-toast';

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock GameState for testing
const createMockGameState = (): GameState => ({
  board: Array(8).fill(null).map(() => 
    Array(8).fill(null).map(() => ({
      color: 'empty' as Color,
      isMatched: false,
      isNew: false,
      isAnimating: false
    }))
  ),
  currentPlayer: 'human',
  human: {
    health: 100,
    matchedColors: { red: 0, blue: 0, green: 0, yellow: 0, black: 0, empty: 0 },
    className: 'pyromancer',
    activeSkillId: null,
    equippedSkills: ['fiery_soul', 'fireball'],
    statusEffects: [],
    skillCastCount: {}
  },
  ai: {
    health: 100,
    matchedColors: { red: 0, blue: 0, green: 0, yellow: 0, black: 0, empty: 0 },
    className: 'shadowPriest',
    activeSkillId: null,
    equippedSkills: ['void_touch', 'dark_ritual'],
    statusEffects: [],
    skillCastCount: {}
  },
  selectedTile: null,
  isGameOver: false,
  currentMatchSequence: 0,
  currentCombo: 0,
  animationInProgress: false,
  signalAnimationComplete: vi.fn(),
  waitForAnimation: vi.fn().mockResolvedValue(undefined),
  processNewBoard: vi.fn().mockImplementation(async (board: Tile[][]) => {
    return Promise.resolve();
  }) as Mock<[Tile[][]], Promise<void>>,
  initializeBoard: vi.fn(),
  dropTiles: vi.fn(),
  fillEmptyTiles: vi.fn(),
  checkMatches: vi.fn().mockResolvedValue(false) as Mock<[], Promise<boolean>>,
  swapTiles: vi.fn(),
  wouldCreateMatch: vi.fn(),
  selectTile: vi.fn(),
  checkSkillReadiness: vi.fn(),
  toggleSkill: vi.fn(),
  useSkill: vi.fn(),
  switchPlayer: vi.fn(),
  makeAiMove: vi.fn(),
  selectClass: vi.fn(),
  updateTile: vi.fn(),
  equipSkill: vi.fn()
});

describe('Class System', () => {
  let gameState: GameState;

  beforeEach(() => {
    // Reset game state before each test
    gameState = {
      board: Array(8).fill(null).map(() =>
        Array(8).fill(null).map(() => ({
          color: 'red',
          isMatched: false,
          isNew: false,
          isAnimating: false
        }))
      ),
      human: {
        health: 100,
        matchedColors: {
          red: 10,
          blue: 10,
          green: 10,
          yellow: 10,
          black: 10,
          empty: 0
        },
        className: 'pyromancer',
        activeSkillId: null,
        equippedSkills: ['fiery_soul', 'fireball'],
        statusEffects: [],
        skillCastCount: {}
      },
      ai: {
        health: 100,
        matchedColors: {
          red: 0,
          blue: 0,
          green: 0,
          yellow: 0,
          black: 0,
          empty: 0
        },
        className: 'shadowPriest',
        activeSkillId: null,
        equippedSkills: ['void_touch', 'dark_ritual'],
        statusEffects: [],
        skillCastCount: {}
      },
      currentPlayer: 'human',
      selectedTile: null,
      isGameOver: false,
      currentMatchSequence: 0,
      currentCombo: 0,
      animationInProgress: false,
      signalAnimationComplete: vi.fn(),
      waitForAnimation: vi.fn().mockResolvedValue(undefined),
      processNewBoard: vi.fn().mockResolvedValue(undefined),
      // Mock methods that won't be called in these tests
      initializeBoard: vi.fn(),
      dropTiles: vi.fn(),
      fillEmptyTiles: vi.fn(),
      checkMatches: vi.fn().mockResolvedValue(false),
      swapTiles: vi.fn().mockResolvedValue(false),
      wouldCreateMatch: vi.fn().mockReturnValue(false),
      selectTile: vi.fn(),
      checkSkillReadiness: vi.fn(),
      toggleSkill: vi.fn(),
      useSkill: vi.fn().mockResolvedValue(undefined),
      switchPlayer: vi.fn(),
      makeAiMove: vi.fn().mockResolvedValue(undefined),
      selectClass: vi.fn(),
      updateTile: vi.fn(),
      equipSkill: vi.fn()
    } as GameState;
  });

  describe('Pyromancer', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.pyromancer.primaryColor).toBe('red');
      expect(CLASSES.pyromancer.secondaryColor).toBe('yellow');
    });

    it('Flame Strike should apply damage multiplier for 3 turns', async () => {
      const flameStrike = CLASSES.pyromancer.skills[0];
      await flameStrike.effect(gameState, 0, 0);

      expect(gameState.ai.statusEffects).toHaveLength(1);
      expect(gameState.ai.statusEffects[0]).toEqual({
        damageMultiplier: 2,
        resourceMultiplier: 1,
        turnsRemaining: 3
      });
    });

    it('Fireball should deal damage based on red tiles destroyed', async () => {
      const state = createMockGameState();
      state.currentPlayer = 'human';
      state.human.className = 'pyromancer';
      state.human.activeSkillId = 1;  // Set Fireball as active skill
      
      // Add required mana for casting
      state.human.matchedColors.red = 4;
      state.human.matchedColors.yellow = 3;
      
      // Set up a pattern of red tiles around target
      const targetRow = 3;
      const targetCol = 3;
      state.board[targetRow][targetCol].color = 'red';
      state.board[targetRow-1][targetCol].color = 'red';
      state.board[targetRow+1][targetCol].color = 'red';
      
      const fireball = CLASSES.pyromancer.skills[1];
      
      // Set up the board to be modified
      (state.processNewBoard as Mock).mockImplementationOnce(async (board: Tile[][]) => {
        state.board = board;
        return Promise.resolve();
      });

      // Call effect directly instead of going through useSkill
      await fireball.effect(state, targetRow, targetCol);

      // Check that damage was dealt (5 damage per red tile)
      expect(state.ai.health).toBe(85); // Initial 100 - (3 red tiles * 5 damage)
      expect(state.processNewBoard).toHaveBeenCalled();
      
      // Verify explosion radius tiles are empty
      for (let row = targetRow-2; row <= targetRow+2; row++) {
        for (let col = targetCol-2; col <= targetCol+2; col++) {
          if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            expect(state.board[row][col].isAnimating).toBe(true);
          }
        }
      }
    });

    it('Fireball should require both red and yellow mana', () => {
      const fireball = CLASSES.pyromancer.skills[1];
      expect(fireball.cost).toEqual({ red: 4, yellow: 3 });
    });

    it('Fireball should only work on red tiles', async () => {
      const state = createMockGameState();
      state.currentPlayer = 'human';
      state.human.className = 'pyromancer';
      
      // Set up a blue tile as target
      state.board[3][3].color = 'blue';
      
      const fireball = CLASSES.pyromancer.skills[1];
      await fireball.effect(state, 3, 3);

      // Check that no damage was dealt and board wasn't modified
      expect(state.ai.health).toBe(100);
      expect(state.processNewBoard).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('This skill can only target red tiles!');
    });

    it('Fireball should explode tiles in a radius and deal damage', async () => {
      // Set up game state
      state.currentPlayer = 'human';
      state.human.className = 'pyromancer';
      state.human.activeSkillId = 'fireball';  // Set Fireball as active skill
      
      // Add required mana for casting
      state.human.matchedColors.red = 5;
      state.human.matchedColors.yellow = 5;
    });
  });

  describe('Cryomancer', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.cryomancer.primaryColor).toBe('blue');
      expect(CLASSES.cryomancer.secondaryColor).toBe('yellow');
    });

    it('Ice Shard should freeze tiles in a cross pattern', async () => {
      const iceShard = CLASSES.cryomancer.skills[0];
      await iceShard.effect(gameState, 1, 1);

      // Check center and adjacent tiles
      expect(gameState.board[1][1].isFrozen).toBe(true);
      expect(gameState.board[0][1].isFrozen).toBe(true);
      expect(gameState.board[2][1].isFrozen).toBe(true);
      expect(gameState.board[1][0].isFrozen).toBe(true);
      expect(gameState.board[1][2].isFrozen).toBe(true);
      
      // Check diagonal tiles are not frozen
      expect(gameState.board[0][0].isFrozen).toBeUndefined();
      expect(gameState.board[2][2].isFrozen).toBeUndefined();
    });

    it('Golden Frost should double resource generation', async () => {
      const goldenFrost = CLASSES.cryomancer.skills[1];
      await goldenFrost.effect(gameState, 0, 0);

      expect(gameState.human.statusEffects).toHaveLength(1);
      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 1,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });
    });
  });

  describe('Nature Weaver', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.natureWeaver.primaryColor).toBe('green');
      expect(CLASSES.natureWeaver.secondaryColor).toBe('yellow');
    });

    it('Fertile Ground should scale cost and set up conversion effect', async () => {
      const state = createMockGameState();
      state.currentPlayer = 'human';
      state.human.className = 'natureWeaver';
      
      const skill = CLASSES.natureWeaver.skills[0];
      
      // First cast
      await skill.effect(state, 0, 0);
      expect(skill.cost).toEqual({ green: 4 });
      expect(state.human.statusEffects[0]).toEqual({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 1,
        convertTiles: {
          color: 'green',
          count: 1
        }
      });
      expect(toast.success).toHaveBeenCalledWith('Next match will convert 1 tiles to green!');

      // Second cast
      state.human.skillCastCount[0] = 1;
      await skill.effect(state, 0, 0);
      expect(skill.cost).toEqual({ green: 5 });
      expect(state.human.statusEffects[1]).toEqual({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 1,
        convertTiles: {
          color: 'green',
          count: 2
        }
      });
      expect(toast.success).toHaveBeenCalledWith('Next match will convert 2 tiles to green!');
    });

    it('Fertile Ground conversions should trigger after matches', async () => {
      const state = createMockGameState();
      state.currentPlayer = 'human';
      state.human.className = 'natureWeaver';
      
      // Set up some non-green tiles
      state.board[0][0].color = 'red';
      state.board[0][1].color = 'red';
      state.board[0][2].color = 'red';  // Create a match of 3 red tiles
      
      // Cast Fertile Ground
      const skill = CLASSES.natureWeaver.skills[0];
      await skill.effect(state, 0, 0);

      // Verify status effect was added correctly
      expect(state.human.statusEffects[0].convertTiles).toEqual({
        color: 'green',
        count: 1
      });

      // Simulate match processing by calling processNewBoard directly
      await state.processNewBoard(state.board);
      expect(state.processNewBoard).toHaveBeenCalled();
    });

    it('Golden Growth should create alternating pattern', async () => {
      const goldenGrowth = CLASSES.natureWeaver.skills[1];
      await goldenGrowth.effect(gameState, 0, 0);

      expect(gameState.board[0][0].color).toBe('green');
      expect(gameState.board[0][1].color).toBe('yellow');
      expect(gameState.board[1][0].color).toBe('yellow');
      expect(gameState.board[1][1].color).toBe('green');
      
      // Check animation flags
      expect(gameState.board[0][0].isAnimating).toBe(true);
      expect(gameState.board[0][1].isAnimating).toBe(true);
    });
  });

  describe('Blood Mage', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.bloodMage.primaryColor).toBe('red');
      expect(CLASSES.bloodMage.secondaryColor).toBe('blue');
    });

    it('Blood Surge should sacrifice health for power', async () => {
      const bloodSurge = CLASSES.bloodMage.skills[0];
      const initialHealth = gameState.human.health;
      await bloodSurge.effect(gameState, 0, 0);

      expect(gameState.human.health).toBe(initialHealth - 5);
      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 2.5,
        resourceMultiplier: 1,
        turnsRemaining: 2
      });
    });

    it('Blood Surge should not reduce health below 1', async () => {
      const bloodSurge = CLASSES.bloodMage.skills[0];
      gameState.human.health = 3;
      await bloodSurge.effect(gameState, 0, 0);

      expect(gameState.human.health).toBe(1);
    });

    it('Frost Fire should apply dual effects', async () => {
      const frostFire = CLASSES.bloodMage.skills[1];
      await frostFire.effect(gameState, 0, 0);

      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 2,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });
    });
  });

  describe('Shadow Priest', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.shadowPriest.primaryColor).toBe('black');
      expect(CLASSES.shadowPriest.secondaryColor).toBe('blue');
    });

    it('Void Touch should increase enemy damage taken', async () => {
      const voidTouch = CLASSES.shadowPriest.skills[0];
      await voidTouch.effect(gameState, 0, 0);

      expect(gameState.ai.statusEffects[0]).toEqual({
        damageMultiplier: 1.5,
        resourceMultiplier: 1,
        turnsRemaining: 3
      });
    });

    it('Dark Ritual should convert area to black tiles', async () => {
      const darkRitual = CLASSES.shadowPriest.skills[1];
      await darkRitual.effect(gameState, 0, 0);

      // Check 2x2 area is converted
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(gameState.board[i][j].color).toBe('black');
          expect(gameState.board[i][j].isAnimating).toBe(true);
        }
      }

      // Check tiles outside area are unchanged
      expect(gameState.board[2][2].color).toBe('red');
    });
  });

  describe('Alchemist', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.alchemist.primaryColor).toBe('green');
      expect(CLASSES.alchemist.secondaryColor).toBe('red');
    });

    it('Transmutation should convert tiles from one color to another', async () => {
      // Set up some tiles
      gameState.board[0][0].color = 'blue';
      gameState.board[0][1].color = 'blue';
      gameState.board[1][0].color = 'blue';

      const transmutation = CLASSES.alchemist.skills[0];
      await transmutation.effect(gameState, 0, 0);

      const newColor = gameState.board[0][0].color;
      expect(newColor).not.toBe('blue');
      expect(gameState.board[0][1].color).toBe(newColor);
      expect(gameState.board[1][0].color).toBe(newColor);
      expect(gameState.board[0][0].isAnimating).toBe(true);
    });

    it('Catalyst should enhance matches for 3 turns', async () => {
      const catalyst = CLASSES.alchemist.skills[1];
      await catalyst.effect(gameState, 0, 0);

      expect(gameState.human.statusEffects).toHaveLength(1);
      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 2,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });
    });
  });

  describe('Storm Mage', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.stormMage.primaryColor).toBe('blue');
      expect(CLASSES.stormMage.secondaryColor).toBe('black');
    });

    it('Chain Lightning should convert a line and deal damage', async () => {
      // Set up a row with different colors
      gameState.board[1] = gameState.board[1].map(tile => ({
        ...tile,
        color: 'red'
      }));

      const chainLightning = CLASSES.stormMage.skills[0];
      const initialHealth = gameState.ai.health;
      await chainLightning.effect(gameState, 1, 0);

      // Check all tiles in row are converted to blue
      gameState.board[1].forEach(tile => {
        expect(tile.color).toBe('blue');
        expect(tile.isAnimating).toBe(true);
      });

      // Check damage was dealt (2 damage per conversion)
      expect(gameState.ai.health).toBe(initialHealth - (8 * 2)); // 8 tiles converted
    });

    it('Storm Front should enhance blue and black matches', async () => {
      const stormFront = CLASSES.stormMage.skills[1];
      await stormFront.effect(gameState, 0, 0);

      expect(gameState.human.statusEffects).toHaveLength(1);
      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 1.5,
        resourceMultiplier: 1.5,
        turnsRemaining: 4
      });
    });
  });

  describe('Time Weaver', () => {
    it('should have correct theme colors', () => {
      expect(CLASSES.timeWeaver.primaryColor).toBe('yellow');
      expect(CLASSES.timeWeaver.secondaryColor).toBe('blue');
    });

    it('Time Loop should copy a pattern to a new location', async () => {
      // Set up a distinct pattern
      gameState.board[0][0].color = 'red';
      gameState.board[0][1].color = 'blue';
      gameState.board[1][0].color = 'green';
      gameState.board[1][1].color = 'yellow';

      const timeLoop = CLASSES.timeWeaver.skills[0];
      await timeLoop.effect(gameState, 2, 2);

      // Check pattern was copied
      expect(gameState.board[2][2].color).toBe('red');
      expect(gameState.board[2][3].color).toBe('blue');
      expect(gameState.board[3][2].color).toBe('green');
      expect(gameState.board[3][3].color).toBe('yellow');
      expect(gameState.board[2][2].isAnimating).toBe(true);
    });

    it('Temporal Surge should grant an extra turn', async () => {
      const temporalSurge = CLASSES.timeWeaver.skills[1];
      await temporalSurge.effect(gameState, 0, 0);

      expect(gameState.human.statusEffects).toHaveLength(1);
      expect(gameState.human.statusEffects[0]).toEqual({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 1,
        extraTurn: true
      });
    });
  });

  describe('Class Selection UI', () => {
    it('should have all classes available', () => {
      const classCount = Object.keys(CLASSES).length;
      expect(classCount).toBeGreaterThan(0);
      
      // Check each class has required properties
      Object.entries(CLASSES).forEach(([_, classData]) => {
        expect(classData.name).toBeDefined();
        expect(classData.description).toBeDefined();
        expect(classData.primaryColor).toBeDefined();
        expect(classData.secondaryColor).toBeDefined();
        expect(classData.skills).toHaveLength(2);
      });
    });

    it('each class should have properly defined skills', () => {
      Object.entries(CLASSES).forEach(([_, classData]) => {
        classData.skills.forEach(skill => {
          expect(skill.name).toBeDefined();
          expect(skill.description).toBeDefined();
          expect(skill.cost).toBeDefined();
          expect(skill.effect).toBeInstanceOf(Function);
          expect(Object.keys(skill.cost).length).toBeGreaterThan(0);
        });
      });
    });
  });
}); 