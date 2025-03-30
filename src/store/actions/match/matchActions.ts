import { GameState, Color, Tile, Match } from '../../types';
import { debugLog } from '../../slices/debug';
import { EXTRA_TURN_CONDITIONS } from '../../gameRules';
import { CLASSES } from '../../classes';
import { ALL_ITEMS } from '../../items';
import { TileHelpers } from '../board/TileHelpers';
import { GameActions } from '../game/gameActions';
import { findMatches } from './matchFinding';
import { 
  calculateMatchResources, 
  applyMatchEffects, 
  applyDamage, 
  distributeResources,
  calculateMatchDamage,
  checkItemReward 
} from './matchEffects';
import { isSpecialMatch, handleSpecialMatch } from './specialMatches';

// Private helper functions
const processIgnitedTiles = async (
  board: Tile[][],
  matchedTilesSet: Set<string>,
  matched: { row: number; col: number; color: Color }[]
) => {
  const ignitedTiles: { row: number, col: number }[] = [];
  const processedTiles = new Set<string>();
  const allExplodedTiles: { row: number; col: number }[] = [];

  const processIgnitedTile = (tile: { row: number, col: number }) => {
    const explodedTiles = TileHelpers.selectPattern(board, tile.row, tile.col, 'square', 3);

    explodedTiles.forEach(({row, col}) => {
      const key = `${row},${col}`;
      if (!matchedTilesSet.has(key)) {
        matchedTilesSet.add(key);
        matched.push({...board[row][col], row, col, color: board[row][col].color});
      }
      if (!processedTiles.has(key)) {
        processedTiles.add(key);
        allExplodedTiles.push({row, col});

        if (board[row][col].isIgnited && !ignitedTiles.some(t => t.row === row && t.col === col)) {
          ignitedTiles.push(tile);
        }
      }
    });
  };

  while (ignitedTiles.length > 0) {
    const currentTile = ignitedTiles.shift();
    if (currentTile) {
      processIgnitedTile(currentTile);
    }
  }
};

const processRegularMatches = async (
  matches: Match[],
  matchedTilesSet: Set<string>,
  matched: { row: number; col: number; color: Color }[],
  matchedColors: Record<Color, number>
) => {
  matches.forEach(match => {
    match.tiles.forEach(tile => {
      const key = `${tile.row},${tile.col}`;
      if (!matchedTilesSet.has(key)) {
        matchedTilesSet.add(key);
        matched.push({...tile, color: match.color});
        matchedColors[match.color] = (matchedColors[match.color] || 0) + 1;
      }
    });
  });
};

// Public API
export const MatchActions = {
  processMatch: async (state: GameState, match: Match) => {
    debugLog('MATCH_ACTION', 'Processing match', match);
    await MatchActions.applyMatchDamage(state, match);
    await MatchActions.distributeMatchResources(state, match);
    
    if (isSpecialMatch(match)) {
      await handleSpecialMatch(state, match);
    }
  },

  applyMatchDamage: async (state: GameState, match: Match) => {
    const damage = calculateMatchDamage(state, match);
    await applyDamage(state, damage);
  },

  distributeMatchResources: async (state: GameState, match: Match) => {
    const resources = calculateMatchResources(state, match);
    await distributeResources(state, resources);
  },

  processMatches: async (state: GameState) => {
    const {board, currentPlayer} = state;
    debugLog('MATCH_ACTION', 'Processing matches');

    const matches = findMatches(board);
    const hasMatches = matches.length > 0;

    if (hasMatches) {
      debugLog('MATCH_ACTION', 'Found matches', matches);
      state.incrementCombo();

      const matchedTilesSet = new Set<string>();
      const matched: { row: number; col: number; color: Color }[] = [];
      const matchedColors: Record<Color, number> = {
        red: 0, green: 0, blue: 0, yellow: 0, black: 0, empty: 0
      };

      await processIgnitedTiles(board, matchedTilesSet, matched);
      await processRegularMatches(matches, matchedTilesSet, matched, matchedColors);
      await state.markTilesAsMatched(matched);

      for (const match of matches) {
        await MatchActions.processMatch(state, match);
      }

      if (currentPlayer === 'human') {
        checkItemReward(state);
      }
    }

    return hasMatches;
  },

  findMatches: (board: Tile[][]): Match[] => findMatches(board)
};
