import {ClassSkill} from '../types';
import {adaptToLegacySkill, Effects} from './effects/effects';
import {StatusEffectBuilder} from './effects/statusBuilder';

// Define skills using the effects system
const createFireballSkill = (): ClassSkill => adaptToLegacySkill({
  id: 'fireball',
  name: 'Fireball',
  description: 'Choose a red tile to create an explosion, dealing 5 damage per red tile destroyed',
  cost: { red: 4, yellow: 3 },
  primaryColor: 'red',
  secondaryColor: 'yellow',
  targetColor: 'red',
  requiresTarget: true,
  effects: [Effects.markTilesInPattern('diamond', 2), Effects.dealDamagePerColor('red', 5)]
});

const createFierySoulSkill = (): ClassSkill => adaptToLegacySkill({
  id: 'fiery_soul',
  name: 'Fiery Soul',
  description: 'Deal double damage and gain 1 yellow mana for each red tile matched for 3 turns',
  cost: { red: 5 },
  primaryColor: 'red',
  secondaryColor: 'yellow',
  requiresTarget: false,
  effect: [ new StatusEffectBuilder(3).addDamageMultiplier(2).addResourceBonus('red', 'yellow', 1).buildSkillEffect()]
});

const createInfernoSkill = (): ClassSkill => adaptToLegacySkill({
  id: 'inferno',
  name: 'Inferno',
  description: 'Ignite 5 random tiles on the board. Ignited tiles deal 3 extra damage when matched',
  cost: {},
  primaryColor: 'red',
  secondaryColor: 'yellow',
  requiresTarget: false,
  effects: [
    Effects.ignite(5)
  ]
});

// Create the skills array
export const PYROMANCER_SKILLS: ClassSkill[] = [
  createFierySoulSkill(),
  createFireballSkill(),
  createInfernoSkill()
];

// Blood Mage Skills (red primary)
const createBloodSurgeSkill = (): ClassSkill => adaptToLegacySkill({
  id: 'blood_surge',
  name: 'Blood Surge',
  description: 'Take 5 damage to enhance next match damage',
  cost: { red: 3, blue: 3 },
  primaryColor: 'red',
  secondaryColor: 'blue',
  requiresTarget: false,
  effect: Effects.bloodSacrifice(5, 2.5, 2)
});

const createFrostFireSkill = (): ClassSkill => adaptToLegacySkill({
  id: 'frost_fire',
  name: 'Frost Fire',
  description: 'Red matches freeze tiles, blue matches ignite them',
  cost: { red: 4, blue: 4 },
  primaryColor: 'red',
  secondaryColor: 'blue',
  requiresTarget: false,
  effects: [
    Effects.addStatusEffect({
      damageMultiplier: 2,
      resourceMultiplier: 2,
      turnsRemaining: 3
    }),
  ]
});

export const BLOOD_MAGE_SKILLS: ClassSkill[] = [
  createBloodSurgeSkill(),
  createFrostFireSkill()
]; 