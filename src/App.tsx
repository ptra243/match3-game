import { useEffect } from 'react';
import { GameBoard } from './components/GameBoard';
import { PlayerSidebar } from './components/PlayerSidebar';
import { useGameStore } from './store/gameStore';
import { Toaster } from 'react-hot-toast';

function App() {
  const { initializeBoard, human, ai, resetGame } = useGameStore();

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const isGameOver = human.health <= 0 || ai.health <= 0;
  const winner = human.health <= 0 ? 'AI' : 'Human';

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            Match 3 Battle
          </h1>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reset Game
          </button>
        </div>
        
        {isGameOver ? (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-green-500 mb-4">
              Game Over! {winner} Wins!
            </h2>
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Play Again
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-start">
            <PlayerSidebar player="human" position="left" />
            <GameBoard />
            <PlayerSidebar player="ai" position="right" />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
