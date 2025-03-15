import React from 'react';
import { CLASSES } from '../store/classes';
import { useGameStore } from '../store/gameStore';

interface ClassSelectionProps {
  onClassSelected: () => void;
}

export const ClassSelection: React.FC<ClassSelectionProps> = ({ onClassSelected }) => {
  const { selectClass, initializeBoard } = useGameStore();
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null);

  const handleClassSelect = (className: string) => {
    setSelectedClass(className);
  };

  const handleStartGame = () => {
    if (selectedClass) {
      selectClass('human', selectedClass);
      selectClass('ai', Object.keys(CLASSES).find(c => c !== selectedClass) || 'shadowPriest');
      initializeBoard();
      onClassSelected();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-800 rounded-lg">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">Choose Your Class</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(CLASSES).map(([className, classData]) => (
          <div
            key={className}
            className={`p-6 rounded-lg cursor-pointer transition-all duration-200 
              ${selectedClass === className ? 'bg-blue-600 ring-4 ring-yellow-400' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => handleClassSelect(className)}
          >
            <h3 className="text-xl font-bold text-white mb-2">{classData.name}</h3>
            <p className="text-gray-300 mb-4">{classData.description}</p>
            
            <div className="space-y-4">
              {classData.skills.map((skill, index) => (
                <div key={index} className="bg-gray-800 p-4 rounded">
                  <h4 className="font-medium text-white mb-1">{skill.name}</h4>
                  <p className="text-sm text-gray-300 mb-2">{skill.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(skill.cost).map(([color, cost]) => (
                      <span
                        key={color}
                        className={`px-2 py-1 rounded text-xs text-white
                          ${color === 'red' ? 'bg-red-500' :
                          color === 'blue' ? 'bg-blue-500' :
                          color === 'green' ? 'bg-green-500' :
                          color === 'yellow' ? 'bg-yellow-500' :
                          'bg-gray-900'}`}
                      >
                        {cost} {color}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 text-center">
        <button
          onClick={handleStartGame}
          disabled={!selectedClass}
          className={`px-8 py-3 rounded-lg font-bold text-white transition-all duration-200
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