import React, {useState} from 'react';
import {useGameStore} from '../../store/gameStore';
import {Color, Player} from '../../store/types';
import {CLASSES} from '../../store/classes';
import {TileIcon} from '../game-board/TileIcon';
import {toast} from 'react-hot-toast';
import {ALL_SKILLS} from '../../store/skills';

interface MobilePlayerIconProps {
    player: Player;
    position: 'left' | 'right';
}

export const MobilePlayerIcon: React.FC<MobilePlayerIconProps> = ({player, position}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {human, ai, currentPlayer, toggleSkill} = useGameStore();
    const playerState = player === 'human' ? human : ai;
    const isCurrentPlayer = currentPlayer === player;
    const characterClass = CLASSES[playerState.className];

    // Check if a skill is ready to use
    const isSkillReady = (skillId: string) => {
        const skill = ALL_SKILLS[skillId];
        if (!skill) return false;

        let canUse = true;
        Object.entries(skill.cost).forEach(([color, cost]) => {
            if (playerState.matchedColors[color as Color] < (cost || 0)) {
                canUse = false;
            }
        });
        return canUse;
    };

    // Handle skill click
    const handleSkillClick = (skillId: string) => {
        if (!isCurrentPlayer) {
            toast.error("It's not your turn!");
            return;
        }

        toggleSkill(player, skillId);
    };

    const handleIconClick = () => {
        setIsExpanded(!isExpanded);
    };

    const fixedPositionClass = position === 'left'
        ? 'fixed top-1 left-1 z-20'
        : 'fixed top-1 right-1 z-20';

    return (
        <>
            {/* Fixed icon */}
            <button
                onClick={handleIconClick}
                className={`${fixedPositionClass} w-10 h-10 rounded-full flex items-center justify-center
          ${isCurrentPlayer ? 'bg-green-600' : 'bg-gray-700'} shadow-lg border border-gray-600`}
            >
                {player === 'human' ? '👤' : '🤖'}
            </button>

            {/* Mobile panel when expanded */}
            {isExpanded && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-30 p-4 pt-16 overflow-auto">
                    {/* Close button */}
                    <button
                        onClick={() => setIsExpanded(false)}
                        className="absolute top-2 right-2 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white"
                    >
                        ✕
                    </button>

                    {/* Player header */}
                    <div className="flex items-center mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center 
              ${isCurrentPlayer ? 'bg-green-600' : 'bg-gray-600'}`}
                        >
                            {player === 'human' ? '👤' : '🤖'}
                        </div>
                        <div className="ml-3">
                            <div className="font-bold text-sm">{player === 'human' ? 'Player' : 'AI'}</div>
                            <div className="text-xs text-gray-300">{playerState.className}</div>
                        </div>
                        {isCurrentPlayer && (
                            <div className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-green-600 rounded-full">
                                TURN
                            </div>
                        )}
                    </div>

                    {/* Health bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                            <span>Health</span>
                            <span>{playerState.health} / 100</span>
                        </div>
                        <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-red-600 transition-all duration-500"
                                style={{width: `${playerState.health}%`}}
                            ></div>
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="mb-4">
                        <div className="text-xs mb-2">Resources</div>
                        <div className="grid grid-cols-5 gap-1">
                            {(['red', 'blue', 'green', 'yellow', 'black'] as Color[]).map(color => (
                                <div key={color}
                                     className="w-full aspect-square bg-gray-700 rounded-md relative flex flex-col items-center justify-center">
                                    <TileIcon color={color}/>
                                    <div className="text-[10px] mt-1 font-bold">
                                        {playerState.matchedColors[color] || 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Skills */}
                    <div>
                        <div className="text-xs mb-2">Skills</div>
                        <div className="space-y-2">
                            {playerState.equippedSkills.map(skillId => {
                                const skill = ALL_SKILLS[skillId];
                                if (!skill) return null;

                                const ready = isSkillReady(skillId);
                                const isActive = playerState.activeSkillId === skillId;

                                return (
                                    <button
                                        key={skillId}
                                        onClick={() => handleSkillClick(skillId)}
                                        disabled={!ready || !isCurrentPlayer}
                                        className={`
                      w-full py-2 px-3 rounded-md text-left flex items-center
                      ${ready ? 'bg-blue-900 hover:bg-blue-800' : 'bg-gray-700 opacity-60 cursor-not-allowed'}
                      ${isActive ? 'ring-2 ring-yellow-400' : ''}
                    `}
                                    >
                                        <div className="flex-1">
                                            <div className="text-xs font-medium">{skill.name}</div>
                                            <div className="text-[10px] text-gray-400">{skill.description}</div>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {Object.entries(skill.cost).map(([color, amount]) => (
                                                <div key={color} className="relative flex items-center">
                                                    <TileIcon color={color as Color}/>
                                                    <span className="text-[10px] ml-0.5">{amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}; 