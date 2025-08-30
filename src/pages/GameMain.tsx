import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Gamepad2, Zap, Users, Clock, Trophy, Target, Brain, Code, Timer } from 'lucide-react';

const GameMain: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [hoveredMode, setHoveredMode] = useState<'coding' | 'rapidfire' | null>(null);

  const gameModesData = [
    {
      id: 'coding',
      title: 'Coding Battle',
      subtitle: 'Classic algorithmic problem solving',
      icon: Gamepad2,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      features: [
        'Full code editor with syntax highlighting',
        'Multiple programming languages (C++, Java, Python)',
        'Real-time test case validation',
        'ELO rating system',
        '30-60 minute battles',
        'Dynamic difficulty matching'
      ],
      stats: {
        duration: '30-60 min',
        players: '1v1',
        skill: 'Coding',
        rating: 'ELO Based'
      },
      path: '/game/coding'
    },
    {
      id: 'rapidfire',
      title: 'Rapid Fire MCQ',
      subtitle: 'Lightning-fast multiple choice battles',
      icon: Zap,
      color: 'red',
      gradient: 'from-red-500 to-orange-600',
      bgGradient: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      features: [
        '10 MCQ questions in 60 seconds',
        'DSA, System Design, AI/ML & Aptitude',
        'Real-time scoring (+1 correct, -0.5 wrong)',
        'Quick rounds (1-2 minutes)',
        'ELO rating system',
        'Fast-paced competitive gameplay'
      ],
      stats: {
        duration: '60 sec',
        players: '1v1',
        skill: 'Speed + Knowledge',
        rating: 'ELO Based'
      },
      path: '/rapidfire',
      isNew: true
    }
  ];

  const AnimatedBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {isDark ? (
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`bg-dark-${i}`}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`
              }}
            >
              <div className={`w-1 h-1 rounded-full ${
                i % 3 === 0 ? 'bg-blue-400' :
                i % 3 === 1 ? 'bg-red-400' : 'bg-purple-400'
              } opacity-60`}></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={`bg-light-${i}`}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 6}s`
              }}
            >
              <div className={`w-2 h-2 rounded-full ${
                i % 3 === 0 ? 'bg-blue-200' :
                i % 3 === 1 ? 'bg-red-200' : 'bg-purple-200'
              } opacity-40`}></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const handleModeSelect = (mode: typeof gameModesData[0]) => {
    navigate(mode.path);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      <AnimatedBackground />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-red-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-white dark:bg-gray-800 p-4 rounded-full shadow-2xl border-4 border-white dark:border-gray-700">
                <Trophy className="h-16 w-16 text-orange-500" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Choose Your <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">Battle</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Select your preferred competition style and challenge programmers worldwide
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {gameModesData.map((mode) => {
            const Icon = mode.icon;
            const isHovered = hoveredMode === mode.id;
            
            return (
              <div
                key={mode.id}
                onMouseEnter={() => setHoveredMode(mode.id as 'coding' | 'rapidfire')}
                onMouseLeave={() => setHoveredMode(null)}
                onClick={() => handleModeSelect(mode)}
                className={`
                  relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 
                  cursor-pointer transition-all duration-300 overflow-hidden group
                  ${isHovered ? 'scale-105 shadow-2xl' : 'hover:scale-102 hover:shadow-lg'}
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.bgGradient} opacity-50 transition-opacity duration-300 ${isHovered ? 'opacity-70' : ''}`}></div>
                
                {/* New Badge */}
                {mode.isNew && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg">
                      NEW! ⚡
                    </span>
                  </div>
                )}

                <div className="relative z-10 p-8">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className={`
                      w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 
                      bg-gradient-to-br ${mode.gradient} shadow-lg transform transition-all duration-300
                      ${isHovered ? 'scale-110 rotate-6' : 'group-hover:scale-105'}
                    `}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {mode.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                      {mode.subtitle}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 text-center backdrop-blur-sm">
                      <Clock className={`h-5 w-5 text-${mode.color}-600 dark:text-${mode.color}-400 mx-auto mb-1`} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mode.stats.duration}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Duration</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 text-center backdrop-blur-sm">
                      <Users className={`h-5 w-5 text-${mode.color}-600 dark:text-${mode.color}-400 mx-auto mb-1`} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mode.stats.players}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Players</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 text-center backdrop-blur-sm">
                      <Brain className={`h-5 w-5 text-${mode.color}-600 dark:text-${mode.color}-400 mx-auto mb-1`} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mode.stats.skill}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Focus</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-3 text-center backdrop-blur-sm">
                      <Trophy className={`h-5 w-5 text-${mode.color}-600 dark:text-${mode.color}-400 mx-auto mb-1`} />
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{mode.stats.rating}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Rating</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-6 backdrop-blur-sm">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Features:
                    </h3>
                    <ul className="space-y-2">
                      {mode.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                          <div className={`w-1.5 h-1.5 rounded-full bg-${mode.color}-500 mt-2 mr-3 flex-shrink-0`}></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div className="mt-8">
                    <button className={`
                      w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg
                      bg-gradient-to-r ${mode.gradient} text-white
                      transform ${isHovered ? 'scale-105' : ''} hover:shadow-xl
                      focus:outline-none focus:ring-4 focus:ring-${mode.color}-500/50
                    `}>
                      Enter {mode.title}
                      <span className="ml-2">→</span>
                    </button>
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 transition-opacity duration-300
                  ${isHovered ? 'opacity-10' : ''}
                `}></div>
              </div>
            );
          })}
        </div>

        {/* Comparison Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
            Mode Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-gray-100">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold text-blue-600 dark:text-blue-400">Coding Battle</th>
                  <th className="text-center py-4 px-6 font-semibold text-red-600 dark:text-red-400">Rapid Fire MCQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">Duration</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">30-60 minutes</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">60 seconds</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">Questions</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">1 Coding Problem</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">10 MCQ Questions</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">Skills Tested</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">Algorithm Design & Implementation</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">DSA, System Design, AI/ML, Aptitude</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">Ideal For</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">Deep Problem Solving</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">Quick Knowledge Testing</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-gray-100">Scoring</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">Test Cases Passed</td>
                  <td className="py-4 px-6 text-center text-gray-700 dark:text-gray-300">+1 Correct, -0.5 Wrong</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 text-center border border-blue-200/50 dark:border-blue-600/30">
            <Code className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Coding Battles</h4>
            <p className="text-blue-700 dark:text-blue-400 text-sm">Perfect for interview prep and algorithm mastery</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 text-center border border-red-200/50 dark:border-red-600/30">
            <Timer className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-red-800 dark:text-red-300 mb-2">Rapid Fire</h4>
            <p className="text-red-700 dark:text-red-400 text-sm">Test knowledge across multiple domains quickly</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 text-center border border-purple-200/50 dark:border-purple-600/30">
            <Users className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2">Multiplayer</h4>
            <p className="text-purple-700 dark:text-purple-400 text-sm">Real-time competition with live opponents</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameMain;
