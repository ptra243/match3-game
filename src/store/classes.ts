import { Color } from './types';
import { StateCreator } from 'zustand';
import { GameState } from './types';
import { toast } from 'react-hot-toast';
import { 
  ClassSkill,
  PYROMANCER_SKILLS,
  CRYOMANCER_SKILLS,
  NATURE_WEAVER_SKILLS,
  BLOOD_MAGE_SKILLS,
  SHADOW_PRIEST_SKILLS,
  ALCHEMIST_SKILLS,
  STORM_MAGE_SKILLS,
  TIME_WEAVER_SKILLS
} from './skills';

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  primaryColor: Color;
  secondaryColor: Color;
  defaultSkills: string[]; // Skill IDs
}

export const CLASSES: Record<string, CharacterClass> = {
  pyromancer: {
    id: 'pyromancer',
    name: 'Pyromancer',
    description: 'Masters of explosive damage and combo building',
    primaryColor: 'red',
    secondaryColor: 'yellow',
    defaultSkills: PYROMANCER_SKILLS.map(skill => skill.id)
  },
  cryomancer: {
    id: 'cryomancer',
    name: 'Cryomancer',
    description: 'Masters of control and resource generation',
    primaryColor: 'blue',
    secondaryColor: 'yellow',
    defaultSkills: CRYOMANCER_SKILLS.map(skill => skill.id)
  },
  natureWeaver: {
    id: 'natureWeaver',
    name: 'Nature Weaver',
    description: 'Masters of growth and prosperity',
    primaryColor: 'green',
    secondaryColor: 'yellow',
    defaultSkills: NATURE_WEAVER_SKILLS.map(skill => skill.id)
  },
  bloodMage: {
    id: 'bloodMage',
    name: 'Blood Mage',
    description: 'Masters of sacrifice and power',
    primaryColor: 'red',
    secondaryColor: 'blue',
    defaultSkills: BLOOD_MAGE_SKILLS.map(skill => skill.id)
  },
  shadowPriest: {
    id: 'shadowPriest',
    name: 'Shadow Priest',
    description: 'Masters of dark magic and control',
    primaryColor: 'black',
    secondaryColor: 'blue',
    defaultSkills: SHADOW_PRIEST_SKILLS.map(skill => skill.id)
  },
  alchemist: {
    id: 'alchemist',
    name: 'Alchemist',
    description: 'Masters of transformation and resource manipulation',
    primaryColor: 'green',
    secondaryColor: 'red',
    defaultSkills: ALCHEMIST_SKILLS.map(skill => skill.id)
  },
  stormMage: {
    id: 'stormMage',
    name: 'Storm Mage',
    description: 'Masters of chain reactions and area control',
    primaryColor: 'blue',
    secondaryColor: 'black',
    defaultSkills: STORM_MAGE_SKILLS.map(skill => skill.id)
  },
  timeWeaver: {
    id: 'timeWeaver',
    name: 'Time Weaver',
    description: 'Masters of turn manipulation and board control',
    primaryColor: 'yellow',
    secondaryColor: 'blue',
    defaultSkills: TIME_WEAVER_SKILLS.map(skill => skill.id)
  }
}; 