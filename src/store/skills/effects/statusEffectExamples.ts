import { StatusEffectBuilder } from './statusBuilder';
import { Color, StatusEffect } from '../../types';
import { debugLog } from '../../slices/debug';
import { EffectDefinition } from './effects';


/**
 * Examples demonstrating how to use the StatusEffectBuilder to create
 * various status effects for the game.
 */

// Example 1: Basic damage multiplier that lasts 3 turns
export function createBasicDamageMultiplier(multiplier: number = 1.5, duration: number = 3): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(multiplier)
    .build();
}

// Example 2: Complex effect - Fire Aura that gives damage bonus and converts blue mana to red
export function createFireAura(duration: number = 3): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(1.5)
    .addResourceMultiplier(1.2)
    .addManaConversion('blue', 'red', 0.5)
    .addColorStatBonus({ red: 2, yellow: 1 })
    .addOnExpire(() => {
      debugLog('STATUS_EFFECT', 'Fire aura has expired');
    })
    .build();
}

// Example 3: Frost Shield - provides damage reduction and freezes random tiles on expiration
export function createFrostShield(duration: number = 2): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addSkillDamageModifiers(0.5, 5) // Take half skill damage and reduce by 5
    .addColorStatBonus({ blue: 3 })
    .addOnExpire(() => {
      debugLog('STATUS_EFFECT', 'Frost shield expired, freezing tiles');
      // Note: In a real implementation, you would need to access the game state
      // to freeze tiles when the effect expires. This is just for demonstration.
    })
    .build();
}

// Example 4: Resource conversion effect - change one resource type to another
export function createResourceConverter(
  fromColor: Color, 
  toColor: Color, 
  ratio: number = 0.75, 
  duration: number = 2
): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addManaConversion(fromColor, toColor, ratio)
    .build();
}

// Example 5: Berserker Rage - multi-effect status that grants bonuses but has a cost
export function createBerserkerRage(duration: number = 3): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(2.0) // Double damage
    .addResourceMultiplier(0.5) // But half resources
    .addColorStatBonus({ red: 5, green: -2 }) // Boost red but reduce green
    .addOnExpire(() => {
      debugLog('STATUS_EFFECT', 'Berserker rage has subsided');
    })
    .build();
}

// Example 6: Strategic Blessing - gains extra turns and converts tiles
export function createStrategicBlessing(duration: number = 1): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addExtraTurn() // Get an extra turn
    .addConvertTiles(3, 'green') // Convert 3 random tiles to green
    .addResourceBonus('green', 'blue', 2) // Get blue mana when matching green
    .build();
}

// Example 7: Combining multiple effects into a single complex status
export function createComplexStatus(duration: number = 4): StatusEffect {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(1.3)
    .addResourceMultiplier(1.3)
    .addSkillDamageModifiers(1.5, 0)
    .addResourceBonus('yellow', 'red', 2)
    .addColorStatBonus({ 
      red: 2, 
      blue: 2, 
      green: 2, 
      yellow: 2 
    })
    .addOnExpire(() => {
      debugLog('STATUS_EFFECT', 'Complex blessing has expired');
    })
    .build();
}

// NEW EXAMPLE: Creating an effect definition directly
// This creates an EffectDefinition that can be used directly in skills
export function createFrostArmorSkillEffect(): EffectDefinition {
  return new StatusEffectBuilder(3)
    .addSkillDamageModifiers(0.7, 3) // Take 30% less skill damage and reduce by 3 flat
    .addColorStatBonus({ blue: 2, green: 1 })
    .addResourceBonus('blue', 'green', 1)
    .buildSkillEffect('Frost Armor: Reduces skill damage and converts blue matches to green');
}

// Creating a flexible skill effect with parameters
export function createEmpowermentSkillEffect(
  color: Color, 
  statBonus: number = 3, 
  duration: number = 2
): EffectDefinition {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(1.3)
    .addColorStatBonus({ [color]: statBonus })
    .addResourceMultiplier(1.2)
    .buildSkillEffect(`${color.charAt(0).toUpperCase() + color.slice(1)} Empowerment`);
}

// Example of creating a fully dynamic effect with a partial StatusEffect
export function createCustomStatusEffect(
  duration: number,
  partialEffect: Partial<StatusEffect> = {},
  customDescription?: string,
  target: 'self' | 'opponent' | 'both' = 'self'
): EffectDefinition {
  const builder = new StatusEffectBuilder(duration);
  
  // Apply damage multiplier if provided
  if (partialEffect.damageMultiplier !== undefined) {
    builder.addDamageMultiplier(partialEffect.damageMultiplier);
  }
  
  // Apply resource multiplier if provided
  if (partialEffect.resourceMultiplier !== undefined) {
    builder.addResourceMultiplier(partialEffect.resourceMultiplier);
  }
  
  // Apply color stat bonuses if provided
  if (partialEffect.colorStatBonus) {
    // Need to handle partial color stats - convert to a form the builder expects
    const colors: Color[] = ['red', 'green', 'blue', 'yellow', 'black', 'empty'];
    const completeColorStats: Record<Color, number> = {} as Record<Color, number>;
    
    // Initialize all colors to 0
    colors.forEach(color => {
      completeColorStats[color] = 0;
    });
    
    // Apply the provided color stats
    Object.entries(partialEffect.colorStatBonus).forEach(([color, value]) => {
      const typedColor = color as Color;
      if (value !== undefined) {
        completeColorStats[typedColor] = value;
      }
    });
    
    builder.addColorStatBonus(completeColorStats);
  }
  
  // Apply resource bonus if provided
  if (partialEffect.resourceBonus) {
    builder.addResourceBonus(
      partialEffect.resourceBonus.matchColor,
      partialEffect.resourceBonus.bonusColor,
      partialEffect.resourceBonus.bonusAmount
    );
  }
  
  // Apply mana conversion if provided
  if (partialEffect.manaConversion) {
    builder.addManaConversion(
      partialEffect.manaConversion.from,
      partialEffect.manaConversion.to,
      partialEffect.manaConversion.ratio
    );
  }
  
  // Apply skill damage modifiers if provided
  if (partialEffect.skillDamageMultiplier !== undefined || partialEffect.skillDamageReduction !== undefined) {
    builder.addSkillDamageModifiers(
      partialEffect.skillDamageMultiplier,
      partialEffect.skillDamageReduction
    );
  }
  
  // Apply convert tiles if provided
  if (partialEffect.convertTiles) {
    builder.addConvertTiles(
      partialEffect.convertTiles.count,
      partialEffect.convertTiles.color
    );
  }
  
  // Apply extra turn if provided
  if (partialEffect.extraTurn) {
    builder.addExtraTurn();
  }
  
  // Apply onExpire callback if provided
  if (partialEffect.onExpire) {
    builder.addOnExpire(partialEffect.onExpire);
  }
  
  return builder.buildSkillEffect(customDescription, target);
}

// Example of creating a debuff effect that targets the opponent
export function createWeaknessDebuff(duration: number = 2): EffectDefinition {
  return new StatusEffectBuilder(duration)
    .addDamageMultiplier(0.7) // Opponent deals 30% less damage
    .addResourceMultiplier(0.8) // Opponent gets 20% less resources
    .addColorStatBonus({ red: -2, blue: -2 }) // Reduce opponent's stats
    .buildSkillEffect('Weakness curse', 'opponent');
}

// Example of creating an area effect that applies to both players
export function createGlobalStatusEffect(duration: number = 2): EffectDefinition {
  return new StatusEffectBuilder(duration)
    .addResourceBonus('red', 'blue', 1)
    .addSkillDamageModifiers(1.2) // Both players deal more skill damage
    .buildSkillEffect('Arcane field', 'both');
}

// Example of a powerful revenge effect that hurts the player but damages the opponent more
export function createRevengeEffect(): EffectDefinition {
  // Create self effect (takes damage but gains resources)
  const selfEffect = new StatusEffectBuilder(2)
    .addDamageMultiplier(0.8) // Take more damage
    .addResourceMultiplier(1.5) // But gain more resources
    .buildSkillEffect('Revenge: Self sacrifice', 'self');
    
  // Create opponent effect (deals less damage and takes more)
  const opponentEffect = new StatusEffectBuilder(3)
    .addDamageMultiplier(0.6) // Opponent deals less damage
    .addSkillDamageModifiers(0.5) // Opponent skills are half as effective
    .buildSkillEffect('Revenge: Curse of vulnerability', 'opponent');
    
  // We'll need to combine these effects at a higher level when defining the skill
  return selfEffect; // This is just a placeholder, normally you'd combine both effects
}

// Example usage of the simplified createCustomStatusEffect function
export function createExampleCustomEffect(): EffectDefinition {
  // Create a simple custom effect with partial information
  return createCustomStatusEffect(3, {
    damageMultiplier: 1.5,
    resourceMultiplier: 1.2,
    // TypeScript requires us to cast this to satisfy the interface
    colorStatBonus: { 
      red: 2, 
      blue: 1, 
      green: 0,
      yellow: 0,
      black: 0,
      empty: 0
    },
    extraTurn: true
  }, 'Power Surge', 'self');
}

// Another example showing how to create a debuff with partial stats
export function createSimpleDebuff(): EffectDefinition {
  return createCustomStatusEffect(2, {
    damageMultiplier: 0.8, // 20% less damage
    // TypeScript requires us to cast this to satisfy the interface
    colorStatBonus: { 
      red: -1, 
      blue: -1,
      green: 0,
      yellow: 0,
      black: 0,
      empty: 0 
    },
    resourceMultiplier: 0.75 // 25% less resources
  }, 'Weakness', 'opponent');
} 