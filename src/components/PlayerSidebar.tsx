import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Color, Player } from '../store/types';
import { UserCircleIcon } from '@heroicons/react/24/solid';

interface PlayerSidebarProps {
  player: Player;
  position: 'left' | 'right';
}

export const PlayerSidebar: React.FC<PlayerSidebarProps> = ({ player, position }) => {
  const { human, ai, currentPlayer, toggleSkill } = useGameStore();
  const playerState = player === 'human' ? human : ai;
  const isCurrentPlayer = currentPlayer === player;

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

  const handleSkillClick = () => {
    if (playerState.skill.isReady && isCurrentPlayer) {
      toggleSkill(player);
    }
  };

  return (
    <div className={`w-64 p-4 bg-gray-800 rounded-lg ${position === 'left' ? 'mr-4' : 'ml-4'}`}>
      <div className="flex items-center mb-6">
        <UserCircleIcon className="w-12 h-12 text-gray-300" />
        <div className="ml-3">
          <h2 className="text-xl font-bold text-white capitalize">{player}</h2>
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
        <h3 className="text-gray-300 mb-2">Matched Colors</h3>
        {Object.entries(playerState.matchedColors).map(([color, count]) => (
          color !== 'empty' && (
            <div key={color} className="flex items-center mb-2">
              <div className={`w-4 h-4 rounded ${colorClasses[color as Color]}`} />
              <span className="ml-2 text-gray-300">
                {colorDisplayNames[color as Color]}: {count}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Skill */}
      <div>
        <h3 className="text-gray-300 mb-2">Skill</h3>
        <button
          onClick={handleSkillClick}
          disabled={!playerState.skill.isReady || !isCurrentPlayer}
          className={`w-full p-3 rounded-lg transition-colors duration-200
            ${playerState.skill.isReady && isCurrentPlayer
              ? playerState.skill.isSelected
                ? 'bg-yellow-600 hover:bg-yellow-700 cursor-pointer'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-700 cursor-not-allowed'}`}
        >
          <h4 className="font-medium text-white">{playerState.skill.name}</h4>
          <p className="text-sm text-gray-300">{playerState.skill.description}</p>
          {playerState.skill.isReady && (
            <span className="text-xs text-green-400 mt-1 block">
              {playerState.skill.isSelected ? 'Click a black tile!' : 'Ready to use!'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}; 