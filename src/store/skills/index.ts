import { ClassSkill, Color } from '../types';
import { PYROMANCER_SKILLS, BLOOD_MAGE_SKILLS } from './red';
import { CRYOMANCER_SKILLS, STORM_MAGE_SKILLS } from './blue';
import { NATURE_WEAVER_SKILLS, ALCHEMIST_SKILLS } from './green';
import { TIME_WEAVER_SKILLS } from './yellow';
import { SHADOW_PRIEST_SKILLS } from './black';
import { NEUTRAL_SKILLS } from './neutral';
import { DUAL_COLOR_SKILLS } from './dual';

// Export all skills by class
export {
  PYROMANCER_SKILLS,
  CRYOMANCER_SKILLS,
  NATURE_WEAVER_SKILLS,
  BLOOD_MAGE_SKILLS,
  SHADOW_PRIEST_SKILLS,
  ALCHEMIST_SKILLS,
  STORM_MAGE_SKILLS,
  TIME_WEAVER_SKILLS,
  NEUTRAL_SKILLS,
  DUAL_COLOR_SKILLS
};

// Export the ClassSkill interface
export type { ClassSkill };

// Export all skills in a map for easy lookup
// Use type assertion to handle any potential type mismatches
export const ALL_SKILLS: Record<string, ClassSkill> = [
  ...PYROMANCER_SKILLS,
  ...CRYOMANCER_SKILLS,
  ...NATURE_WEAVER_SKILLS,
  ...BLOOD_MAGE_SKILLS,
  ...SHADOW_PRIEST_SKILLS,
  ...ALCHEMIST_SKILLS,
  ...STORM_MAGE_SKILLS,
  ...TIME_WEAVER_SKILLS,
  ...NEUTRAL_SKILLS,
  ...DUAL_COLOR_SKILLS
].reduce((acc, skill) => {
  // Ensure all required properties are present
  if (skill.secondaryColor === undefined) {
    console.warn(`Skill ${skill.id} is missing secondaryColor, using primary color as fallback`);
    (skill as any).secondaryColor = skill.primaryColor;
  }
  
  acc[skill.id] = skill as ClassSkill;
  return acc;
}, {} as Record<string, ClassSkill>); 