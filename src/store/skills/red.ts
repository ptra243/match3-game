import { ClassSkill, Color, Tile } from '../types';
import { toast } from 'react-hot-toast';

// Pyromancer Skills
export const PYROMANCER_SKILLS: ClassSkill[] = [
  {
    id: 'fiery_soul',
    name: 'Fiery Soul',
    description: 'Deal double damage and gain 1 yellow mana for each red tile matched for 3 turns',
    cost: { red: 5 },
    primaryColor: 'red',
    secondaryColor: 'yellow',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;      
      // Add damage multiplier effect
      state[player].statusEffects.push({
        damageMultiplier: 2,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        resourceBonus: {
          matchColor: 'red',
          bonusColor: 'yellow',
          bonusAmount: 1
        }
      });
      
      console.log('Updated status effects:', state[player].statusEffects);
      
      toast.success('Fiery Soul activated! Red matches deal double damage and grant yellow mana!');
    }
  },
  {
    id: 'fireball',
    name: 'Fireball',
    description: 'Choose a red tile to create an explosion, dealing 5 damage per red tile destroyed',
    cost: { red: 4, yellow: 3 },
    primaryColor: 'red',
    secondaryColor: 'yellow',
    targetColor: 'red',
    requiresTarget: true,
    effect: async (state, row?: number, col?: number) => {
      if (row === undefined || col === undefined) return;

      // Mark tiles for explosion in a diamond pattern
      const tilesToMark = [];
      for (let r = 0; r < state.board.length; r++) {
        for (let c = 0; c < state.board[0].length; c++) {
          const distance = Math.abs(r - row) + Math.abs(c - col);
          if (distance <= 2) {
            tilesToMark.push({ row: r, col: c });
          }
        }
      }

      // Mark all tiles in the pattern
      tilesToMark.forEach(tile => {
        state.board[tile.row][tile.col].isAnimating = true;
      });

      // Count red tiles destroyed and calculate damage
      const redTilesCount = tilesToMark.filter(
        tile => state.board[tile.row][tile.col].color === 'red'
      ).length;
      const damage = redTilesCount * 5;

      const currentPlayer = state.currentPlayer;
      const opponent = currentPlayer === 'human' ? 'ai' : 'human';

      // Apply damage using takeDamage with isSkillDamage=true
      // This allows for blessings and items with skillDamageMultiplier to affect the damage
      const actualDamage = state.takeDamage(currentPlayer, opponent, damage, true, true);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Clear exploding status
      tilesToMark.forEach(tile => {
        state.board[tile.row][tile.col].isAnimating = false;
      });

      toast.success(`Fireball deals ${actualDamage} damage!`);
    }
  }
];

// Blood Mage Skills (red primary)
export const BLOOD_MAGE_SKILLS: ClassSkill[] = [
  {
    id: 'blood_surge',
    name: 'Blood Surge',
    description: 'Take 5 damage to enhance next match damage',
    cost: { red: 3, blue: 3 },
    primaryColor: 'red',
    secondaryColor: 'blue',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Apply self-damage - this is not direct damage since it's self-inflicted
      // But it is skill damage, so we use isSkillDamage=true to allow skill damage modifiers
      state.takeDamage(player, player, 5, false, true);
      
      // Add damage multiplier effect
      state[player].statusEffects.push({
        damageMultiplier: 2.5,
        resourceMultiplier: 1,
        turnsRemaining: 2
      });
      toast.success('Sacrificed health for power - next matches deal 2.5x damage!');
    }
  },
  {
    id: 'frost_fire',
    name: 'Frost Fire',
    description: 'Red matches freeze tiles, blue matches ignite them',
    cost: { red: 4, blue: 4 },
    primaryColor: 'red',
    secondaryColor: 'blue',
    requiresTarget: false,
    effect: async (state) => {
      state[state.currentPlayer].statusEffects.push({
        damageMultiplier: 2,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });
      toast.success('Elemental chaos activated - matches have dual effects!');
    }
  }
]; 