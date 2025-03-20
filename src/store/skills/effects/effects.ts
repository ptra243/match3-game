import { GameState, Color, Player, StatusEffect, Tile } from '../../types';
import { toast } from 'react-hot-toast';
import { debugLog } from '../../slices/debug';
import { StatusEffectBuilder } from './statusBuilder';

// Interface for effect definitions
export interface EffectDefinition {
  type: string;
  description: string;
  execute: (state: GameState, ...args: any[]) => Promise<any> | any;
}

// Interface for tile selection results
export interface TilePosition {
  row: number;
  col: number;
  tile: Tile;
}

// Tile selection helper functions
const TileHelpers = {
  /**
   * Select tiles in a specific pattern around a center point
   * @param state Game state to read the board from
   * @param centerRow Center row for the pattern
   * @param centerCol Center column for the pattern
   * @param pattern Pattern shape to select tiles in
   * @param radius How far from the center to include tiles
   * @returns Array of objects containing tile coordinates and the tile itself
   */
  selectPattern(
    state: GameState,
    centerRow: number,
    centerCol: number,
    pattern: 'diamond' | 'square' | 'cross' = 'diamond',
    radius: number = 2
  ): TilePosition[] {
    if (centerRow === undefined || centerCol === undefined) return [];
    
    const tilePositions: TilePosition[] = [];
    const boardHeight = state.board.length;
    const boardWidth = state.board[0].length;
    
    for (let r = 0; r < boardHeight; r++) {
      for (let c = 0; c < boardWidth; c++) {
        let shouldInclude = false;
        
        if (pattern === 'diamond') {
          const distance = Math.abs(r - centerRow) + Math.abs(c - centerCol);
          shouldInclude = distance <= radius;
        } else if (pattern === 'square') {
          const rowDist = Math.abs(r - centerRow);
          const colDist = Math.abs(c - centerCol);
          shouldInclude = rowDist <= radius && colDist <= radius;
        } else if (pattern === 'cross') {
          shouldInclude = r === centerRow || c === centerCol;
          const distance = Math.abs(r - centerRow) + Math.abs(c - centerCol);
          shouldInclude = shouldInclude && distance <= radius;
        }
        
        if (shouldInclude) {
          tilePositions.push({
            row: r,
            col: c,
            tile: state.board[r][c]
          });
        }
      }
    }
    
    return tilePositions;
  },
  
  /**
   * Select random tiles from the board with filtering options
   * @param state Game state to read the board from
   * @param count Maximum number of tiles to select
   * @param options Selection options for filtering
   * @returns Array of objects containing tile coordinates and the tile itself
   */
  selectRandom(
    state: GameState,
    count: number,
    options: {
      colors?: Color[];       // Only select tiles of these colors
      excludeColors?: Color[]; // Exclude tiles of these colors
      excludeFrozen?: boolean; // Exclude frozen tiles
      excludeIgnited?: boolean; // Exclude ignited tiles
      onlyEmpty?: boolean;    // Only include empty tiles
      excludeEmpty?: boolean; // Exclude empty tiles
    } = {}
  ): TilePosition[] {
    const availableTilePositions: TilePosition[] = [];
    const boardHeight = state.board.length;
    const boardWidth = state.board[0].length;
    
    // Build list of available tiles based on options
    for (let row = 0; row < boardHeight; row++) {
      for (let col = 0; col < boardWidth; col++) {
        const tile = state.board[row][col];
        let isValid = true;
        
        // Color filtering
        if (options.colors && options.colors.length > 0) {
          isValid = isValid && options.colors.includes(tile.color);
        }
        
        if (options.excludeColors && options.excludeColors.length > 0) {
          isValid = isValid && !options.excludeColors.includes(tile.color);
        }
        
        // State filtering
        if (options.excludeFrozen) {
          isValid = isValid && !tile.isFrozen;
        }
        
        if (options.excludeIgnited) {
          isValid = isValid && !tile.isIgnited;
        }
        
        // Empty tile filtering
        if (options.onlyEmpty) {
          isValid = isValid && tile.color === 'empty';
        }
        
        if (options.excludeEmpty) {
          isValid = isValid && tile.color !== 'empty';
        }
        
        if (isValid) {
          availableTilePositions.push({
            row,
            col,
            tile
          });
        }
      }
    }
    
    // Shuffle the tiles using Fisher-Yates algorithm
    for (let i = availableTilePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableTilePositions[i], availableTilePositions[j]] = [availableTilePositions[j], availableTilePositions[i]];
    }
    
    // Return requested number of tiles (or all if count > available)
    return availableTilePositions.slice(0, count);
  }
};

// Effects library
export const Effects = {
  // DISPLAY EFFECTS
  showToast: (message: string, type: 'success' | 'error' = 'success', customIcon?: string): EffectDefinition => ({
    type: 'showToast',
    description: `Show a toast message: ${message}`,
    execute: async () => {
      // Determine appropriate icon based on message content
      let icon = customIcon;
      if (!icon && typeof message === 'string') {
        const msgText = message.toLowerCase();
        
        // Yellow/turn messages - use shield icon
        if (msgText.includes('yellow') || msgText.includes('turn') || msgText.includes('shield')) {
          icon = '🛡️';
        }
        // Red/damage/fire messages - use fire icon
        else if (msgText.includes('red') || msgText.includes('damage') || 
                msgText.includes('fire') || msgText.includes('ignite') || 
                msgText.includes('explode') || msgText.includes('boom')) {
          icon = '🔥';
        }
        // Blue/freeze messages - use snowflake icon
        else if (msgText.includes('blue') || msgText.includes('freeze') || 
                msgText.includes('frost') || msgText.includes('cold')) {
          icon = '❄️';
        }
        // Green/heal/nature messages - use leaf icon
        else if (msgText.includes('green') || msgText.includes('heal') || 
                msgText.includes('nature') || msgText.includes('health')) {
          icon = '🍃';
        }
        // Combo messages - use sparkles icon
        else if (msgText.includes('combo')) {
          icon = '✨';
        }
      }

      if (type === 'success') {
        toast.success(message, { 
          icon,
          duration: 3000
        });
      } else {
        toast.error(message, { 
          icon,
          duration: 3000
        });
      }
      return true;
    }
  }),

  // DAMAGE EFFECTS
  dealDamage: (amount: number, isDirectDamage = true, isSkillDamage = true): EffectDefinition => ({
    type: 'dealDamage',
    description: `Deal ${amount} damage`,
    execute: async (state, sourcePlayer?: Player, targetPlayer?: Player) => {
      const source = sourcePlayer || state.currentPlayer;
      const target = targetPlayer || (source === 'human' ? 'ai' : 'human');
      
      const damage = state.takeDamage(source, target, amount, isDirectDamage, isSkillDamage);
      debugLog('EFFECT', `Dealt ${damage} damage from ${source} to ${target}`);
      return damage;
    }
  }),
  
  dealDamagePerColor: (color: Color, perTileDamage: number): EffectDefinition => ({
    type: 'dealDamagePerColor',
    description: `Deal ${perTileDamage} damage per ${color} tile affected`,
    execute: async (state, tilePositions) => {
      if (!tilePositions || !tilePositions.length) return 0;
      
      // Type checking to ensure we're working with TilePosition objects
      if (!Array.isArray(tilePositions) || !tilePositions[0].tile) {
        debugLog('EFFECT', 'Invalid tile positions provided to dealDamagePerColor', tilePositions);
        return 0;
      }
      
      const colorTilesCount = tilePositions.filter(
        (tilePos: TilePosition) => tilePos.tile.color === color
      ).length;
      
      const damage = colorTilesCount * perTileDamage;
      const source = state.currentPlayer;
      const target = source === 'human' ? 'ai' : 'human';
      
      const actualDamage = state.takeDamage(source, target, damage, true, true);
      debugLog('EFFECT', `Dealt ${actualDamage} damage based on ${colorTilesCount} ${color} tiles`);
      return actualDamage;
    }
  }),
  
  selfDamage: (amount: number, isSkillDamage = true): EffectDefinition => ({
    type: 'selfDamage',
    description: `Take ${amount} damage`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      const damage = state.takeDamage(target, target, amount, false, isSkillDamage);
      debugLog('EFFECT', `Self-inflicted ${damage} damage to ${target}`);
      return damage;
    }
  }),
  
  // HEALING EFFECTS
  heal: (amount: number): EffectDefinition => ({
    type: 'heal',
    description: `Heal ${amount} health`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      state[target].health += amount;
      debugLog('EFFECT', `Healed ${target} for ${amount}`);
      return amount;
    }
  }),
  
  // BOARD EFFECTS
  markTilesInPattern: (pattern: 'diamond' | 'square' | 'cross' = 'diamond', radius: number = 2): EffectDefinition => ({
    type: 'markTilesInPattern',
    description: `Mark tiles in a ${pattern} pattern with radius ${radius}`,
    execute: async (state, centerRow: number, centerCol: number) => {
      const selectedTiles = TileHelpers.selectPattern(state, centerRow, centerCol, pattern, radius);
      // Convert TilePosition objects to simple row/col objects for markTilesAsMatched
      const tilesToMark = selectedTiles.map(tilePos => ({ 
        row: tilePos.row, 
        col: tilePos.col 
      }));
      
      const result = await state.markTilesAsMatched(tilesToMark);
      debugLog('EFFECT', `Marked ${tilesToMark.length} tiles in a ${pattern} pattern for matching`);
      return result;
    }
  }),
  
  ignite: (count: number = 3, tilePositions?: TilePosition[]): EffectDefinition => ({
    type: 'ignite',
    description: tilePositions ? 'Ignite specified tiles' : `Ignite ${count} random tiles`,
    execute: async (state, providedTilePositions?) => {
      const tilesToIgnite = providedTilePositions || tilePositions || [];
      
      // If no tiles provided, select random ones
      if (tilesToIgnite.length === 0) {
        // Select random tiles that aren't frozen or already ignited
        const randomTilePositions = TileHelpers.selectRandom(state, count, {
          excludeIgnited: true,
          excludeFrozen: true,
          excludeEmpty: true
        });
        
        tilesToIgnite.push(...randomTilePositions);
      }
      
      // Apply ignite effect using updateTile
      for (const tilePos of tilesToIgnite) {
        state.updateTile(tilePos.row, tilePos.col, { isIgnited: true });
      }
      
      debugLog('EFFECT', `Ignited ${tilesToIgnite.length} tiles`);
      return tilesToIgnite;
    }
  }),
  
  freeze: (count: number = 3, tilePositions?: TilePosition[]): EffectDefinition => ({
    type: 'freeze',
    description: tilePositions ? 'Freeze specified tiles' : `Freeze ${count} random tiles`,
    execute: async (state, providedTilePositions?) => {
      const tilesToFreeze = providedTilePositions || tilePositions || [];
      
      // If no tiles provided, select random ones
      if (tilesToFreeze.length === 0) {
        // Select random tiles that aren't frozen or ignited
        const randomTilePositions = TileHelpers.selectRandom(state, count, {
          excludeFrozen: true,
          excludeIgnited: true,
          excludeEmpty: true
        });
        
        tilesToFreeze.push(...randomTilePositions);
      }
      
      // Apply freeze effect using updateTile
      for (const tilePos of tilesToFreeze) {
        state.updateTile(tilePos.row, tilePos.col, { isFrozen: true });
      }
      
      debugLog('EFFECT', `Froze ${tilesToFreeze.length} tiles`);
      return tilesToFreeze;
    }
  }),
  
  convertTiles: (color: Color, count: number = 3, tilePositions?: TilePosition[]): EffectDefinition => ({
    type: 'convertTiles',
    description: tilePositions ? `Convert specified tiles to ${color}` : `Convert ${count} random tiles to ${color}`,
    execute: async (state, providedTilePositions?) => {
      const tilesToConvert = providedTilePositions || tilePositions || [];
      
      // If no tiles provided, select random ones
      if (tilesToConvert.length === 0) {
        // Select random tiles that aren't already the target color
        const randomTilePositions = TileHelpers.selectRandom(state, count, {
          excludeColors: [color, 'empty']
        });
        
        tilesToConvert.push(...randomTilePositions);
      }
      
      // Convert TilePosition objects to the format expected by state.convertTiles
      const convertParams = tilesToConvert.map((tilePos: { row: any; col: any; }) => ({
        row: tilePos.row,
        col: tilePos.col,
        color: color
      }));
      
      // Call the board slice's convertTiles method
      if (convertParams.length > 0) {
        await state.convertTiles(convertParams);
      }
      
      debugLog('EFFECT', `Converted ${tilesToConvert.length} tiles to ${color}`);
      return tilesToConvert;
    }
  }),
  
  // Helper functions for tile selection (exposed for external use)
  selectTilesInPattern: (pattern: 'diamond' | 'square' | 'cross' = 'diamond', radius: number = 2): EffectDefinition => ({
    type: 'selectTilesInPattern',
    description: `Select tiles in a ${pattern} pattern with radius ${radius}`,
    execute: async (state, centerRow: number, centerCol: number) => {
      return TileHelpers.selectPattern(state, centerRow, centerCol, pattern, radius);
    }
  }),
  
  selectRandomTiles: (count: number, colors?: Color[]): EffectDefinition => ({
    type: 'selectRandomTiles',
    description: colors ? `Select ${count} random ${colors.join('/')} tiles` : `Select ${count} random tiles`,
    execute: async (state) => {
      const options = colors ? { colors } : { excludeEmpty: true };
      return TileHelpers.selectRandom(state, count, options);
    }
  }),
  
  // STATUS EFFECTS
  addStatusEffect: (effect: StatusEffect): EffectDefinition => ({
    type: 'addStatusEffect',
    description: 'Add a status effect',
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      state[target].statusEffects.push(effect);
      
      debugLog('EFFECT', `Added status effect to ${target}`, effect);
      return effect;
    }
  }),
  
  // Updated to use StatusEffectBuilder
  addDamageMultiplier: (multiplier: number, duration: number): EffectDefinition => ({
    type: 'addDamageMultiplier',
    description: `Add ${multiplier}x damage multiplier for ${duration} turns`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      
      const effect = new StatusEffectBuilder(duration)
        .addDamageMultiplier(multiplier)
        .addOnExpire(() => {
          debugLog('EFFECT', `Damage multiplier effect expired on ${target}`);
        })
        .build();
      
      state[target].statusEffects.push(effect);
      debugLog('EFFECT', `Added ${multiplier}x damage multiplier to ${target} for ${duration} turns`);
      
      return effect;
    }
  }),
  
  // Updated to use StatusEffectBuilder
  addResourceBonus: (matchColor: Color, bonusColor: Color, amount: number, duration: number): EffectDefinition => ({
    type: 'addResourceBonus',
    description: `Gain ${amount} ${bonusColor} resources when matching ${matchColor} for ${duration} turns`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      
      const effect = new StatusEffectBuilder(duration)
        .addResourceBonus(matchColor, bonusColor, amount)
        .addOnExpire(() => {
          debugLog('EFFECT', `Resource bonus effect expired on ${target}`);
        })
        .build();
      
      state[target].statusEffects.push(effect);
      debugLog('EFFECT', `Added resource bonus to ${target}: ${amount} ${bonusColor} per ${matchColor} match for ${duration} turns`);
      
      return effect;
    }
  }),
  
  // Updated to use StatusEffectBuilder
  fieryAura: (duration: number = 3): EffectDefinition => ({
    type: 'fieryAura',
    description: `Deal double damage and gain yellow mana from red matches for ${duration} turns`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      
      // Create the combined effect using the builder
      const effect = new StatusEffectBuilder(duration)
        .addDamageMultiplier(2)
        .addResourceBonus('red', 'yellow', 1)
        .addOnExpire(() => {
          debugLog('EFFECT', `Fiery aura expired on ${target}`);
        })
        .build();
      
      // Add the effect
      state[target].statusEffects.push(effect);
      
      // Show notification
      toast('Fiery Soul activated! Red matches deal double damage and grant yellow mana!', 
        { duration: 3000 });
      
      return effect;
    }
  }),
  
  // Updated to use StatusEffectBuilder
  bloodSacrifice: (sacrificeAmount: number = 5, damageMultiplier: number = 2.5, duration: number = 2): EffectDefinition => ({
    type: 'bloodSacrifice',
    description: `Sacrifice ${sacrificeAmount} health to gain ${damageMultiplier}x damage for ${duration} turns`,
    execute: async (state, player?: Player) => {
      const target = player || state.currentPlayer;
      
      // Apply self damage
      const selfDamageEffect = Effects.selfDamage(sacrificeAmount, true);
      await selfDamageEffect.execute(state, target);
      
      // Add damage multiplier using builder
      const effect = new StatusEffectBuilder(duration)
        .addDamageMultiplier(damageMultiplier)
        .build();
        
      state[target].statusEffects.push(effect);
      
      // Show notification
      toast(`Sacrificed health for power - next matches deal ${damageMultiplier}x damage!`, 
        { duration: 3000 });
      
      return effect;
    }
  })
};

// Make tile helpers accessible through Effects
export const { selectPattern, selectRandom } = TileHelpers;

// Note: TilePosition interface is already exported above

// Helper function to convert the new effects-based skills to legacy format
export function adaptToLegacySkill(skill: any) {
  return {
    ...skill,
    effect: async (state: GameState, row?: number, col?: number) => {
      // For skills with a single effect
      if (skill.effect) {
        return skill.effect.execute(state, row, col);
      }
      
      // For skills with multiple effects
      if (Array.isArray(skill.effects)) {
        let result = null;
        for (const effect of skill.effects) {
          result = await effect.execute(state, row, col, result);
        }
        return result;
      }
      
      debugLog('ERROR', 'Skill has neither effect nor effects array', skill.id);
      return null;
    }
  };
} 