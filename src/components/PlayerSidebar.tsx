import React, {useEffect, useState} from 'react';
import {useGameStore} from '../store/gameStore';
import {Color, Player} from '../store/types';
import {CLASSES} from '../store/classes';
import {TileIcon} from './game-board/TileIcon';
import {ALL_SKILLS} from '../store/skills';
import {toast} from 'react-hot-toast';
import {MATCH_RULES} from '../store/gameRules';

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
  const fourMatch = 4 * MATCH_RULES.DAMAGE_CALCULATION.LENGTH_MULTIPLIERS.FOUR * multiplier;
  const fiveMatch = 5 * MATCH_RULES.DAMAGE_CALCULATION.LENGTH_MULTIPLIERS.FIVE_PLUS * multiplier;

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Use auto-generated selectors
  const human = useGameStore.use.human();
  const ai = useGameStore.use.ai();
  const currentPlayer = useGameStore.use.currentPlayer();
  const toggleSkill = useGameStore.use.toggleSkill();
  const useSkill = useGameStore.use.useSkill();
  const aiDifficulty = useGameStore.use.aiDifficulty();
  const setAiDifficulty = useGameStore.use.setAiDifficulty();

  const playerState = player === 'human' ? human : ai;
  const isCurrentPlayer = currentPlayer === player;
  const characterClass = CLASSES[playerState.className];

  // Auto-collapse on small screens initially and track mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Mobile layout - position fixed at corners
  const mobilePositioning = 
    position === 'left' 
      ? "fixed top-2 left-2 z-20" 
      : "fixed top-2 right-2 z-20";
  
  // Desktop layout - standard positioning
  const desktopPositioning = 
    position === 'left' 
      ? "relative md:mr-4" 
      : "relative md:ml-4";
  
  const getPositionClasses = () => {
    if (window.innerWidth < 768) {
      return isCollapsed ? mobilePositioning : "relative";
    }
    return desktopPositioning;
  };

  // Handle skill click
  const handleSkillClick = (skillId: string) => {
    if (!isCurrentPlayer) {
      toast.error("It's not your turn!");
      return;
    }
    
    toggleSkill(player, skillId);

    // Automatically collapse sidebar if mobile
    if (isMobile && !isCollapsed) {
      setIsCollapsed(true);
    }
  };

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

  // Toggle sidebar collapse
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const mobileFixedClasses = isMobile && isCollapsed 
    ? (position === 'left' ? 'fixed top-2 left-2 z-20' : 'fixed top-2 right-2 z-20')
    : 'relative';

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleCollapse}
        />
      )}
      
      <div className={`bg-gray-800 rounded-lg md:w-64 transition-all duration-300 ease-in-out
        ${isMobile && !isCollapsed ? 'fixed inset-0 z-50 m-0 w-full h-full rounded-none overflow-y-auto' : mobileFixedClasses}
        ${position === 'left' ? 'md:mr-4' : 'md:ml-4'}
        ${isCollapsed ? 'w-12 h-12 m-0' : 'w-full md:w-64 p-4 m-2 md:m-0'}`}
      >
        {/* Toggle Button - serves as the only icon in collapsed state */}
        {isMobile && (
          <button 
            onClick={toggleCollapse}
            className={`${isCollapsed ? 'w-full h-full' : 'absolute'} 
              ${isCollapsed ? 'rounded-full' : `${position === 'left' ? '-right-2 top-2' : '-left-2 top-2'}`}
              z-10 flex items-center justify-center 
              ${isCollapsed ? (isCurrentPlayer ? 'bg-green-600' : 'bg-gray-600') : 'bg-gray-700 w-10 h-10 rounded-full shadow-lg border-2 border-gray-600'}`}
          >
            {isCollapsed ? 
              (player === 'human' ? '👤' : '🤖') : 
              '✕'
            }
          </button>
        )}
        {!isCollapsed && (
          // Expanded view - full sidebar
          <>
            {/* Player header */}
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                ${isCurrentPlayer ? 'bg-green-600' : 'bg-gray-600'}`}
              >
                {player === 'human' ? '👤' : '🤖'}
              </div>
              <div className="ml-3">
                <div className="font-bold">{player === 'human' ? 'Player' : 'AI'}</div>
                <div className="text-sm text-gray-300">{playerState.className}</div>
              </div>
              {isCurrentPlayer && (
                <div className="ml-auto text-xs font-bold px-2 py-1 bg-green-600 rounded-full">
                  TURN
                </div>
              )}
            </div>

            {/* AI Difficulty Selector - Only show for AI player */}
            {player === 'ai' && (
              <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">AI Difficulty</span>
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                    {aiDifficulty === 1 ? 'Easy' : 
                     aiDifficulty === 2 ? 'Casual' : 
                     aiDifficulty === 3 ? 'Medium' : 
                     aiDifficulty === 4 ? 'Hard' : 'Expert'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={aiDifficulty} 
                  onChange={(e) => setAiDifficulty(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer" 
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            )}

            {/* Health bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Health</span>
                <span>{playerState.health} / 100</span>
              </div>
              <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 transition-all duration-500"
                  style={{ width: `${playerState.health}%` }}
                ></div>
              </div>
            </div>

            {/* Color stats */}
            <div className="mb-4">
              <div className="text-sm mb-2">Color Stats</div>
              <div className="grid grid-cols-5 gap-1">
                {(['red', 'blue', 'green', 'yellow', 'black'] as Color[]).map(color => (
                  <div key={color} className="relative group">
                    <div className={`
                      w-full aspect-square rounded-md flex items-center justify-center
                      ${color === characterClass.primaryColor ? 'ring-2 ring-yellow-400' : ''}
                      ${color === characterClass.secondaryColor ? 'ring-2 ring-white' : ''}
                      ${playerState.colorStats[color] > 0 ? 'bg-gray-700' : 'bg-gray-900 opacity-50'}
                    `}>
                      <TileIcon color={color} />
                      {playerState.colorStats[color] > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-xs flex items-center justify-center">
                          {playerState.colorStats[color]}
                        </div>
                      )}
                      {(color === characterClass.primaryColor || color === characterClass.secondaryColor) && (
                        <DamageTooltip color={color} isPrimary={color === characterClass.primaryColor} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="mb-4">
              <div className="text-sm mb-2">Resources</div>
              <div className="grid grid-cols-5 gap-1">
                {(['red', 'blue', 'green', 'yellow', 'black'] as Color[]).map(color => (
                  <div key={color} className="w-full aspect-square bg-gray-700 rounded-md relative flex flex-col items-center justify-center">
                    <TileIcon color={color} />
                    <div className="text-xs mt-1 font-bold">
                      {playerState.matchedColors[color] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="text-sm mb-2">Skills</div>
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
                        <div className="text-sm font-medium">{skill.name}</div>
                        <div className="text-xs text-gray-400">{skill.description}</div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {Object.entries(skill.cost).map(([color, amount]) => (
                          <div key={color} className="relative flex items-center">
                            <TileIcon color={color as Color} />
                            <span className="text-xs ml-0.5">{amount}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Status Effects */}
            {playerState.statusEffects.length > 0 && (
              <div className="mt-4">
                <div className="text-sm mb-2">Status Effects</div>
                <div className="space-y-2">
                  {playerState.statusEffects.map((effect, index) => (
                    <div key={index} className="bg-gray-700 rounded-md p-2 text-sm">
                      <div className="font-medium">Status Effect</div>
                      <div className="text-xs text-gray-400">
                        {effect.damageMultiplier !== 1 && <div>Damage ×{effect.damageMultiplier}</div>}
                        {effect.resourceMultiplier !== 1 && <div>Resources ×{effect.resourceMultiplier}</div>}
                        {effect.manaConversion && <div>Converting {effect.manaConversion.from} to {effect.manaConversion.to}</div>}
                        {effect.extraTurn && <div>Extra turn on next match</div>}
                        {effect.skillDamageMultiplier && <div>Skill damage ×{effect.skillDamageMultiplier}</div>}
                      </div>
                      <div className="text-xs mt-1">Duration: {effect.turnsRemaining} turns</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}; 