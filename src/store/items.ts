import { Item, Color, GameState, Effect } from "./types";
import { debugLog } from "./slices/debug";
import { toast } from "react-hot-toast";
import { GameEventPayload } from "./slices/eventSlice";

// Helper function to create items
const createItem = (
  id: string,
  name: string,
  description: string,
  rarity: Item["rarity"],
  slot: Item["slot"],
  effects: Effect[] | Effect
): Item => ({
  id,
  name,
  description,
  rarity,
  slot,
  effects: Array.isArray(effects) ? effects : [effects]
});

// Weapons (primarily provide color stats)
export const WEAPONS: Record<string, Item> = {
  wooden_staff: createItem(
    'wooden_staff',
    'Wooden Staff',
    'A basic wooden staff that enhances magical power.',
    'common',
    'weapon',
    {
      colorStats: { red: 1, blue: 1 }
    }
  ),
  fire_wand: createItem(
    'fire_wand',
    'Fire Wand',
    'A wand imbued with fire magic.',
    'uncommon',
    'weapon',
    {
      colorStats: { red: 2 }
    }
  ),
  frost_rod: createItem(
    'frost_rod',
    'Frost Rod',
    'A rod that channels the power of ice.',
    'uncommon',
    'weapon',
    {
      colorStats: { blue: 2 }
    }
  ),
  nature_staff: createItem(
    'nature_staff',
    'Nature Staff',
    'A staff made from ancient wood with nature energy.',
    'uncommon',
    'weapon',
    {
      colorStats: { green: 2 }
    }
  ),
  sunlight_wand: createItem(
    'sunlight_wand',
    'Sunlight Wand',
    'A wand that harnesses the power of the sun.',
    'uncommon',
    'weapon',
    {
      colorStats: { yellow: 2 }
    }
  ),
  void_staff: createItem(
    'void_staff',
    'Void Staff',
    'A staff that channels dark energy.',
    'uncommon',
    'weapon',
    {
      colorStats: { black: 2 }
    }
  ),
  elemental_scepter: createItem(
    'elemental_scepter',
    'Jack of All Trades Scepter',
    'A scepter that enhances all elemental magics.',
    'rare',
    'weapon',
    {
      colorStats: { red: 1, blue: 1, green: 1, yellow: 1, black: 1 }
    }
  ),
  staff_of_flames: createItem(
    'staff_of_flames',
    'Staff of Flames',
    'A powerful staff that boosts fire magic and occasionally ignites tiles.',
    'epic',
    'weapon',
    [
      {
        colorStats: { red: 3 }
      },
      {
        triggerType: 'StartOfTurn',
        onTrigger: (state: GameState) => {
          const player = state.currentPlayer;
          if (Math.random() < 0.2) { // 20% chance
            // Find random tile to ignite
            const board = state.board;
            const validTiles: {row: number, col: number}[] = [];
            
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
              toast.success(`${player === 'human' ? 'Your' : 'Enemy'} Staff of Flames ignited a tile!`);
              debugLog('ITEM_EFFECT', 'Staff of Flames ignited a tile', randomTile);
            }
            return true;
          }
          return false;
        }
      }
    ]
  )
};

// Armor (primarily provides defense and health)
export const ARMOR: Record<string, Item> = {
  cloth_robe: createItem(
    'cloth_robe',
    'Cloth Robe',
    'A basic cloth robe that provides minimal protection.',
    'common',
    'armor',
    {
      defense: 1
    }
  ),
  leather_armor: createItem(
    'leather_armor',
    'Leather Armor',
    'Light armor made of leather that offers decent protection.',
    'uncommon',
    'armor',
    {
      defense: 2
    }
  ),
  chainmail: createItem(
    'chainmail',
    'Chainmail',
    'Medium armor made of interlocking metal rings.',
    'rare',
    'armor',
    {
      defense: 3,
      health: 10
    }
  ),
  fire_resistant_cloak: createItem(
    'fire_resistant_cloak',
    'Fire-Resistant Cloak',
    'A cloak that provides protection against fire damage.',
    'uncommon',
    'armor',
    {
      defense: 1,
      colorStats: { red: 1 }
    }
  ),
  ice_armor: createItem(
    'ice_armor',
    'Ice Armor',
    'Armor made of magical ice that protects against physical attacks.',
    'rare',
    'armor',
    [
      {
        defense: 3,
        colorStats: { blue: 1 }
      },
      {
        onDamageTaken: (state: GameState, damage: number) => {
          if (Math.random() < 0.2) { // 20% chance
            toast.success('Ice Armor reduced damage by 50%!');
            return Math.floor(damage * 0.5);
          }
          return damage;
        }
      }
    ]
  ),
  guardian_plate: createItem(
    'guardian_plate',
    'Guardian Plate',
    'Heavy armor that significantly reduces damage taken.',
    'epic',
    'armor',
    {
      defense: 5,
      health: 20
    }
  )
};

// Accessories (provide resource bonuses and special effects)
export const ACCESSORIES: Record<string, Item> = {
  ruby_pendant: createItem(
    'ruby_pendant',
    'Ruby Pendant',
    'A pendant with a ruby that enhances fire energy.',
    'uncommon',
    'accessory',
    {
      resourceBonus: { red: 1 }
    }
  ),
  sapphire_amulet: createItem(
    'sapphire_amulet',
    'Sapphire Amulet',
    'An amulet with a sapphire that enhances water energy.',
    'uncommon',
    'accessory',
    {
      resourceBonus: { blue: 1 }
    }
  ),
  emerald_necklace: createItem(
    'emerald_necklace',
    'Emerald Necklace',
    'A necklace with an emerald that enhances nature energy.',
    'uncommon',
    'accessory',
    {
      resourceBonus: { green: 1 }
    }
  ),
  amber_charm: createItem(
    'amber_charm',
    'Amber Charm',
    'A charm made of amber that enhances light energy.',
    'uncommon',
    'accessory',
    {
      resourceBonus: { yellow: 1 }
    }
  ),
  obsidian_talisman: createItem(
    'obsidian_talisman',
    'Obsidian Talisman',
    'A talisman made of obsidian that enhances dark energy.',
    'uncommon',
    'accessory',
    {
      resourceBonus: { black: 1 }
    }
  ),
  mana_crystal: createItem(
    'mana_crystal',
    'Mana Crystal',
    'A crystal that amplifies magical resource generation.',
    'rare',
    'accessory',
    {
      resourceBonus: { red: 1, blue: 1, green: 1, yellow: 1, black: 1 }
    }
  ),
  lucky_charm: createItem(
    'lucky_charm',
    'Lucky Charm',
    'A charm that occasionally grants extra resources on matches.',
    'rare',
    'accessory',
    [
      {}, // Empty first effect
      {
        triggerType: 'OnMatch',
        onTrigger: (state: GameState, event: GameEventPayload) => {
          if (Math.random() < 0.3) { // 30% chance
            const matchEvent = event as any;
            if (!matchEvent.colors) return false;
            
            const color = Object.keys(matchEvent.colors).reduce((a, b) => 
              matchEvent.colors[a as Color] > matchEvent.colors[b as Color] ? a : b
            ) as Color;
            
            const player = state.currentPlayer;
            const extraAmount = 1;
            state[player].matchedColors[color] += extraAmount;
            toast.success(`Lucky Charm: Gained an extra ${color} resource!`);
            debugLog('ITEM_EFFECT', 'Lucky Charm provided extra resource', { color, amount: extraAmount });
            return true;
          }
          return false;
        }
      }
    ]
  )
};

// Trinkets (provide unique and powerful effects)
export const TRINKETS: Record<string, Item> = {
  stone_of_rejuvenation: createItem(
    'stone_of_rejuvenation',
    'Stone of Rejuvenation',
    'A stone that regenerates health at the start of each turn.',
    'uncommon',
    'trinket',
    {
      onTurnStart: (state: GameState) => {
        const player = state.currentPlayer;
        const healAmount = 3;
        state[player].health = Math.min(100, state[player].health + healAmount);
        toast.success(`Stone of Rejuvenation healed you for ${healAmount} health!`);
      }
    }
  ),
  phoenix_feather: createItem(
    'phoenix_feather',
    'Phoenix Feather',
    'A rare feather that can save you from defeat once.',
    'epic',
    'trinket',
    [
      {}, // Empty first effect
      {
        triggerType: 'OnDamageTaken',
        onTrigger: (state: GameState, event: GameEventPayload) => {
          const damageEvent = event as any;
          if (!damageEvent.amount) return false;
          
          const player = state.currentPlayer;
          const damage = damageEvent.amount;
          
          if (state[player].health <= damage && damage > 0) {
            state[player].health = 20; // Set health to 20 instead of dying
            
            // Find item in inventory and remove it (one-time use)
            const itemIndex = state[player].inventory.findIndex((item: Item) => item.id === 'phoenix_feather');
            if (itemIndex >= 0) {
              state[player].inventory.splice(itemIndex, 1);
            }
            state[player].equippedItems.trinket = null;
            
            toast.success('Phoenix Feather saved you from defeat!');
            debugLog('ITEM_EFFECT', 'Phoenix Feather prevented defeat', { player });
            return true; // No damage taken
          }
          return false;
        }
      }
    ]
  ),
  elemental_catalyst: createItem(
    'elemental_catalyst',
    'Elemental Catalyst',
    'A powerful catalyst that enhances all elemental damage.',
    'epic',
    'trinket',
    [
      {
        colorStats: { red: 1, blue: 1, green: 1, yellow: 1, black: 1 }
      },
      {
        onMatch: (state: GameState, color: Color) => {
          // Adds a temporary damage multiplier for the next turn
          const player = state.currentPlayer;
          state[player].statusEffects.push({
            damageMultiplier: 1.2,
            resourceMultiplier: 1,
            turnsRemaining: 1
          });
          toast.success('Elemental Catalyst: Damage increased for next turn!');
          debugLog('ITEM_EFFECT', 'Elemental Catalyst applied damage boost', { player });
        }
      }
    ]
  ),
  resource_prism: createItem(
    'resource_prism',
    'Resource Prism',
    'A magical prism that converts resources into health.',
    'legendary',
    'trinket',
    {
      onTurnEnd: (state) => {
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
              
              toast.success(`Resource Prism converted ${resourceDesc} into ${healAmount} health!`);
              debugLog('ITEM_EFFECT', 'Resource Prism converted resources to health', {
                player,
                consumed,
                healAmount
              });
            }
          }
        }
      }
    }
  )
};

// Combine all items into a single collection
export const ALL_ITEMS: Record<string, Item> = {
  ...WEAPONS,
  ...ARMOR,
  ...ACCESSORIES,
  ...TRINKETS
}; 