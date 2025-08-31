import React from 'react';
import { Gamepad2, Zap } from 'lucide-react';

interface GameModeSelectionProps {
  onSelectMode: (mode: 'coding' | 'rapidfire') => void;
}

const GameModeSelection: React.FC<GameModeSelectionProps> = ({ onSelectMode }) => {
  return (
    <div className="text-center mb-12">
      <div className="flex justify-center mb-6">
        <Gamepad2 className="h-16 w-16 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">Choose Game Mode</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">Select your preferred competition style</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Coding Game Mode */}
        <div 
          onClick={() => onSelectMode('coding')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
              <Gamepad2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Coding Battle</h2>
            <p className="text-gray-600 dark:text-gray-300">Classic algorithmic problem solving</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Features:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Full code editor with syntax highlighting</li>
              <li>• Multiple programming languages</li>
              <li>• Real-time test case validation</li>
              <li>• ELO rating system</li>
              <li>• 30-60 minute battles</li>
            </ul>
          </div>

          <div className="text-center">
            <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
              Classic Mode
            </span>
          </div>
        </div>

        {/* Rapid Fire MCQ Mode */}
        <div 
          onClick={() => onSelectMode('rapidfire')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors">
              <Zap className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Rapid Fire MCQ</h2>
            <p className="text-gray-600 dark:text-gray-300">Lightning-fast multiple choice battles</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Features:</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• 10 MCQ questions in 60 seconds</li>
              <li>• DSA, System Design, AI/ML & Aptitude</li>
              <li>• Real-time scoring system</li>
              <li>• Quick rounds (1-2 minutes)</li>
              <li>• ELO rating system</li>
            </ul>
          </div>

          <div className="text-center">
            <span className="inline-block bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-3 py-1 rounded-full text-sm font-medium">
              New! ⚡
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-8">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default GameModeSelection;
