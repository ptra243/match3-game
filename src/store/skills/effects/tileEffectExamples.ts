import {Color} from '../../types';
import {EffectDefinition, TilePosition} from './effects';
import {Effects, selectPattern, selectRandom} from './index';

/**
 * Examples of skills that use the tile selection helper functions
 */

/**
 * Ignite tiles in a diamond pattern around a target
 */
export function createFireblastSkill(): EffectDefinition {
  return {
    type: 'fireblast',
    description: 'Ignite tiles in a diamond pattern and deal damage based on affected red tiles',
    execute: async (state, row?: number, col?: number) => {
      if (row === undefined || col === undefined) {
        return null;
      }
      
      // Step 1: Select tiles in a diamond pattern
      const targetTiles = selectPattern(state.board, row, col, 'diamond', 2);
      
      // Step 2: Ignite the selected tiles
      await Effects.ignite(targetTiles.length, targetTiles).execute(state);
      
      // Step 3: Deal damage based on the number of red tiles affected
      const damage = await Effects.dealDamagePerColor('red', 5).execute(state, targetTiles);
      
      return { damage, affectedTiles: targetTiles };
    }
  };
}

/**
 * Freeze tiles in a cross pattern and deal damage based on blue tiles
 */
export function createFrostBeamSkill(): EffectDefinition {
  return {
    type: 'frostbeam',
    description: 'Freeze tiles in a cross pattern and deal damage based on affected blue tiles',
    execute: async (state, row?: number, col?: number) => {
      if (row === undefined || col === undefined) {
        return null;
      }
      
      // Step 1: Select tiles in a cross pattern
      const targetTiles = selectPattern(state.board, row, col, 'cross', 3);
      
      // Step 2: Freeze the selected tiles
      await Effects.freeze(targetTiles.length, targetTiles).execute(state);
      
      // Step 3: Deal damage based on the number of blue tiles affected
      const damage = await Effects.dealDamagePerColor('blue', 4).execute(state, targetTiles);
      
      return { damage, affectedTiles: targetTiles };
    }
  };
}

/**
 * Convert random tiles to green and gain health based on the number converted
 */
export function createNaturesBlessingSkill(): EffectDefinition {
  return {
    type: 'naturesblessing',
    description: 'Convert random tiles to green and heal based on the number converted',
    execute: async (state) => {
      // Step 1: Select 5 random non-green, non-empty tiles
      const targetTiles = selectRandom(state.board, 5, {
        excludeColors: ['green', 'empty'],
        excludeFrozen: true
      });
      
      // Step 2: Convert the selected tiles to green
      await Effects.convertTiles('green', targetTiles.length, targetTiles).execute(state);
      
      // Step 3: Heal based on the number of tiles converted
      const healAmount = targetTiles.length * 2;
      await Effects.heal(healAmount).execute(state);
      
      // Step 4: Add a resource bonus effect for green tiles
      await Effects.addResourceBonus('green', 'blue', 1, 2).execute(state);
      
      return { healing: healAmount, tilesConverted: targetTiles.length };
    }
  };
}

/**
 * Tactical skill that affects tiles based on their colors
 */
export function createElementalMasterySkill(): EffectDefinition {
  return {
    type: 'elementalmastery',
    description: 'Different effects for different colored tiles',
    execute: async (state) => {
      const results = {
        redTiles: 0,
        blueTiles: 0,
        greenTiles: 0,
        yellowTiles: 0
      };
      
      // Step 1: Get random tiles of each color
      const redTiles = selectRandom(state.board, 3, {colors: ['red']});
      results.redTiles = redTiles.length;

      const blueTiles = selectRandom(state.board, 3, {colors: ['blue']});
      results.blueTiles = blueTiles.length;

      const greenTiles = selectRandom(state.board, 3, {colors: ['green']});
      results.greenTiles = greenTiles.length;

      const yellowTiles = selectRandom(state.board, 3, {colors: ['yellow']});
      results.yellowTiles = yellowTiles.length;
      
      // Step 2: Apply different effects based on the tiles
      
      // Red tiles: Ignite
      if (redTiles.length > 0) {
        await Effects.ignite(redTiles.length, redTiles).execute(state);
      }
      
      // Blue tiles: Freeze
      if (blueTiles.length > 0) {
        await Effects.freeze(blueTiles.length, blueTiles).execute(state);
      }
      
      // Green tiles: Heal
      if (greenTiles.length > 0) {
        await Effects.heal(greenTiles.length * 3).execute(state);
      }
      
      // Yellow tiles: Damage
      if (yellowTiles.length > 0) {
        await Effects.dealDamage(yellowTiles.length * 5).execute(state);
      }
      
      return results;
    }
  };
}

/**
 * Combo skill that combines multiple tile selection methods
 */
export function createChaosStormSkill(centerColor: Color = 'red'): EffectDefinition {
  return {
    type: 'chaosstorm',
    description: `Create a storm of chaotic energy centered on a ${centerColor} tile`,
    execute: async (state) => {
      // Step 1: Find a random tile of the center color
      const centerTiles = selectRandom(state.board, 1, {
        colors: [centerColor],
        excludeFrozen: true,
        excludeIgnited: true 
      });
      
      if (centerTiles.length === 0) {
        // Fallback if no suitable center tile found
        return { success: false, reason: `No ${centerColor} tile available` };
      }
      
      const centerTile = centerTiles[0];
      
      // Step 2: Select tiles in a square pattern around the center
      const affectedArea = selectPattern(
          state.board,
        centerTile.row, 
        centerTile.col, 
        'square', 
        2
      );
      
      // Step 3: Apply random effects to the affected area
      const redTiles = affectedArea.filter((tilePos: TilePosition) => 
        tilePos.tile.color === 'red'
      );
      
      const blueTiles = affectedArea.filter((tilePos: TilePosition) => 
        tilePos.tile.color === 'blue'
      );
      
      const otherTiles = affectedArea.filter((tilePos: TilePosition) => 
        !['red', 'blue', 'empty'].includes(tilePos.tile.color)
      );
      
      // Apply effects
      if (redTiles.length > 0) {
        await Effects.ignite(redTiles.length, redTiles).execute(state);
      }
      
      if (blueTiles.length > 0) {
        await Effects.freeze(blueTiles.length, blueTiles).execute(state);
      }
      
      if (otherTiles.length > 0) {
        await Effects.convertTiles('yellow', otherTiles.length, otherTiles).execute(state);
      }
      
      // Deal damage based on total affected tiles
      const damage = affectedArea.length * 2;
      await Effects.dealDamage(damage).execute(state);
      
      return { 
        success: true,
        center: centerTile,
        affectedArea: affectedArea.length,
        damage
      };
    }
  };
} 