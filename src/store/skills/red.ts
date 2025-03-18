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
    effect: async (state, row, col) => {
      console.log('Fireball effect called:', { row, col });
      if (row === undefined || col === undefined) {
        toast.error('Must select a valid tile!');
        return;
      }
      if (state.board[row][col].color !== 'red') {
        toast.error('Must target a red tile!');
        return;
      }

      const board = state.board;
      let tilesToDestroy = [];

      // Mark tiles for explosion in a diamond pattern
      for (let i = Math.max(0, row - 2); i <= Math.min(board.length - 1, row + 2); i++) {
        for (let j = Math.max(0, col - 2); j <= Math.min(board[0].length - 1, col + 2); j++) {
          // Calculate Manhattan distance
          const distance = Math.abs(i - row) + Math.abs(j - col);
          if (distance <= 2) {
            tilesToDestroy.push({ row: i, col: j });
            console.log(`Adding tile to destroy at [${i},${j}] with distance ${distance} from center [${row},${col}]`, {
              currentTileState: board[i][j]
            });
          }
        }
      }

      const { destroyedTiles } = await state.markTilesForDestruction(tilesToDestroy);
    
      // Count red tiles and apply damage
      const redTiles = destroyedTiles.filter(t => t.color === 'red').length;
      const damage = redTiles * 5; // 5 damage per red tile

      // Update opponent's health
      const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
      state[opponent].health = Math.max(0, state[opponent].health - damage);

      // Add resources from destroyed tiles
      const currentPlayer = state[state.currentPlayer];
      destroyedTiles.forEach(tile => {
        if (tile.color !== 'empty') {
          currentPlayer.matchedColors[tile.color]++;
        }
      });

      toast.success(`Fireball destroyed ${destroyedTiles.length} tiles and dealt ${damage} damage!`);
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
      state[player].health = Math.max(1, state[player].health - 5);
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