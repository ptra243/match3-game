import React, { useState, useEffect } from 'react';
import { CLASSES } from '../store/classes';
import { useGameStore } from '../store/gameStore';
import { ALL_SKILLS } from '../store/skills';
import { Color } from '../store/types';
import { TileIcon } from './game-board/TileIcon';

interface ClassSelectionProps {
  onClassSelected: () => void;
}

export const ClassSelection: React.FC<ClassSelectionProps> = ({ onClassSelected }) => {
  const { selectClass, initializeBoard, resetGame, waitForNextFrame } = useGameStore();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [activeSkillDetails, setActiveSkillDetails] = useState<string | null>(null);
  
  // Check if the device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  const classEntries = Object.entries(CLASSES);

  const handleClassSelect = (className: string) => {
    setSelectedClass(className);
  };

  const handleStartGame = async () => {
    if (selectedClass) {
      // Reset the game first to ensure clean state
      resetGame();
      
      // Wait for state update
      await waitForNextFrame();
      
      // Select class and give starter items to player
      onSelectClass(selectedClass);
      
      // Select AI class (a class different from the player's)
      selectClass('ai', Object.keys(CLASSES).find(c => c !== selectedClass) || 'shadowPriest');
      
      // Wait for state update
      await waitForNextFrame();
      
      // Initialize the board
      initializeBoard();
      
      // Wait for board to be initialized
      await waitForNextFrame();
      
      onClassSelected();
    }
  };

  const onSelectClass = (classId: string) => {
    selectClass('human', classId);
  };
  
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : classEntries.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < classEntries.length - 1 ? prevIndex + 1 : 0));
  };
  
  const toggleSkillDetails = (skillId: string) => {
    if (activeSkillDetails === skillId) {
      setActiveSkillDetails(null);
    } else {
      setActiveSkillDetails(skillId);
    }
  };

  const renderMobileCarousel = () => {
    const [className, classData] = classEntries[currentIndex];
    
    return (
      <div className="w-full pb-16 relative">
        <div className="flex justify-center items-center mb-4">
          <div className="flex items-center">
            <div className="w-6 h-6 mr-2">
              <TileIcon color={classData.primaryColor} />
            </div>
            <h3 className="text-xl font-bold text-white">{classData.name}</h3>
          </div>
        </div>
        
        {/* Fixed navigation buttons */}
        <button 
          onClick={handlePrev} 
          className="fixed left-2 top-1/2 transform -translate-y-1/2 p-3 bg-gray-700 rounded-full focus:outline-none shadow-lg z-10"
        >
          ←
        </button>
        <button 
          onClick={handleNext} 
          className="fixed right-2 top-1/2 transform -translate-y-1/2 p-3 bg-gray-700 rounded-full focus:outline-none shadow-lg z-10"
        >
          →
        </button>
        
        <div 
          className={`p-4 rounded-lg transition-all duration-200 
            ${selectedClass === className ? 'bg-blue-600 ring-2 ring-yellow-400' : 'bg-gray-700'}`}
          onClick={() => handleClassSelect(className)}
        >
          <p className="text-sm text-gray-300 mb-3">{classData.description}</p>
          
          <h4 className="text-sm font-bold text-white mb-2">Skills:</h4>
          <div className="space-y-2">
            {classData.defaultSkills.map((skillId) => {
              const skill = ALL_SKILLS[skillId];
              if (!skill) return null;
              
              return (
                <div 
                  key={skillId} 
                  className="bg-gray-800 p-2 rounded text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSkillDetails(skillId);
                  }}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-white">{skill.name}</h4>
                    <div className="flex items-center space-x-2">
                      {Object.entries(skill.cost).map(([color, cost]) => (
                        <div key={color} className="relative flex items-center">
                          <div className="flex-shrink-0">
                            <TileIcon color={color as Color} />
                          </div>
                          <span className="text-xs ml-1">{cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {activeSkillDetails === skillId && (
                    <p className="text-xs text-gray-300 mt-1">{skill.description}</p>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              {classEntries.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-gray-500'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopGrid = () => {
    return (
      <div className="pb-16">
        <div className="grid grid-cols-3 gap-6">
          {classEntries.map(([className, classData]) => (
            <div
              key={className}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-200 
                ${selectedClass === className ? 'bg-blue-600 ring-4 ring-yellow-400' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => handleClassSelect(className)}
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 mr-2">
                  <TileIcon color={classData.primaryColor} />
                </div>
                <h3 className="text-xl font-bold text-white">{classData.name}</h3>
              </div>
              <p className="text-gray-300 mb-4">{classData.description}</p>
              
              <div className="space-y-3">
                {classData.defaultSkills.map((skillId) => {
                  const skill = ALL_SKILLS[skillId];
                  if (!skill) return null;
                  
                  return (
                    <div 
                      key={skillId} 
                      className="bg-gray-800 p-3 rounded"
                      onMouseEnter={() => setActiveSkillDetails(skillId)}
                      onMouseLeave={() => setActiveSkillDetails(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSkillDetails(skillId);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-white">{skill.name}</h4>
                        <div className="flex items-center space-x-3">
                          {Object.entries(skill.cost).map(([color, cost]) => (
                            <div key={color} className="relative flex items-center">
                              <div className="flex-shrink-0">
                                <TileIcon color={color as Color} />
                              </div>
                              <span className="text-xs ml-1">{cost}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {(activeSkillDetails === skillId) && (
                        <p className="text-sm text-gray-300 mt-2">{skill.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-gray-800 rounded-lg relative">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-6 text-center">Choose Your Class</h2>
      
      {isMobile ? renderMobileCarousel() : renderDesktopGrid()}
      
      {/* Fixed Start Game button */}
      <div className="fixed bottom-4 right-4 z-10">
        <button
          onClick={handleStartGame}
          disabled={!selectedClass}
          className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-bold text-white transition-all duration-200 shadow-lg
            ${selectedClass
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 cursor-not-allowed'}`}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}; 