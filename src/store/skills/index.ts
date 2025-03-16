import { ClassSkill } from './types';
import { PYROMANCER_SKILLS, BLOOD_MAGE_SKILLS } from './red';
import { CRYOMANCER_SKILLS, STORM_MAGE_SKILLS } from './blue';
import { NATURE_WEAVER_SKILLS, ALCHEMIST_SKILLS } from './green';
import { TIME_WEAVER_SKILLS } from './yellow';
import { SHADOW_PRIEST_SKILLS } from './black';

// Export all skills by class
export {
  PYROMANCER_SKILLS,
  CRYOMANCER_SKILLS,
  NATURE_WEAVER_SKILLS,
  BLOOD_MAGE_SKILLS,
  SHADOW_PRIEST_SKILLS,
  ALCHEMIST_SKILLS,
  STORM_MAGE_SKILLS,
  TIME_WEAVER_SKILLS
};

// Export the ClassSkill interface
export type { ClassSkill };

// Export all skills in a map for easy lookup
export const ALL_SKILLS: Record<string, ClassSkill> = [
  ...PYROMANCER_SKILLS,
  ...CRYOMANCER_SKILLS,
  ...NATURE_WEAVER_SKILLS,
  ...BLOOD_MAGE_SKILLS,
  ...SHADOW_PRIEST_SKILLS,
  ...ALCHEMIST_SKILLS,
  ...STORM_MAGE_SKILLS,
  ...TIME_WEAVER_SKILLS
].reduce((acc, skill) => {
  acc[skill.id] = skill;
  return acc;
}, {} as Record<string, ClassSkill>); 