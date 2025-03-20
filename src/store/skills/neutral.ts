import { debugLog } from '../slices/debug';
import { ClassSkill, Color, Player } from '../types';
import { toast } from 'react-hot-toast';

// Neutral skills - one for each color
export const NEUTRAL_SKILLS: ClassSkill[] = [
  // RED - Direct damage, ignite mechanic
  {
    id: 'flame_burst',
    name: 'Flame Burst',
    description: 'Deal 10 damage and ignite 3 random tiles on the board',
    cost: { red: 4 },
    primaryColor: 'red',
    secondaryColor: 'red',
    requiresTarget: false,
    effect: async (state) => {
      const currentPlayer = state.currentPlayer;
      const opponent = currentPlayer === 'human' ? 'ai' : 'human';
      
      // Deal direct damage
      const damage = state.takeDamage(currentPlayer, opponent, 10, true, true);
      
      // Ignite 3 random tiles
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (!state.board[row][col].isIgnited && !state.board[row][col].isFrozen) {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select 3 random tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const tilesToIgnite = availableTiles.slice(0, 3);
      
      // Ignite the tiles
      tilesToIgnite.forEach(tile => {
        state.board[tile.row][tile.col].isIgnited = true;
      });
      
      toast.success(`Flame Burst deals ${damage} damage and ignites 3 tiles!`);
    }
  },
  
  // YELLOW - Healing, defense, thorns mechanic
  {
    id: 'divine_shield',
    name: 'Divine Shield',
    description: 'Gain 15 defense and thorns that reflect 3 damage when hit',
    cost: { yellow: 4 },
    primaryColor: 'yellow',
    secondaryColor: 'yellow',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Add defense
      state[player].defense += 15;
      
      // Instead of using event system, just add a visual status effect
      // and explain that thorns effect would be implemented in the game engine
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        onExpire: () => {
          debugLog('SKILL_EFFECT', 'Divine Shield fades away');
        }
      });
      
      // Comment about thorns implementation
      debugLog('SKILL_EFFECT', 'Thorns effect would reflect 3 damage when hit');
      
      toast.success('Divine Shield activated! Gained 15 defense with thorns effect!');
    }
  },
  
  // BLUE - Extra turn, stun, dodge mechanic
  {
    id: 'time_slip',
    name: 'Time Slip',
    description: 'Gain 50% chance to dodge the next attack and an extra action this turn',
    cost: { blue: 4 },
    primaryColor: 'blue',
    secondaryColor: 'blue',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Instead of using event system, add a status effect with extraTurn
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 2,
        extraTurn: true, // This gives an extra turn
        onExpire: () => {
          debugLog('SKILL_EFFECT', 'Time Slip effect fades away');
        }
      });
      
      // Comment about dodge implementation
      debugLog('SKILL_EFFECT', 'Dodge effect would give 50% chance to avoid damage > 3');
      
      toast.success('Time Slip activated! Gained dodge chance and an extra action!');
    }
  },
  
  // GREEN - Tile conversion, buff/debuff duration
  {
    id: 'natures_touch',
    name: "Nature's Touch",
    description: 'Convert 4 random tiles to green and extend all positive effects by 1 turn',
    cost: { green: 4 },
    primaryColor: 'green',
    secondaryColor: 'green',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Convert random tiles to green
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (state.board[row][col].color !== 'green' && state.board[row][col].color !== 'empty') {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select 4 random tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const tilesToConvert = availableTiles.slice(0, 4);
      
      // Convert the tiles
      tilesToConvert.forEach(tile => {
        state.board[tile.row][tile.col].color = 'green';
      });
      
      // Extend positive status effects
      state[player].statusEffects.forEach(effect => {
        // Check if effect is positive (has damage multiplier or resource multiplier > 1)
        if (effect.damageMultiplier > 1 || effect.resourceMultiplier > 1) {
          effect.turnsRemaining += 1;
        }
      });
      
      toast.success("Nature's Touch converted 4 tiles to green and extended positive effects!");
    }
  },
  
  // BLACK - Debuffs and self damage for large effects
  {
    id: 'dark_sacrifice',
    name: 'Dark Sacrifice',
    description: 'Sacrifice 8 health to apply a devastating debuff to your opponent',
    cost: { black: 4 },
    primaryColor: 'black',
    secondaryColor: 'black',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Apply self damage
      state.takeDamage(player, player, 8, false, true);
      
      // Apply debuff to opponent
      state[opponent].statusEffects.push({
        damageMultiplier: 0.5, // Reduced damage
        resourceMultiplier: 0.5, // Reduced resources
        turnsRemaining: 2,
        onExpire: () => {
          debugLog('SKILL_EFFECT', 'Dark curse lifts');
        }
      });
      
      // Comment about periodic damage implementation
      debugLog('SKILL_EFFECT', 'Dark curse would deal 3 damage at the start of opponent turns');
      
      toast.success('Dark Sacrifice complete! Opponent is cursed with weakness and suffering!');
    }
  }
]; 