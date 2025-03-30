import { StatusEffect, Color, GameState, PlayerType } from '../../types';
import { debugLog } from '../../slices/debug';
import { EffectDefinition } from './effects';

/**
 * A builder class for creating StatusEffect objects with a fluent API.
 * Allows chaining multiple effect modifiers together.
 */
export class StatusEffectBuilder {
  private effect: StatusEffect;

  /**
   * Create a new StatusEffectBuilder with default values
   * @param duration How many turns the effect should last
   */
  constructor(duration: number) {
    // Initialize with all colors set to 0
    const fullColorStats: Record<Color, number> = {
      red: 0,
      green: 0, 
      blue: 0,
      yellow: 0,
      black: 0,
      empty: 0
    };
    
    this.effect = {
      damageMultiplier: 1, // Default is no multiplier (1x)
      resourceMultiplier: 1, // Default is no multiplier (1x)
      turnsRemaining: duration,
      colorStatBonus: fullColorStats, // Initialize with all zeros
    };
  }

  /**
   * Add a damage multiplier to the status effect
   * @param multiplier The damage multiplier to apply
   * @returns The builder instance for chaining
   */
  addDamageMultiplier(multiplier: number): StatusEffectBuilder {
    this.effect.damageMultiplier = multiplier;
    return this;
  }

  /**
   * Add a resource multiplier to the status effect
   * @param multiplier The resource multiplier to apply
   * @returns The builder instance for chaining
   */
  addResourceMultiplier(multiplier: number): StatusEffectBuilder {
    this.effect.resourceMultiplier = multiplier;
    return this;
  }

  /**
   * Add a resource bonus when matching a specific color
   * @param matchColor The color that triggers the bonus when matched
   * @param bonusColor The color resource to receive as bonus
   * @param amount The amount of bonus resource to receive
   * @returns The builder instance for chaining
   */
  addResourceBonus(matchColor: Color, bonusColor: Color, amount: number): StatusEffectBuilder {
    this.effect.resourceBonus = {
      matchColor,
      bonusColor,
      bonusAmount: amount
    };
    return this;
  }

  /**
   * Add a mana conversion effect
   * @param fromColor The source color to convert from
   * @param toColor The target color to convert to
   * @param ratio The conversion ratio (e.g., 0.5 means 50% conversion)
   * @returns The builder instance for chaining
   */
  addManaConversion(fromColor: Color, toColor: Color, ratio: number): StatusEffectBuilder {
    this.effect.manaConversion = {
      from: fromColor,
      to: toColor,
      ratio
    };
    return this;
  }

  /**
   * Add skill damage modifiers
   * @param multiplier Optional damage multiplier specific to skills
   * @param reduction Optional flat damage reduction for skills
   * @returns The builder instance for chaining
   */
  addSkillDamageModifiers(multiplier?: number, reduction?: number): StatusEffectBuilder {
    if (multiplier !== undefined) {
      this.effect.skillDamageMultiplier = multiplier;
    }
    
    if (reduction !== undefined) {
      this.effect.skillDamageReduction = reduction;
    }
    
    return this;
  }

  /**
   * Add a tile conversion effect
   * @param count The number of tiles to convert
   * @param color The color to convert tiles to
   * @returns The builder instance for chaining
   */
  addConvertTiles(count: number, color: Color): StatusEffectBuilder {
    this.effect.convertTiles = {
      count,
      color
    };
    return this;
  }

  /**
   * Add an onExpire callback function
   * This will chain with any existing onExpire function
   * @param callback The function to call when the effect expires
   * @returns The builder instance for chaining
   */
  addOnExpire(callback: () => void): StatusEffectBuilder {
    const existingCallback = this.effect.onExpire;
    
    if (existingCallback) {
      // Chain the callbacks together
      this.effect.onExpire = () => {
        existingCallback();
        callback();
      };
    } else {
      this.effect.onExpire = callback;
    }
    
    return this;
  }

  /**
   * Add or increase color stat bonuses
   * @param colorBonuses Record of colors and their stat bonus values
   * @returns The builder instance for chaining
   */
  addColorStatBonus(colorBonuses: Partial<Record<Color, number>>): StatusEffectBuilder {
    // If colorStatBonus is not initialized, initialize it with zeros
    if (!this.effect.colorStatBonus) {
      this.effect.colorStatBonus = {
        red: 0,
        green: 0, 
        blue: 0,
        yellow: 0,
        black: 0,
        empty: 0
      };
    }
    
    // Add or increase values for each color
    Object.entries(colorBonuses).forEach(([color, value]) => {
      if (value !== undefined) {
        const typedColor = color as Color;
        this.effect.colorStatBonus![typedColor] += value;
      }
    });
    
    return this;
  }

  /**
   * Add an extra turn flag to the status effect
   * @returns The builder instance for chaining
   */
  addExtraTurn(): StatusEffectBuilder {
    this.effect.extraTurn = true;
    return this;
  }

  /**
   * Add an onTurnStart callback to the status effect
   * @param callback The callback to execute at the start of each turn
   * @returns The builder instance for chaining
   */
  addOnTurnStart(callback: (state: GameState, player: PlayerType) => void): StatusEffectBuilder {
    this.effect.onTurnStart = callback;
    return this;
  }

  /**
   * Build and return the final StatusEffect object
   * @returns The complete StatusEffect
   */
  build(): StatusEffect {
    // Log the created effect for debugging
    debugLog('STATUS_BUILDER', 'Built status effect', this.effect);
    return this.effect;
  }

  /**
   * Builds a complete EffectDefinition using the current status effect
   * This lets you directly use the builder to create a game effect
   * 
   * @param customDescription Optional custom description for the effect
   * @param target Optional target for the effect: 'self' (default), 'opponent', or 'both'
   * @returns An EffectDefinition that applies the built status effect
   */
  buildSkillEffect(customDescription?: string, target: 'self' | 'opponent' | 'both' = 'self'): EffectDefinition {
    // Create a description based on the effect properties
    const description = customDescription || this.generateDescription();
    
    // Create description suffix based on target
    let targetSuffix = '';
    if (target === 'opponent') {
      targetSuffix = ' (applied to opponent)';
    } else if (target === 'both') {
      targetSuffix = ' (applied to both players)';
    }
    
    // Build the effect definition
    return {
      type: 'status',
      description: description + targetSuffix,
      execute: async (state: GameState, player?: PlayerType) => {
        const currentPlayer = player || state.currentPlayer;
        const opponent = currentPlayer === 'human' ? 'ai' : 'human';
        const effect = this.build();
        
        // Apply the effect based on the target parameter
        if (target === 'self' || target === 'both') {
          state[currentPlayer].statusEffects.push({ ...effect });
          debugLog('EFFECT', `Added status effect to ${currentPlayer}`, effect);
        }
        
        if (target === 'opponent' || target === 'both') {
          state[opponent].statusEffects.push({ ...effect });
          debugLog('EFFECT', `Added status effect to ${opponent}`, effect);
        }
        
        return effect;
      }
    };
  }

  /**
   * Generate a human-readable description based on the current effect properties
   * @returns A string describing the effect
   */
  private generateDescription(): string {
    const parts: string[] = [];
    const duration = this.effect.turnsRemaining;
    
    // Add damage multiplier description
    if (this.effect.damageMultiplier !== 1) {
      const multiplierText = this.effect.damageMultiplier > 1 
        ? `${this.effect.damageMultiplier}x damage` 
        : `${Math.round((1 - this.effect.damageMultiplier) * 100)}% less damage`;
      parts.push(`Deal ${multiplierText}`);
    }
    
    // Add resource multiplier description
    if (this.effect.resourceMultiplier !== 1) {
      const multiplierText = this.effect.resourceMultiplier > 1 
        ? `${this.effect.resourceMultiplier}x resources` 
        : `${Math.round((1 - this.effect.resourceMultiplier) * 100)}% less resources`;
      parts.push(`Gain ${multiplierText}`);
    }
    
    // Add resource bonus description
    if (this.effect.resourceBonus) {
      const { matchColor, bonusColor, bonusAmount } = this.effect.resourceBonus;
      parts.push(`Gain ${bonusAmount} ${bonusColor} when matching ${matchColor}`);
    }
    
    // Add mana conversion description
    if (this.effect.manaConversion) {
      const { from, to, ratio } = this.effect.manaConversion;
      const percentage = Math.round(ratio * 100);
      parts.push(`Convert ${percentage}% of ${from} to ${to}`);
    }
    
    // Add skill damage modifiers description
    if (this.effect.skillDamageMultiplier !== undefined || this.effect.skillDamageReduction !== undefined) {
      if (this.effect.skillDamageMultiplier !== undefined) {
        const multiplierText = this.effect.skillDamageMultiplier > 1 
          ? `${this.effect.skillDamageMultiplier}x skill damage` 
          : `${Math.round((1 - this.effect.skillDamageMultiplier) * 100)}% less skill damage`;
        parts.push(`Deal ${multiplierText}`);
      }
      
      if (this.effect.skillDamageReduction !== undefined && this.effect.skillDamageReduction > 0) {
        parts.push(`Reduce skill damage by ${this.effect.skillDamageReduction}`);
      }
    }
    
    // Add color stat bonuses description
    if (this.effect.colorStatBonus && Object.keys(this.effect.colorStatBonus).length > 0) {
      const bonuses = Object.entries(this.effect.colorStatBonus)
        .filter(([_, value]) => value !== 0)
        .map(([color, value]) => value > 0 ? `+${value} ${color}` : `${value} ${color}`)
        .join(', ');
      
      if (bonuses) {
        parts.push(`Color stats: ${bonuses}`);
      }
    }
    
    // Add convert tiles description
    if (this.effect.convertTiles) {
      parts.push(`Convert ${this.effect.convertTiles.count} tiles to ${this.effect.convertTiles.color}`);
    }
    
    // Add extra turn description
    if (this.effect.extraTurn) {
      parts.push('Gain an extra turn');
    }
    
    // Combine all parts and add duration
    let description = parts.join('. ');
    
    // Add duration if parts exist
    if (parts.length > 0) {
      description += ` for ${duration} turn${duration !== 1 ? 's' : ''}`;
    } else {
      description = `Status effect lasting ${duration} turn${duration !== 1 ? 's' : ''}`;
    }
    
    return description;
  }
} 