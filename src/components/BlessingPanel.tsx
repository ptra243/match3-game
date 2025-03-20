import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Blessing, Color, Effect } from '../store/types';

const COLOR_BACKGROUNDS = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  black: 'bg-gray-800',
  empty: 'bg-gray-500'
};

// Helper function to describe effect in a simple way
const getEffectDescription = (effect: Effect): string => {
  const parts: string[] = [];
  
  if (effect.colorStats) {
    Object.entries(effect.colorStats).forEach(([color, value]) => {
      if (value) {
        parts.push(`+${value} ${color} damage`);
      }
    });
  }
  
  if (effect.defense) {
    parts.push(`+${effect.defense} defense`);
  }
  
  if (effect.health) {
    parts.push(`+${effect.health} health`);
  }
  
  if (effect.damageMultiplier && effect.damageMultiplier !== 1) {
    const percent = Math.round((effect.damageMultiplier - 1) * 100);
    parts.push(`+${percent}% damage`);
  }
  
  if (effect.resourceMultiplier && effect.resourceMultiplier !== 1) {
    const percent = Math.round((effect.resourceMultiplier - 1) * 100);
    parts.push(`+${percent}% resources`);
  }
  
  if (effect.extraTurn) {
    parts.push("extra turn");
  }
  
  return parts.join(', ');
};

// Helper to display trigger type in a cleaner format
const getTriggerText = (triggerType?: string): string => {
  if (!triggerType || triggerType === 'immediate') return "Immediate";
  
  switch(triggerType) {
    case 'OnDamageTaken': return "On Damage Taken";
    case 'OnDamageDealt': return "On Damage Dealt";
    case 'StartOfTurn': return "Start of Turn";
    case 'EndOfTurn': return "End of Turn";
    case 'OnMatch': return "On Match";
    case 'OnSkillCast': return "On Skill Cast";
    case 'OnResourceGained': return "On Resource Gained";
    case 'OnStatusEffectApplied': return "On Status Effect Applied";
    case 'OnGameOver': return "On Game Over";
    default: return triggerType;
  }
};

// Individual blessing card with details on hover/touch
const BlessingCard: React.FC<{ 
  blessing: Blessing, 
  hasEnoughResources: boolean,
  onPurchase: () => void 
}> = ({ blessing, hasEnoughResources, onPurchase }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div 
      className={`p-2 rounded-lg border ${hasEnoughResources ? 'border-white' : 'border-gray-600'} bg-gray-700 relative`}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
      onTouchStart={() => setShowDetails(true)}
      onTouchEnd={() => setShowDetails(false)}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-xs truncate mr-1">{blessing.name}</h4>
        <div className="flex items-center flex-shrink-0">
          <div className={`w-3 h-3 rounded-full ${COLOR_BACKGROUNDS[blessing.color]} mr-1`}></div>
          <span className={`text-xs ${hasEnoughResources ? 'text-white' : 'text-red-400'}`}>
            {blessing.cost}
          </span>
        </div>
      </div>
      
      {/* Compact summary that's always visible */}
      <div className="text-xs text-gray-300 truncate mt-1">
        {blessing.description.length > 30 
          ? blessing.description.substring(0, 30) + '...' 
          : blessing.description}
      </div>
      
      <button
        onClick={onPurchase}
        disabled={!hasEnoughResources}
        className={`w-full mt-1 py-1 px-2 rounded text-xs font-medium ${
          hasEnoughResources 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        Purchase
      </button>
      
      {/* Detailed popup on hover/touch */}
      {showDetails && (
        <div className="absolute left-0 bottom-full z-10 bg-gray-800 border border-gray-600 p-2 rounded-lg shadow-lg w-64 mb-2">
          <h4 className="text-white font-medium text-sm mb-1">{blessing.name}</h4>
          <p className="text-xs text-gray-300 mb-2">{blessing.description}</p>
          
          {/* Display effect details */}
          <div className="mb-2">
            {blessing.effects.map((effect, index) => {
              const effectDesc = getEffectDescription(effect);
              const triggerText = getTriggerText(effect.triggerType);
              
              return (
                <div key={index} className="mb-1">
                  {effect.triggerType && effect.triggerType !== 'immediate' && (
                    <div className="text-xs text-purple-300">
                      Trigger: {triggerText}
                    </div>
                  )}
                  
                  {effectDesc && (
                    <div className="text-xs text-blue-300">
                      {effectDesc}
                      {effect.turnsRemaining && 
                        <span className="text-yellow-300 ml-1">
                          ({effect.turnsRemaining} turn{effect.turnsRemaining !== 1 ? 's' : ''})
                        </span>
                      }
                    </div>
                  )}
                </div>
              );
            })}
            
            {blessing.duration && (
              <div className="text-xs text-green-300 mt-1">
                Duration: {blessing.duration} turn{blessing.duration !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BlessingPanel: React.FC = () => {
  const availableBlessings = useGameStore(state => state.availableBlessings);
  const purchaseBlessing = useGameStore(state => state.purchaseBlessing);
  const currentPlayer = useGameStore(state => state.currentPlayer);
  const playerResources = useGameStore(state => state[currentPlayer].matchedColors);
  const battleState = useGameStore(state => state.battleState);
  
  // Only show for human player
  if (currentPlayer !== 'human') return null;
  
  return (
    <div className="w-full bg-gray-800 border-t border-gray-700 p-2 mt-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold text-sm">Blessings</h3>
        <div className="flex items-center text-xs text-gray-300">
          <span>Battle {battleState.currentBattle}/{battleState.maxBattles}</span>
          <span className="mx-2">|</span>
          <span>Collected: {battleState.blessingsCollected.length}</span>
          {battleState.blessingsCollected.length >= 3 && (
            <button
              onClick={() => useGameStore.getState().convertBlessingsToItem()}
              className="ml-2 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
            >
              Convert
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableBlessings.map((blessing) => {
          const hasEnoughResources = playerResources[blessing.color] >= blessing.cost;
          
          return (
            <div key={blessing.id} className="w-[calc(20%-0.4rem)]">
              <BlessingCard
                blessing={blessing}
                hasEnoughResources={hasEnoughResources}
                onPurchase={() => purchaseBlessing(blessing.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BlessingPanel; 