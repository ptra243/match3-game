import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Color, Player } from '../store/types';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { CLASSES } from '../store/classes';
import { TileIcon } from './game-board/TileIcon';
import { ALL_SKILLS } from '../store/skills';
import { toast } from 'react-hot-toast';
import { MATCH_RULES } from '../store/gameRules';

interface PlayerSidebarProps {
  player: Player;
  position: 'left' | 'right';
}

interface DamageTooltipProps {
  color: Color;
  isPrimary: boolean;
}

const DamageTooltip: React.FC<DamageTooltipProps> = ({ color, isPrimary }) => {
  const multiplier = isPrimary ? MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.PRIMARY : MATCH_RULES.DAMAGE_CALCULATION.COLOR_MULTIPLIERS.SECONDARY;
  const baseMatch = 3 * multiplier;
  const fourMatch = (4 + MATCH_RULES.DAMAGE_CALCULATION.LENGTH_BONUS_MULTIPLIER) * multiplier;
  const fiveMatch = (5 + 2 * MATCH_RULES.DAMAGE_CALCULATION.LENGTH_BONUS_MULTIPLIER) * multiplier;

  const damageText = isPrimary
    ? `Primary Color: ${baseMatch} damage for 3-match, ${fourMatch} for 4-match, ${fiveMatch} for 5-match`
    : `Secondary Color: ${baseMatch} damage for 3-match, ${fourMatch} for 4-match, ${fiveMatch} for 5-match`;

  return (
    <div className="absolute invisible group-hover:visible bg-gray-900 text-white p-2 rounded-lg text-sm w-48 z-10">
      {damageText}
    </div>
  );
};

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ player, position }) => {
  const { human, ai, currentPlayer, toggleSkill, useSkill } = useGameStore();
  const playerState = player === 'human' ? human : ai;
  const isCurrentPlayer = currentPlayer === player;
  const characterClass = CLASSES[playerState.className];

  const colorClasses: Record<Color, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    black: 'bg-gray-900',
    empty: 'bg-transparent',
  };

  const handleSkillClick = (skillId: string) => {
    if (isCurrentPlayer) {
      const skill = ALL_SKILLS[skillId];
      if (!skill) return;

      // First check if we have enough resources
      if (!isSkillReady(skillId)) {
        toast.error('Not enough resources for this skill!');
        return;
      }

      // Toggle the skill regardless of whether it's targeted or not
      console.log('Toggling skill:', skillId);
      toggleSkill(player, skillId);
      
      // If it's a non-targeted skill, use it immediately
      if (!skill.targetColor && !skill.requiresTarget) {
        console.log('Using non-targeted skill:', skillId);
        useSkill(0, 0);
      }
    }
  };

  const isSkillReady = (skillId: string) => {
    const skill = ALL_SKILLS[skillId];
    if (!skill) return false;
    
    let isReady = true;
    Object.entries(skill.cost).forEach(([color, cost]) => {
      const castCount = playerState.skillCastCount[skillId] || 0;
      const actualCost = skill.id === 'fertile_ground' ? (cost || 0) + castCount : (cost || 0);
      if (playerState.matchedColors[color as Color] < actualCost) {
        isReady = false;
      }
    });
    return isReady;
  };

  return (
    <div className={`w-64 p-4 bg-gray-800 rounded-lg ${position === 'left' ? 'mr-4' : 'ml-4'}`}>
      <div className="flex items-center mb-6">
        <UserCircleIcon className="w-12 h-12 text-gray-300" />
        <div className="ml-3">
          <h2 className="text-xl font-bold text-white capitalize">{characterClass.name}</h2>
          {isCurrentPlayer && (
            <span className="text-sm text-green-400">Current Turn</span>
          )}
        </div>
      </div>

      {/* Class Colors */}
      <div className="mb-4">
        <h3 className="text-gray-300 mb-2">Class Colors</h3>
        <div className="flex space-x-4">
          <div className="group relative">
            <div className={`w-8 h-8 rounded-lg ${colorClasses[characterClass.primaryColor]} flex items-center justify-center`}>
              <TileIcon color={characterClass.primaryColor} />
            </div>
            <DamageTooltip color={characterClass.primaryColor} isPrimary={true} />
          </div>
          <div className="group relative">
            <div className={`w-8 h-8 rounded-lg ${colorClasses[characterClass.secondaryColor]} flex items-center justify-center`}>
              <TileIcon color={characterClass.secondaryColor} />
            </div>
            <DamageTooltip color={characterClass.secondaryColor} isPrimary={false} />
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-300">Health</span>
          <span className="text-sm text-gray-300">{playerState.health}/100</span>
        </div>
        <div className="w-full h-4 bg-gray-700 rounded-full">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${playerState.health}%` }}
          />
        </div>
      </div>

      {/* Matched Colors */}
      <div className="mb-6">
        <h3 className="text-gray-300 mb-2">Resources</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(playerState.matchedColors).map(([color, count]) => (
            color !== 'empty' && (
              <div key={color} className="flex items-center">
                <div className={`w-8 h-8 rounded-lg ${colorClasses[color as Color]} flex items-center justify-center`}>
                  <TileIcon color={color as Color} />
                </div>
                <span className="ml-2 text-gray-300">
                  {count}
                </span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-gray-300 mb-2">Skills</h3>
        <div className="space-y-2">
          {playerState.equippedSkills.map((skillId) => {
            const skill = ALL_SKILLS[skillId];
            if (!skill) return null;
            
            return (
              <button
                key={skill.id}
                onClick={() => handleSkillClick(skill.id)}
                disabled={!isCurrentPlayer || !isSkillReady(skill.id)}
                className={`w-full p-3 rounded-lg transition-colors duration-200 text-left
                  ${isCurrentPlayer && isSkillReady(skill.id)
                    ? playerState.activeSkillId === skill.id
                      ? 'bg-yellow-600 hover:bg-yellow-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-700'} 
                  ${!isCurrentPlayer || !isSkillReady(skill.id) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <h4 className="font-medium text-white">{skill.name}</h4>
                <p className="text-xs text-gray-300">{skill.description}</p>
                <div className="flex mt-2 space-x-1">
                  {Object.entries(skill.cost).map(([color, cost]) => {
                    const castCount = playerState.skillCastCount[skill.id] || 0;
                    const actualCost = skill.id === 'fertile_ground' ? (cost || 0) + castCount : (cost || 0);
                    return (
                      <div 
                        key={color} 
                        className={`${colorClasses[color as Color]} px-2 py-1 rounded text-xs text-white flex items-center`}
                      >
                        <span>{actualCost}</span>
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Effects */}
      <div className="mt-4">
        <h3 className="text-gray-300 mb-2">Status Effects</h3>
        <div className="space-y-2">
          {playerState.statusEffects.map((effect, index) => (
            <div key={index} className="text-sm text-gray-300">
              {effect.damageMultiplier !== 1 && (
                <p>Damage x{effect.damageMultiplier} ({effect.turnsRemaining} turns)</p>
              )}
              {effect.resourceMultiplier !== 1 && (
                <p>Resources x{effect.resourceMultiplier} ({effect.turnsRemaining} turns)</p>
              )}
              {effect.manaConversion && (
                <p>Converting {effect.manaConversion.from} to {effect.manaConversion.to} ({effect.turnsRemaining} turns)</p>
              )}
              {effect.convertTiles && (
                <p>Converting {effect.convertTiles.count} tiles to {effect.convertTiles.color} next match</p>
              )}
              {effect.extraTurn && (
                <p>Extra turn next round!</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 