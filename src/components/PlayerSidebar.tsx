import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Color, Player } from '../store/types';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { CLASSES } from '../store/classes';

interface PlayerSidebarProps {
  player: Player;
  position: 'left' | 'right';
}

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ player, position }) => {
  const { human, ai, currentPlayer, toggleSkill } = useGameStore();
  const playerState = player === 'human' ? human : ai;
  const isCurrentPlayer = currentPlayer === player;
  const characterClass = CLASSES[playerState.className];

  const colorDisplayNames: Record<Color, string> = {
    red: 'Red',
    green: 'Green',
    blue: 'Blue',
    yellow: 'Yellow',
    black: 'Black',
    empty: '',
  };

  const colorClasses: Record<Color, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    black: 'bg-gray-900',
    empty: 'bg-transparent',
  };

  const handleSkillClick = (skillIndex: number) => {
    if (isCurrentPlayer) {
      toggleSkill(player, skillIndex);
    }
  };

  const isSkillReady = (skillIndex: number) => {
    const skill = characterClass.skills[skillIndex];
    let ready = true;
    Object.entries(skill.cost).forEach(([color, cost]) => {
      if (playerState.matchedColors[color as Color] < cost) {
        ready = false;
      }
    });
    return ready;
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
                <div className={`w-4 h-4 rounded ${colorClasses[color as Color]}`} />
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
          {characterClass.skills.map((skill, index) => (
            <button
              key={skill.name}
              onClick={() => handleSkillClick(index)}
              disabled={!isCurrentPlayer || !isSkillReady(index)}
              className={`w-full p-3 rounded-lg transition-colors duration-200 text-left
                ${isCurrentPlayer && isSkillReady(index)
                  ? playerState.activeSkillIndex === index
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700'} 
                ${!isCurrentPlayer || !isSkillReady(index) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <h4 className="font-medium text-white">{skill.name}</h4>
              <p className="text-sm text-gray-300">{skill.description}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(skill.cost).map(([color, cost]) => (
                  <span key={color} className="text-xs flex items-center">
                    <div className={`w-2 h-2 rounded ${colorClasses[color as Color]} mr-1`} />
                    {cost}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Effects */}
      {playerState.statusEffects.length > 0 && (
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 