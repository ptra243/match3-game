/**
 * @file gameRules.ts
 * This file serves as the source of truth for game rules and flow.
 * Any changes to core game mechanics should be documented here.
 * 
 * @preserveGameRules These rules are fundamental to the game's balance and fairness.
 * Changes should be carefully considered and tested.
 */

import { Color } from './types';

/**
 * Core game constants that affect gameplay mechanics
 * @preserveGameRules
 */
export const GAME_CONSTANTS = {
  BOARD_SIZE: 8,
  MIN_MATCH_LENGTH: 3,
  COMBO_EXTRA_TURN_THRESHOLD: 10,
  MIN_AI_TARGET_DISTANCE_FROM_EDGE: 2,
  AVAILABLE_COLORS: ['red', 'blue', 'green', 'yellow', 'black'] as Color[],
} as const;

/**
 * Defines what constitutes a special match that grants an extra turn
 * @preserveGameRules
 */
export const EXTRA_TURN_CONDITIONS = {
  MATCH_LENGTHS: [4, 5],  // 4 or 5 in a row grants extra turn
  SPECIAL_SHAPES: ['T', 'L'],  // T or L shape matches grant extra turn
  COMBO_THRESHOLD: GAME_CONSTANTS.COMBO_EXTRA_TURN_THRESHOLD,  // 10+ combo grants extra turn
} as const;

/**
 * Core game flow rules
 * @preserveGameRules
 */
export const GAME_FLOW = {
  /**
   * Turn Order Rules:
   * 1. Player always goes first
   * 2. Each turn consists of either:
   *    - Making a match by swapping tiles
   *    - Using a skill
   * 3. Turn ends after action unless:
   *    - Skill specifically grants extra turn
   *    - Match meets extra turn conditions
   *    - Combo reaches threshold
   * 4. Extra turn effects are cleared when player regains control
   */
  TURN_ORDER: {
    FIRST_PLAYER: 'human',
    ACTIONS_PER_TURN: 1,
  },

  /**
   * Combo System Rules:
   * 1. Combo counter starts at 0 before each player action
   * 2. Increments each time board cascades and creates new matches
   * 3. Resets before each new player action (swap or skill)
   * 4. Grants extra turn at COMBO_THRESHOLD
   */
  COMBO_RULES: {
    STARTS_AT: 0,
    INCREMENTS_ON: 'cascade',
    RESETS_ON: ['swap', 'skill'],
  },

  /**
   * AI Behavior Rules:
   * 1. Moves after player's turn and all cascades complete
   * 2. Skill Usage:
   *    - Uses most expensive available skill first
   *    - Targets random valid tile (2+ tiles from edges)
   * 3. Match Priority:
   *    a. 4-5 tile matches
   *    b. Primary color matches
   *    c. Secondary color matches
   */
  AI_RULES: {
    SKILL_PRIORITY: 'most-expensive',
    TARGET_DISTANCE_FROM_EDGE: GAME_CONSTANTS.MIN_AI_TARGET_DISTANCE_FROM_EDGE,
    MATCH_PRIORITY: ['special-match', 'primary-color', 'secondary-color'],
  },

  /**
   * Board State Rules:
   * 1. Must always have at least one possible match
   * 2. If no matches possible, reinitialize board
   * 3. Initial board must have no pre-existing matches
   */
  BOARD_RULES: {
    REQUIRES_POSSIBLE_MATCH: true,
    INITIALIZE_CONDITIONS: {
      NO_INITIAL_MATCHES: true,
      REQUIRES_POSSIBLE_MOVE: true,
    },
  },
} as const;

/**
 * Scoring and match rules
 * @preserveGameRules
 */
export const MATCH_RULES = {
  /**
   * Base damage calculation:
   * 1. Base damage = colorStat * Math.ceil(matchLength / 3)
   *    (Color stat is applied once per 3 tiles, rounded up)
   * 2. Length multipliers:
   *    - 3 tiles: no multiplier
   *    - 4 tiles: 1.5x multiplier
   *    - 5+ tiles: 2x multiplier
   * 3. Special shape multiplier: 1.5x for T or L shapes
   * 4. Color stats from player's class and blessings:
   *    - Primary color: 3 base points
   *    - Secondary color: 1 base point
   */
  DAMAGE_CALCULATION: {
    BASE_DAMAGE: 'color-stat-per-three-tiles',
    LENGTH_MULTIPLIERS: {
      THREE: 1,
      FOUR: 1.5,
      FIVE_PLUS: 2
    },
    SPECIAL_SHAPE_MULTIPLIER: 1.5,
    COLOR_MULTIPLIERS: {
      PRIMARY: 1,
      SECONDARY: 1,
      NEUTRAL: 1,
    },
  },
} as const;