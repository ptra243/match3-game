import { ClassSkill, Color } from '../types';
import { toast } from 'react-hot-toast';

// Dual color skills - one for each color combination
export const DUAL_COLOR_SKILLS: ClassSkill[] = [
  // RED + YELLOW - Aggressive with self-sustain
  {
    id: 'phoenix_rebirth',
    name: 'Phoenix Rebirth',
    description: 'Deal 8 damage and heal 5 health. Ignited tiles also heal you when destroyed',
    cost: { red: 3, yellow: 3 },
    primaryColor: 'red',
    secondaryColor: 'yellow',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Deal damage
      const damage = state.takeDamage(player, opponent, 8, true, true);
      
      // Heal self
      state[player].health += 5;
      
      // Add effect for lifesteal from ignited tiles
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        onExpire: () => {
          toast.success('Phoenix aura fades away');
        }
      });
      
      // Register an event for when tiles are destroyed
      const handleEvent = (payload: {color: string, tile: {isIgnited: boolean}}) => {
        if (payload.color === 'red' && payload.tile.isIgnited) {
          // Heal 2 health per ignited red tile destroyed
          state[player].health += 2;
          toast.success('+2 health from ignited tile');
        }
      };
      
      // This would be implemented through the game's event system
      // For now, it's a conceptual representation
      
      toast.success(`Phoenix Rebirth deals ${damage} damage and heals 5 health!`);
    }
  },
  
  // RED + BLUE - Controlled chaos (ignite + freeze)
  {
    id: 'frostfire_eruption',
    name: 'Frostfire Eruption',
    description: 'Tiles that are both frozen and ignited explode, dealing damage and creating chain reactions',
    cost: { red: 3, blue: 3 },
    primaryColor: 'red',
    secondaryColor: 'blue',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Find all tiles that are both frozen and ignited
      const dualStateTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          const tile = state.board[row][col];
          if (tile.isFrozen && tile.isIgnited) {
            dualStateTiles.push({ row, col });
          }
        }
      }
      
      // Explode these tiles and deal damage
      let totalDamage = 0;
      if (dualStateTiles.length > 0) {
        // Mark tiles as exploding
        dualStateTiles.forEach(tile => {
          state.board[tile.row][tile.col].isAnimating = true;
        });
        
        // Deal damage based on number of exploding tiles
        totalDamage = dualStateTiles.length * 4;
        state.takeDamage(player, opponent, totalDamage, true, true);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reset animation state
        dualStateTiles.forEach(tile => {
          state.board[tile.row][tile.col].isAnimating = false;
          state.board[tile.row][tile.col].isFrozen = false;
          state.board[tile.row][tile.col].isIgnited = false;
          state.board[tile.row][tile.col].color = 'empty'; // Clear the tiles
        });
        
        toast.success(`Frostfire Eruption triggers ${dualStateTiles.length} explosions for ${totalDamage} damage!`);
      } else {
        // If no dual-state tiles, create some
        // Ignite some tiles
        const tiles = [];
        for (let row = 0; row < state.board.length; row++) {
          for (let col = 0; col < state.board[0].length; col++) {
            if (!state.board[row][col].isIgnited && !state.board[row][col].isFrozen) {
              tiles.push({ row, col });
            }
          }
        }
        
        // Shuffle and select random tiles
        for (let i = tiles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        
        // Ignite 3 random tiles
        const igniteCount = Math.min(3, tiles.length);
        for (let i = 0; i < igniteCount; i++) {
          state.board[tiles[i].row][tiles[i].col].isIgnited = true;
        }
        
        // Freeze 3 different random tiles
        const freezeCount = Math.min(3, tiles.length - igniteCount);
        for (let i = 0; i < freezeCount; i++) {
          state.board[tiles[igniteCount + i].row][tiles[igniteCount + i].col].isFrozen = true;
        }
        
        toast.success('Frostfire prepared! Ignited 3 tiles and froze 3 tiles.');
      }
    }
  },
  
  // RED + GREEN - Spreading flames with enhanced duration
  {
    id: 'wildfire_spread',
    name: 'Wildfire Spread',
    description: 'Convert 3 tiles to red and ignite them. Ignited tiles last twice as long',
    cost: { red: 3, green: 3 },
    primaryColor: 'red',
    secondaryColor: 'green',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Find tiles to convert
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (state.board[row][col].color !== 'empty' && !state.board[row][col].isIgnited) {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const tilesToConvert = availableTiles.slice(0, 3);
      
      // Convert and ignite tiles
      tilesToConvert.forEach(tile => {
        state.board[tile.row][tile.col].color = 'red';
        state.board[tile.row][tile.col].isIgnited = true;
      });
      
      // Add effect to extend ignite durations
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        onExpire: () => {
          toast.success('Wildfire duration boost ends');
        }
      });
      
      // This would need to be implemented in the game's effect system
      // The concept is to double the duration of ignited tiles
      
      toast.success('Wildfire Spread converts and ignites 3 tiles with extended duration!');
    }
  },
  
  // RED + BLACK - Massive damage at a cost
  {
    id: 'blood_inferno',
    name: 'Blood Inferno',
    description: 'Sacrifice 10 health to deal 20 damage and ignite 5 random tiles',
    cost: { red: 3, black: 3 },
    primaryColor: 'red',
    secondaryColor: 'black',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Sacrifice health
      state.takeDamage(player, player, 10, false, true);
      
      // Deal damage
      const damage = state.takeDamage(player, opponent, 20, true, true);
      
      // Ignite random tiles
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (!state.board[row][col].isIgnited) {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const igniteCount = Math.min(5, availableTiles.length);
      for (let i = 0; i < igniteCount; i++) {
        state.board[availableTiles[i].row][availableTiles[i].col].isIgnited = true;
      }
      
      toast.success(`Blood Inferno sacrifices 10 health to deal ${damage} damage and ignite 5 tiles!`);
    }
  },
  
  // YELLOW + BLUE - Defensive control
  {
    id: 'time_barrier',
    name: 'Time Barrier',
    description: 'Gain 15 defense and a 100% chance to dodge the next attack. Stun opponent for 1 turn',
    cost: { yellow: 3, blue: 3 },
    primaryColor: 'yellow',
    secondaryColor: 'blue',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Add defense
      state[player].defense += 15;
      
      // Apply guaranteed dodge
      let dodgeUsed = false;
      
      // This would be implemented using the game's event system
      // Conceptual representation of adding a one-time full dodge
      
      // Add stun effect to opponent
      state[opponent].statusEffects.push({
        damageMultiplier: 0, // Can't deal damage while stunned
        resourceMultiplier: 0, // Can't gain resources while stunned
        turnsRemaining: 1,
        onExpire: () => {
          toast.success('Opponent is no longer stunned');
        }
      });
      
      // Add dodge effect to player
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 2,
        onExpire: () => {
          toast.success('Time Barrier fades away');
        }
      });
      
      toast.success('Time Barrier activated! Gained defense, dodge, and stunned opponent!');
    }
  },
  
  // YELLOW + GREEN - Long-lasting defensive buffs
  {
    id: 'natures_blessing',
    name: "Nature's Blessing",
    description: 'Gain 10 defense and heal 5 health. Positive effects last 2 turns longer',
    cost: { yellow: 3, green: 3 },
    primaryColor: 'yellow',
    secondaryColor: 'green',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Add defense
      state[player].defense += 10;
      
      // Heal
      state[player].health += 5;
      
      // Extend positive effects
      state[player].statusEffects.forEach(effect => {
        if (effect.damageMultiplier > 1 || effect.resourceMultiplier > 1) {
          effect.turnsRemaining += 2;
        }
      });
      
      toast.success("Nature's Blessing grants defense, healing, and extends positive effects!");
    }
  },
  
  // YELLOW + BLACK - Life drain
  {
    id: 'soul_drain',
    name: 'Soul Drain',
    description: 'Sacrifice 5 health to steal 10 health from your opponent',
    cost: { yellow: 3, black: 3 },
    primaryColor: 'yellow',
    secondaryColor: 'black',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Sacrifice health
      state.takeDamage(player, player, 5, false, true);
      
      // Deal damage and track it
      const damage = state.takeDamage(player, opponent, 10, true, true);
      
      // Heal based on damage dealt
      state[player].health += damage;
      
      toast.success(`Soul Drain steals ${damage} health from your opponent!`);
    }
  },
  
  // BLUE + GREEN - Extended control effects
  {
    id: 'eternal_winter',
    name: 'Eternal Winter',
    description: 'Freeze 4 random tiles. Frozen tiles remain frozen 2 turns longer',
    cost: { blue: 3, green: 3 },
    primaryColor: 'blue',
    secondaryColor: 'green',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Find tiles to freeze
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (!state.board[row][col].isFrozen) {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const freezeCount = Math.min(4, availableTiles.length);
      for (let i = 0; i < freezeCount; i++) {
        state.board[availableTiles[i].row][availableTiles[i].col].isFrozen = true;
      }
      
      // Add effect to extend frozen durations
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        onExpire: () => {
          toast.success('Eternal Winter fades');
        }
      });
      
      // This would need game logic to extend frozen duration
      
      toast.success('Eternal Winter freezes 4 tiles with extended duration!');
    }
  },
  
  // BLUE + BLACK - Time manipulation with a cost
  {
    id: 'void_rift',
    name: 'Void Rift',
    description: 'Sacrifice 8 health to gain an extra turn and apply Slow to opponent (50% chance to lose their turn)',
    cost: { blue: 3, black: 3 },
    primaryColor: 'blue',
    secondaryColor: 'black',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      const opponent = player === 'human' ? 'ai' : 'human';
      
      // Sacrifice health
      state.takeDamage(player, player, 8, false, true);
      
      // Grant extra turn
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 1,
        extraTurn: true
      });
      
      // Apply slow effect to opponent
      state[opponent].statusEffects.push({
        damageMultiplier: 0.5,
        resourceMultiplier: 0.5,
        turnsRemaining: 2,
        onExpire: () => {
          toast.success('Slow effect ends');
        }
      });
      
      // This would need game logic to implement 50% turn skip
      
      toast.success('Void Rift opens! Gained extra turn and slowed opponent!');
    }
  },
  
  // GREEN + BLACK - Sacrifice for growth
  {
    id: 'death_bloom',
    name: 'Death Bloom',
    description: 'Sacrifice 10 health to convert 6 random tiles to green and gain double resources from them',
    cost: { green: 3, black: 3 },
    primaryColor: 'green',
    secondaryColor: 'black',
    requiresTarget: false,
    effect: async (state) => {
      const player = state.currentPlayer;
      
      // Sacrifice health
      state.takeDamage(player, player, 10, false, true);
      
      // Find tiles to convert
      const availableTiles = [];
      for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[0].length; col++) {
          if (state.board[row][col].color !== 'green' && state.board[row][col].color !== 'empty') {
            availableTiles.push({ row, col });
          }
        }
      }
      
      // Shuffle and select tiles
      for (let i = availableTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTiles[i], availableTiles[j]] = [availableTiles[j], availableTiles[i]];
      }
      
      const convertCount = Math.min(6, availableTiles.length);
      for (let i = 0; i < convertCount; i++) {
        state.board[availableTiles[i].row][availableTiles[i].col].color = 'green';
      }
      
      // Double resources from green matches
      state[player].statusEffects.push({
        damageMultiplier: 1,
        resourceMultiplier: 1,
        turnsRemaining: 3,
        resourceBonus: {
          matchColor: 'green',
          bonusColor: 'green',
          bonusAmount: 1 // Double (this is how it's implemented - 1 extra per match)
        },
        onExpire: () => {
          toast.success('Death Bloom enhancement fades');
        }
      });
      
      toast.success('Death Bloom sacrifices health to create and empower green tiles!');
    }
  }
]; 