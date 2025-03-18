import { Blessing, Color, GameState, Effect } from './types';
import { GameEventType, GameEventPayload } from './slices/eventSlice';
import { toast } from 'react-hot-toast';
import { debugLog } from './slices/debug';
import { CLASSES } from './classes';

// Helper function to get primary color for a player
const getPrimaryColor = (state: GameState, player: string): Color => {
  const className = state[player as 'human' | 'ai'].className;
  return CLASSES[className].primaryColor;
};

// Create blessing factory function
const createBlessing = (
  id: string, 
  name: string, 
  description: string, 
  color: Color, 
  cost: number, 
  effects: Effect[] | Effect,
  duration?: number
): Blessing => ({
  id,
  name,
  description,
  color,
  cost,
  effects: Array.isArray(effects) ? effects : [effects],
  duration
});

// Define basic effects that can be reused
const createDamageEffect = (amount: number, triggerType: 'immediate' | GameEventType = 'immediate'): Effect => ({
  triggerType,
  onActivate: (state: GameState) => {
    const target = state.currentPlayer === 'human' ? 'ai' : 'human';
    state[target].health = Math.max(0, state[target].health - amount);
    toast.success(`Dealt ${amount} damage to opponent!`);
    
    if (state.emit) {
      state.emit('OnDamageTaken', {
        amount,
        source: state.currentPlayer,
        target,
        damageType: 'normal'
      });
    }
  },
  onTrigger: (state: GameState, event: GameEventPayload) => {
    // Only process if this is an immediate trigger or the event matches
    if (triggerType === 'immediate') return;
    
    const target = state.currentPlayer === 'human' ? 'ai' : 'human';
    state[target].health = Math.max(0, state[target].health - amount);
    toast.success(`${triggerType} triggered! Dealt ${amount} damage to opponent!`);
    
    if (state.emit) {
      state.emit('OnDamageTaken', {
        amount,
        source: state.currentPlayer,
        target,
        damageType: 'normal'
      });
    }
  }
});

const createDefenseEffect = (amount: number, turns: number, triggerType: 'immediate' | GameEventType = 'immediate'): Effect => ({
  defense: amount,
  turnsRemaining: turns,
  triggerType,
  onActivate: (state: GameState) => {
    toast.success(`Gained ${amount} defense for ${turns} turns!`);
  },
  onExpire: (state: GameState) => {
    toast.success(`Defense boost has expired.`);
  },
  onTrigger: (state: GameState, event: GameEventPayload) => {
    if (triggerType === 'immediate') return;
    toast.success(`${triggerType} triggered! Gained ${amount} defense for ${turns} turns!`);
  }
});

const createHealEffect = (amount: number, triggerType: 'immediate' | GameEventType = 'immediate'): Effect => ({
  triggerType,
  onActivate: (state: GameState) => {
    const player = state.currentPlayer;
    const originalHealth = state[player].health;
    state[player].health = Math.min(100, originalHealth + amount);
    const healedAmount = state[player].health - originalHealth;
    toast.success(`Healed for ${healedAmount} health!`);
  },
  onTrigger: (state: GameState, event: GameEventPayload) => {
    if (triggerType === 'immediate') return;
    
    const player = state.currentPlayer;
    const originalHealth = state[player].health;
    state[player].health = Math.min(100, originalHealth + amount);
    const healedAmount = state[player].health - originalHealth;
    toast.success(`${triggerType} triggered! Healed for ${healedAmount} health!`);
  }
});

const createExtraTurnEffect = (): Effect => ({
  extraTurn: true,
  turnsRemaining: 1,
  onActivate: (state: GameState) => {
    toast.success(`Gained an extra turn!`);
  }
});

const createDamageMultiplierEffect = (multiplier: number, turns: number): Effect => ({
  damageMultiplier: multiplier,
  turnsRemaining: turns,
  onActivate: (state: GameState) => {
    toast.success(`Damage increased by ${Math.round((multiplier - 1) * 100)}% for ${turns} turns!`);
  }
});

const createResourceMultiplierEffect = (multiplier: number, turns: number): Effect => ({
  resourceMultiplier: multiplier,
  turnsRemaining: turns,
  onActivate: (state: GameState) => {
    toast.success(`Resource gain increased by ${Math.round((multiplier - 1) * 100)}% for ${turns} turns!`);
  }
});

// Create blessings inspired by items
const createItemInspiredBlessings = () => {
  // Blessing pools based on item effects
  const ITEM_INSPIRED_BLESSINGS: Record<string, Blessing> = {
    // Inspired by Phoenix Feather
    phoenix_blessing: createBlessing(
      'phoenix_blessing',
      'Phoenix Blessing',
      'Save yourself from defeat once by restoring 20 health when you would die',
      'red',
      8,
      {
        triggerType: 'OnDamageTaken',
        onTrigger: (state: GameState, event: GameEventPayload) => {
          // Extract damage and target safely from the event payload
          const damageEvent = event as any;
          if (!damageEvent.amount || !damageEvent.target) return false;
          
          if (damageEvent.target !== state.currentPlayer) return false;
          
          const player = state.currentPlayer;
          const damage = damageEvent.amount;
          
          if (state[player].health <= damage && damage > 0) {
            state[player].health = 20; // Set health to 20 instead of dying
            toast.success('Phoenix Blessing saved you from defeat!');
            debugLog('BLESSING_EFFECT', 'Phoenix Blessing prevented defeat', { player });
            
            // Remove this effect after it's used
            const playerEffects = state[player].statusEffects;
            const index = playerEffects.findIndex(effect => 
              // Just use properties that exist on StatusEffect interface
              effect.turnsRemaining > 0 && 
              effect.damageMultiplier === 1 && 
              effect.resourceMultiplier === 1
            );
            
            if (index >= 0) {
              playerEffects.splice(index, 1);
            }
            
            return true; // Signal that the event was handled
          }
          
          return false;
        }
      }
    ),
    
    // Inspired by Stone of Rejuvenation
    rejuvenation: createBlessing(
      'rejuvenation',
      'Rejuvenation',
      'Heal 3 health at the start of each turn for 3 turns',
      'green', 
      5,
      {
        triggerType: 'StartOfTurn',
        turnsRemaining: 3,
        onTrigger: (state: GameState) => {
          const player = state.currentPlayer;
          const healAmount = 3;
          state[player].health = Math.min(100, state[player].health + healAmount);
          toast.success(`Rejuvenation healed you for ${healAmount} health!`);
          return true;
        },
        onExpire: (state: GameState) => {
          toast.success('Rejuvenation blessing has faded.');
        }
      },
      3
    ),
    
    // Inspired by Elemental Catalyst
    catalyst_blessing: createBlessing(
      'catalyst_blessing',
      'Elemental Catalyst',
      'Increases damage by 20% for 2 turns after each match',
      'yellow',
      6,
      {
        triggerType: 'OnMatch',
        turnsRemaining: 3,
        onTrigger: (state: GameState) => {
          const player = state.currentPlayer;
          
          // Add temporary damage multiplier for the next turn
          state[player].statusEffects.push({
            damageMultiplier: 1.2,
            resourceMultiplier: 1, // Required field by StatusEffect interface
            turnsRemaining: 1
          });
          
          toast.success('Elemental Catalyst: Damage increased for next turn!');
          debugLog('BLESSING_EFFECT', 'Catalyst applied damage boost', { player });
          return true;
        }
      },
      3
    ),
    
    // Inspired by Resource Prism
    resource_conversion: createBlessing(
      'resource_conversion',
      'Resource Conversion',
      'Convert 5 random resources into 10 health at the end of each turn',
      'green',
      7,
      {
        triggerType: 'EndOfTurn',
        turnsRemaining: 2,
        onTrigger: (state: GameState) => {
          const player = state.currentPlayer;
          const totalResources = Object.values(state[player].matchedColors).reduce((sum, val) => sum + val, 0);
          
          if (totalResources >= 5) {
            // Convert 5 resources (randomly chosen) into 10 health
            const colors = Object.keys(state[player].matchedColors).filter(
              color => color !== 'empty' && state[player].matchedColors[color as Color] > 0
            ) as Color[];
            
            if (colors.length > 0) {
              let remaining = 5;
              const consumed: Partial<Record<Color, number>> = {};
              
              while (remaining > 0 && colors.length > 0) {
                const randomColorIndex = Math.floor(Math.random() * colors.length);
                const color = colors[randomColorIndex];
                
                if (state[player].matchedColors[color] > 0) {
                  state[player].matchedColors[color]--;
                  consumed[color] = (consumed[color] || 0) + 1;
                  remaining--;
                } else {
                  // Remove this color from the available colors
                  colors.splice(randomColorIndex, 1);
                }
              }
              
              if (remaining === 0) {
                const healAmount = 10;
                state[player].health = Math.min(100, state[player].health + healAmount);
                
                const resourceDesc = Object.entries(consumed)
                  .map(([color, amount]) => `${amount} ${color}`)
                  .join(', ');
                
                toast.success(`Resource Conversion: ${resourceDesc} into ${healAmount} health!`);
                return true;
              }
            }
          }
          return false;
        },
        onExpire: (state: GameState) => {
          toast.success('Resource Conversion blessing has ended.');
        }
      },
      2
    ),
    
    // Inspired by Lucky Charm
    lucky_blessing: createBlessing(
      'lucky_blessing',
      'Lucky Blessing',
      'Gain extra resources on 30% of matches for 3 turns',
      'yellow',
      4,
      {
        triggerType: 'OnMatch',
        turnsRemaining: 3,
        onTrigger: (state: GameState, event: GameEventPayload) => {
          if (Math.random() < 0.3) { // 30% chance
            const matchEvent = event as any;
            const color = Object.keys(matchEvent.colors).reduce((a, b) => 
              matchEvent.colors[a as Color] > matchEvent.colors[b as Color] ? a : b
            ) as Color;
            
            const player = state.currentPlayer;
            const extraAmount = 1;
            state[player].matchedColors[color] += extraAmount;
            toast.success(`Lucky Blessing: Gained an extra ${color} resource!`);
            return true;
          }
          return false;
        },
        onExpire: (state: GameState) => {
          toast.success('Your luck has run out!');
        }
      },
      3
    ),
    
    // Inspired by Staff of Flames
    ignite_blessing: createBlessing(
      'ignite_blessing',
      'Ignite Blessing',
      'Randomly ignite a tile at the start of each turn for 3 turns',
      'red',
      4,
      {
        triggerType: 'StartOfTurn',
        turnsRemaining: 3,
        onTrigger: (state: GameState) => {
          // Find random tile to ignite
          const board = state.board;
          const validTiles = [];
          
          for (let row = 0; row < board.length; row++) {
            for (let col = 0; col < board[row].length; col++) {
              if (!board[row][col].isIgnited && board[row][col].color !== 'empty') {
                validTiles.push({ row, col });
              }
            }
          }
          
          if (validTiles.length > 0) {
            const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)];
            state.updateTile(randomTile.row, randomTile.col, { isIgnited: true });
            toast.success(`Ignite Blessing ignited a tile!`);
            debugLog('BLESSING_EFFECT', 'Ignite Blessing ignited a tile', randomTile);
            return true;
          }
          return false;
        },
        onExpire: (state: GameState) => {
          toast.success('Ignite Blessing has faded away.');
        }
      },
      3
    )
  };
  
  return ITEM_INSPIRED_BLESSINGS;
};

// Add these blessings to the existing blessing pools
const ITEM_INSPIRED_BLESSINGS = createItemInspiredBlessings();

// Define blessings for each color
export const RED_BLESSINGS: Record<string, Blessing> = {
  fire_surge: createBlessing(
    'fire_surge',
    'Fire Surge',
    'Deal 5 direct damage to your opponent',
    'red',
    5,
    createDamageEffect(5)
  ),
  flame_shield: createBlessing(
    'flame_shield',
    'Flame Shield',
    'Gain +3 defense for two turns',
    'red',
    4,
    createDefenseEffect(3, 2),
    2
  ),
  inferno: createBlessing(
    'inferno',
    'Inferno',
    'Deal 8 damage and gain +1 to red damage permanently',
    'red',
    7,
    [
      createDamageEffect(8),
      {
        colorStats: { red: 1 }
      }
    ]
  ),
  // Add item-inspired blessings
  phoenix_blessing: ITEM_INSPIRED_BLESSINGS.phoenix_blessing,
  ignite_blessing: ITEM_INSPIRED_BLESSINGS.ignite_blessing
};

export const BLUE_BLESSINGS: Record<string, Blessing> = {
  frost_nova: createBlessing(
    'frost_nova',
    'Frost Nova',
    'Freeze 3 random tiles for 2 turns',
    'blue',
    4,
    {
      onActivate: (state: GameState) => {
        const board = state.board;
        const tiles = [];
        
        // Get all non-frozen, non-empty tiles
        for (let row = 0; row < board.length; row++) {
          for (let col = 0; col < board[row].length; col++) {
            if (!board[row][col].isFrozen && board[row][col].color !== 'empty') {
              tiles.push({ row, col });
            }
          }
        }
        
        // Randomly select 3 tiles
        for (let i = 0; i < Math.min(3, tiles.length); i++) {
          const randomIndex = Math.floor(Math.random() * tiles.length);
          const { row, col } = tiles[randomIndex];
          
          // Remove the selected tile to avoid duplicates
          tiles.splice(randomIndex, 1);
          
          // Freeze the tile
          state.updateTile(row, col, { isFrozen: true });
        }
        
        toast.success('Frost Nova froze 3 tiles!');
      },
      turnsRemaining: 2
    },
    2
  ),
  mana_flow: createBlessing(
    'mana_flow',
    'Mana Flow',
    'Double your blue resources',
    'blue',
    3,
    {
      onActivate: (state: GameState) => {
        const player = state.currentPlayer;
        const blueResources = state[player].matchedColors.blue;
        
        state[player].matchedColors.blue = blueResources * 2;
        toast.success(`Mana Flow doubled your blue resources to ${state[player].matchedColors.blue}!`);
      }
    }
  ),
  ice_armor: createBlessing(
    'ice_armor',
    'Ice Armor',
    'Gain +5 defense and +1 to blue stat permanently',
    'blue',
    6,
    [
      createDefenseEffect(5, 3),
      {
        colorStats: { blue: 1 }
      }
    ],
    3
  )
};

export const GREEN_BLESSINGS: Record<string, Blessing> = {
  natures_gift: createBlessing(
    'natures_gift',
    'Nature\'s Gift',
    'Heal 10 health points',
    'green',
    4,
    createHealEffect(10)
  ),
  wild_growth: createBlessing(
    'wild_growth',
    'Wild Growth',
    'Convert 2 random tiles to green tiles',
    'green',
    5,
    {
      onActivate: (state: GameState) => {
        const board = state.board;
        const tiles = [];
        
        // Get all non-green, non-empty tiles
        for (let row = 0; row < board.length; row++) {
          for (let col = 0; col < board[row].length; col++) {
            if (board[row][col].color !== 'green' && board[row][col].color !== 'empty') {
              tiles.push({ row, col });
            }
          }
        }
        
        // Randomly select 2 tiles
        for (let i = 0; i < Math.min(2, tiles.length); i++) {
          const randomIndex = Math.floor(Math.random() * tiles.length);
          const { row, col } = tiles[randomIndex];
          
          // Remove the selected tile to avoid duplicates
          tiles.splice(randomIndex, 1);
          
          // Change the tile to green
          state.updateTile(row, col, { color: 'green' });
        }
        
        toast.success('Wild Growth converted 2 tiles to green!');
      }
    }
  ),
  vitality: createBlessing(
    'vitality',
    'Vitality',
    'Gain +15 health and +1 to green stat permanently',
    'green',
    7,
    [
      {
        health: 15,
        onActivate: (state: GameState) => {
          const player = state.currentPlayer;
          state[player].health = Math.min(100 + 15, state[player].health + 15);
          toast.success(`Vitality increased maximum health by 15!`);
        }
      },
      {
        colorStats: { green: 1 }
      }
    ]
  ),
  // Add item-inspired blessings
  rejuvenation: ITEM_INSPIRED_BLESSINGS.rejuvenation,
  resource_conversion: ITEM_INSPIRED_BLESSINGS.resource_conversion
};

export const YELLOW_BLESSINGS: Record<string, Blessing> = {
  solar_flare: createBlessing(
    'solar_flare',
    'Solar Flare',
    'Next match does 50% more damage',
    'yellow',
    4,
    createDamageMultiplierEffect(1.5, 1),
    1
  ),
  golden_touch: createBlessing(
    'golden_touch',
    'Golden Touch',
    'Your next 3 matches give double resources',
    'yellow',
    5,
    createResourceMultiplierEffect(2, 3),
    3
  ),
  sunbeam: createBlessing(
    'sunbeam',
    'Sunbeam',
    'Deal 6 damage and gain +1 to yellow stat permanently',
    'yellow',
    6,
    [
      createDamageEffect(6),
      {
        colorStats: { yellow: 1 }
      }
    ]
  ),
  // Add item-inspired blessings
  catalyst_blessing: ITEM_INSPIRED_BLESSINGS.catalyst_blessing,
  lucky_blessing: ITEM_INSPIRED_BLESSINGS.lucky_blessing
};

export const BLACK_BLESSINGS: Record<string, Blessing> = {
  void_grasp: createBlessing(
    'void_grasp',
    'Void Grasp',
    'Steal 3 of each resource from your opponent',
    'black',
    6,
    {
      onActivate: (state: GameState) => {
        const player = state.currentPlayer;
        const opponent = player === 'human' ? 'ai' : 'human';
        const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'black'];
        
        colors.forEach(color => {
          const stealAmount = Math.min(3, state[opponent].matchedColors[color]);
          state[opponent].matchedColors[color] -= stealAmount;
          state[player].matchedColors[color] += stealAmount;
        });
        
        toast.success('Void Grasp stole resources from your opponent!');
      }
    }
  ),
  shadow_shift: createBlessing(
    'shadow_shift',
    'Shadow Shift',
    'Gain an extra turn',
    'black',
    7,
    createExtraTurnEffect()
  ),
  dark_pact: createBlessing(
    'dark_pact',
    'Dark Pact',
    'Deal 10 damage to opponent, take 3 damage yourself, gain +2 to black stat',
    'black',
    8,
    [
      {
        onActivate: (state: GameState) => {
          const player = state.currentPlayer;
          const opponent = player === 'human' ? 'ai' : 'human';
          
          // Deal damage to opponent
          state[opponent].health = Math.max(0, state[opponent].health - 10);
          
          // Deal self-damage
          state[player].health = Math.max(0, state[player].health - 3);
          
          toast.success('Dark Pact dealt 10 damage to opponent and 3 damage to you!');
          
          if (state.emit) {
            state.emit('OnDamageTaken', {
              amount: 10,
              source: player,
              target: opponent,
              damageType: 'normal'
            });
          }
        }
      },
      {
        colorStats: { black: 2 }
      }
    ]
  )
};

// Basic weak blessings available to all colors
export const COMMON_BLESSINGS: Record<string, Blessing> = {
  minor_heal: createBlessing(
    'minor_heal',
    'Minor Heal',
    'Heal 5 health points',
    'green',
    2,
    createHealEffect(5)
  ),
  minor_damage: createBlessing(
    'minor_damage',
    'Minor Damage',
    'Deal 3 damage to opponent',
    'red',
    2,
    createDamageEffect(3)
  ),
  minor_defense: createBlessing(
    'minor_defense',
    'Minor Defense',
    'Gain +2 defense for 1 turn',
    'blue',
    2,
    createDefenseEffect(2, 1),
    1
  ),
  minor_boost: createBlessing(
    'minor_boost',
    'Minor Boost',
    'Gain +20% resource gain for 2 turns',
    'yellow',
    2,
    createResourceMultiplierEffect(1.2, 2),
    2
  ),
  minor_conversion: createBlessing(
    'minor_conversion',
    'Minor Conversion',
    'Convert 1 random tile to your primary color',
    'black',
    2,
    {
      onActivate: (state: GameState) => {
        const player = state.currentPlayer;
        const playerState = state[player];
        const primaryColor = getPrimaryColor(state, player);
        const board = state.board;
        const tiles = [];
        
        // Get all non-primary-color, non-empty tiles
        for (let row = 0; row < board.length; row++) {
          for (let col = 0; col < board[row].length; col++) {
            if (board[row][col].color !== primaryColor && board[row][col].color !== 'empty') {
              tiles.push({ row, col });
            }
          }
        }
        
        if (tiles.length > 0) {
          const randomIndex = Math.floor(Math.random() * tiles.length);
          const { row, col } = tiles[randomIndex];
          
          // Change the tile to the primary color
          state.updateTile(row, col, { color: primaryColor });
          toast.success(`Converted a tile to ${primaryColor}!`);
        } else {
          toast.success('No suitable tiles to convert.');
        }
      }
    }
  )
};

// Example of a reactive blessing that heals when damage is taken
export const REACTIVE_BLESSINGS: Record<string, Blessing> = {
  retribution: createBlessing(
    'retribution',
    'Retribution',
    'When you take damage, deal 3 damage to opponent',
    'red',
    5,
    {
      triggerType: 'OnDamageTaken',
      onTrigger: (state: GameState, event: GameEventPayload) => {
        const payload = event as any;
        if (payload.target !== state.currentPlayer) return; // Only trigger when we're the target
        
        const target = state.currentPlayer === 'human' ? 'ai' : 'human';
        const damage = 3;
        state[target].health = Math.max(0, state[target].health - damage);
        toast.success(`Retribution! Dealt ${damage} damage to opponent!`);
        
        if (state.emit) {
          state.emit('OnDamageDealt', {
            amount: damage,
            source: state.currentPlayer,
            target,
            damageType: 'normal'
          });
        }
      }
    }
  ),
  reactive_heal: createBlessing(
    'reactive_heal',
    'Reactive Heal',
    'When you match green tiles, heal 2 health',
    'green',
    4,
    {
      triggerType: 'OnMatch',
      onTrigger: (state: GameState, event: GameEventPayload) => {
        const matchEvent = event as any;
        if (matchEvent.player !== state.currentPlayer) return;
        
        // Check if any green tiles were matched
        if (matchEvent.colors && matchEvent.colors.green > 0) {
          const player = state.currentPlayer;
          const healAmount = 2;
          state[player].health = Math.min(100, state[player].health + healAmount);
          toast.success(`Reactive Heal! Healed for ${healAmount} health!`);
        }
      }
    }
  ),
  counter_defense: createBlessing(
    'counter_defense',
    'Counter Defense',
    'Gain +2 defense when your opponent deals damage to you',
    'blue',
    4,
    {
      triggerType: 'OnDamageTaken',
      onTrigger: (state: GameState, event: GameEventPayload) => {
        const payload = event as any;
        if (payload.target !== state.currentPlayer) return; // Only trigger when we're the target
        
        const player = state.currentPlayer;
        const defenseAmount = 2;
        state[player].defense += defenseAmount;
        toast.success(`Counter Defense! Gained ${defenseAmount} defense!`);
      },
      turnsRemaining: 3 // This effect lasts for 3 turns even though it triggers on damage
    },
    3
  )
};

// Combine all blessings into a single collection
export const ALL_BLESSINGS: Record<string, Blessing> = {
  ...RED_BLESSINGS,
  ...BLUE_BLESSINGS,
  ...GREEN_BLESSINGS,
  ...YELLOW_BLESSINGS,
  ...BLACK_BLESSINGS,
  ...COMMON_BLESSINGS,
  ...REACTIVE_BLESSINGS
};

// Function to get random blessings for each color
export const getRandomBlessingsForColors = (count: number = 5) => {
  const allBlessings = Object.values(ALL_BLESSINGS);
  const result: Blessing[] = [];
  
  // Ensure we get at least one blessing of each color
  const colors: Color[] = ['red', 'blue', 'green', 'yellow', 'black'];
  
  // Add one blessing of each color
  colors.forEach(color => {
    const colorBlessings = allBlessings.filter(blessing => blessing.color === color);
    if (colorBlessings.length > 0) {
      result.push(colorBlessings[Math.floor(Math.random() * colorBlessings.length)]);
    }
  });
  
  // Fill remaining slots with random blessings (if needed)
  while (result.length < count) {
    const randomBlessing = allBlessings[Math.floor(Math.random() * allBlessings.length)];
    // Avoid duplicates
    if (!result.some(b => b.id === randomBlessing.id)) {
      result.push(randomBlessing);
    }
  }
  
  return result;
}; 