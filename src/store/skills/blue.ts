import { ClassSkill } from './types';
import { toast } from 'react-hot-toast';

// Cryomancer Skills
export const CRYOMANCER_SKILLS: ClassSkill[] = [
  {
    id: 'ice_shard',
    name: 'Ice Shard',
    description: 'Choose any tile to freeze it and its neighbors, making them unmovable but countable in matches. Deals 4 damage.',
    cost: { blue: 4 },
    primaryColor: 'blue',
    requiresTarget: true,
    effect: async (state, row, col) => {
      const surroundingTiles = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
        { row, col }
      ].filter(pos => 
        pos.row >= 0 && pos.row < state.board.length &&
        pos.col >= 0 && pos.col < state.board[0].length
      );

      const newBoard = state.board.map(row => [...row]);
      surroundingTiles.forEach(pos => {
        newBoard[pos.row][pos.col] = {
          ...newBoard[pos.row][pos.col],
          isFrozen: true,
          isAnimating: true
        };
      });
      state.board = newBoard;

      // Deal damage
      const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
      state[opponent].health = Math.max(0, state[opponent].health - 4);

      toast.success('Tiles frozen and dealt 4 damage!');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  },
  {
    id: 'golden_frost',
    name: 'Golden Frost',
    description: 'All matches generate double resources for 3 turns. Deal damage and heal health per frozen tile, scaling with each cast.',
    cost: { blue: 3, yellow: 3 },
    primaryColor: 'blue',
    secondaryColor: 'yellow',
    effect: async (state) => {
      const currentPlayer = state[state.currentPlayer];
      const castCount = (currentPlayer.skillCastCount['golden_frost'] || 0);
      const damagePerTile = castCount + 1; // Damage scales with each cast
      
      // Count frozen tiles
      const frozenTiles = state.board.flat().filter(tile => tile.isFrozen).length;
      
      // Deal damage to opponent
      const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
      const totalDamage = frozenTiles * damagePerTile;
      state[opponent].health = Math.max(0, state[opponent].health - totalDamage);
      
      // Heal current player
      currentPlayer.health = Math.min(100, currentPlayer.health + totalDamage);

      // Add resource multiplier effect
      currentPlayer.statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 2,
        turnsRemaining: 3
      });

      // Update cast count
      currentPlayer.skillCastCount['golden_frost'] = castCount + 1;

      toast.success(`Golden Frost activated! Dealt ${totalDamage} damage, healed ${totalDamage} health, and doubled resources for 3 turns! (${damagePerTile} damage per tile)`);
    }
  }
];

// Storm Mage Skills
export const STORM_MAGE_SKILLS: ClassSkill[] = [
  {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Convert a line of tiles to blue, dealing damage for each conversion',
    cost: { blue: 4, black: 3 },
    primaryColor: 'blue',
    secondaryColor: 'black',
    effect: async (state, row, col) => {
      const newBoard = state.board.map(r => [...r]);
      let damage = 0;
      
      // Convert horizontal line
      for (let j = 0; j < state.board[0].length; j++) {
        if (newBoard[row][j].color !== 'blue') {
          newBoard[row][j] = {
            ...newBoard[row][j],
            color: 'blue',
            isAnimating: true
          };
          damage += 2;
        }
      }
      
      state.board = newBoard;
      
      // Apply damage
      const opponent = state.currentPlayer === 'human' ? 'ai' : 'human';
      state[opponent].health = Math.max(0, state[opponent].health - damage);
      
      toast.success(`Chain Lightning dealt ${damage} damage!`);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  },
  {
    id: 'storm_front',
    name: 'Storm Front',
    description: 'Summon a storm that enhances blue and black matches',
    cost: { blue: 3, black: 3 },
    primaryColor: 'blue',
    secondaryColor: 'black',
    effect: async (state) => {
      state[state.currentPlayer].statusEffects.push({
        damageMultiplier: 1.5,
        resourceMultiplier: 1.5,
        turnsRemaining: 4
      });
      toast.success('Storm enhances your matches for 4 turns!');
    }
  }
]; 