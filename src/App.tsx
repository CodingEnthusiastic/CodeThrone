import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Discussion from './pages/Discussion';
import DiscussionDetail from './pages/DiscussionDetail';
import Game from './pages/Game';
import GameMain from './pages/GameMain';
import RapidFire from './pages/RapidFire';
import Contest from './pages/Contest';
import Interview from './pages/Interview';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Redeem from './pages/Redeem';
import CompanyProblems from './pages/CompanyProblems';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ContestProblems from './pages/ContestProblems';
import ContestProblemDetail from './pages/ContestProblemDetail';  
import Announcements from './pages/Announcements';
import AnnounceDetail from './pages/AnnounceDetail';
import OAuthHandler from './pages/OAuthHandler';
import Chat from './pages/Chat';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

// Move loading logic to a wrapper component
const tips = [
  "Tip 1: Solve problems daily to build consistency.",
  "Tip 2: Write clean and readable code.",
  "Tip 3: Debug systematically, not randomly.",
  "Tip 4: Learn by explaining your solution.",
  "Tip 5: Focus on time and space optimization."
];

const AppRoutes = () => {
  const { loading } = useAuth();
  const { isDark } = useTheme();
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2000); // Change tip every 2 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  if (loading) {
    return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-t-transparent border-orange-600 mx-auto"></div>
          <Trophy className="text-orange-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" size={40} />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">Loading <span className="text-orange-600">CodeThrone</span>...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This will take 15 seconds</p>
        <p className="italic text-sm text-gray-600 dark:text-gray-300 transition-all duration-500">{tips[tipIndex]}</p>
      </div>
    </div>
  );
  }

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-300 relative ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}>
        
        {/* Beautiful Falling White Balls Animation for Dark Mode */}
        {isDark && (
          <>
            <style>{`
              @keyframes fall {
                0% {
                  transform: translateY(-100vh) translateX(0px);
                  opacity: 0;
                }
                10% {
                  opacity: 1;
                }
                90% {
                  opacity: 1;
                }
                100% {
                  transform: translateY(100vh) translateX(100px);
                  opacity: 0;
                }
              }
              @keyframes float-gentle {
                0%, 100% {
                  transform: translateY(0px) translateX(0px);
                }
                25% {
                  transform: translateY(-20px) translateX(10px);
                }
                50% {
                  transform: translateY(-10px) translateX(-5px);
                }
                75% {
                  transform: translateY(-30px) translateX(15px);
                }
              }
              @keyframes sparkle {
                0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
                50% { opacity: 1; transform: scale(1) rotate(180deg); }
              }
              @keyframes orbit {
                0% { transform: rotate(0deg) translateX(100px) rotate(0deg); }
                100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
              }
              @keyframes morphing-blob {
                0%, 100% { 
                  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
                  transform: translate(0, 0) scale(1);
                }
                25% { 
                  border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
                  transform: translate(30px, -50px) scale(1.1);
                }
                50% { 
                  border-radius: 50% 60% 30% 40% / 30% 40% 80% 20%;
                  transform: translate(-20px, 20px) scale(0.9);
                }
                75% { 
                  border-radius: 80% 20% 60% 40% / 40% 70% 30% 60%;
                  transform: translate(50px, 10px) scale(1.05);
                }
              }
              @keyframes particle-float {
                0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-100px) translateX(50px) rotate(360deg); opacity: 0; }
              }
              .falling-ball {
                animation: fall linear infinite;
              }
              .floating-ball {
                animation: float-gentle 4s ease-in-out infinite;
              }
              .sparkle-particle {
                animation: sparkle 2s ease-in-out infinite;
              }
              .orbit-element {
                animation: orbit 20s linear infinite;
              }
              .morphing-blob {
                animation: morphing-blob 8s ease-in-out infinite;
              }
              .particle-system {
                animation: particle-float 4s ease-out infinite;
              }
            `}</style>
            
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              {/* Morphing Background Blobs */}
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 morphing-blob"></div>
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-purple-500/10 to-pink-500/10 morphing-blob" style={{ animationDelay: '4s' }}></div>
              
              {/* Orbiting Elements */}
              <div className="absolute top-1/2 left-1/2 w-2 h-2">
                <div className="orbit-element absolute w-1 h-1 bg-white/20 rounded-full"></div>
              </div>
              <div className="absolute top-1/3 left-1/3 w-3 h-3">
                <div className="orbit-element absolute w-1.5 h-1.5 bg-white/15 rounded-full" style={{ animationDelay: '10s', animationDuration: '30s' }}></div>
              </div>
              
              {/* Sparkle Particles */}
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="sparkle-particle absolute w-1 h-1 bg-white/30 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 1}s`,
                  }}
                />
              ))}
              
              {/* Floating Particle System */}
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={`particle-${i}`}
                  className="particle-system absolute w-0.5 h-0.5 bg-white/20 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    bottom: '-10px',
                    animationDelay: `${Math.random() * 4}s`,
                    animationDuration: `${4 + Math.random() * 2}s`,
                  }}
                />
              ))}

              {/* Large Falling Balls */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`large-${i}`}
                  className="falling-ball absolute w-3 h-3 bg-white/20 rounded-full blur-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${8 + Math.random() * 4}s`,
                    animationDelay: `${Math.random() * 8}s`,
                  }}
                />
              ))}
              
              {/* Medium Falling Balls */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`medium-${i}`}
                  className="falling-ball absolute w-2 h-2 bg-white/15 rounded-full blur-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${6 + Math.random() * 3}s`,
                    animationDelay: `${Math.random() * 6}s`,
                  }}
                />
              ))}
              
              {/* Small Falling Balls */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`small-${i}`}
                  className="falling-ball absolute w-1 h-1 bg-white/10 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDuration: `${4 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 4}s`,
                  }}
                />
              ))}
              
              {/* Floating Ambient Balls */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`floating-${i}`}
                  className="floating-ball absolute w-4 h-4 bg-white/5 rounded-full blur-md"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    animationDelay: `${Math.random() * 4}s`,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Beautiful Light Mode Animations */}
        {!isDark && (
          <>
            <style>{`
              @keyframes light-float {
                0%, 100% {
                  transform: translateY(0px) translateX(0px) rotate(0deg);
                  opacity: 0.6;
                }
                25% {
                  transform: translateY(-15px) translateX(8px) rotate(90deg);
                  opacity: 0.8;
                }
                50% {
                  transform: translateY(-8px) translateX(-4px) rotate(180deg);
                  opacity: 1;
                }
                75% {
                  transform: translateY(-25px) translateX(12px) rotate(270deg);
                  opacity: 0.7;
                }
              }
              @keyframes light-sparkle {
                0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
                50% { opacity: 0.8; transform: scale(1.2) rotate(180deg); }
              }
              @keyframes light-orbit {
                0% { transform: rotate(0deg) translateX(80px) rotate(0deg); }
                100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
              }
              @keyframes light-morph {
                0%, 100% { 
                  border-radius: 50% 60% 40% 70% / 60% 40% 70% 50%;
                  transform: translate(0, 0) scale(1) rotate(0deg);
                }
                25% { 
                  border-radius: 40% 70% 60% 50% / 50% 70% 40% 60%;
                  transform: translate(20px, -30px) scale(1.05) rotate(90deg);
                }
                50% { 
                  border-radius: 60% 50% 40% 60% / 40% 50% 70% 30%;
                  transform: translate(-15px, 15px) scale(0.95) rotate(180deg);
                }
                75% { 
                  border-radius: 70% 40% 50% 60% / 50% 60% 40% 70%;
                  transform: translate(35px, 8px) scale(1.02) rotate(270deg);
                }
              }
              @keyframes color-shift {
                0%, 100% { 
                  background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                }
                25% { 
                  background: linear-gradient(45deg, rgba(236, 72, 153, 0.1), rgba(59, 130, 246, 0.1));
                }
                50% { 
                  background: linear-gradient(45deg, rgba(34, 197, 94, 0.1), rgba(236, 72, 153, 0.1));
                }
                75% { 
                  background: linear-gradient(45deg, rgba(251, 191, 36, 0.1), rgba(34, 197, 94, 0.1));
                }
              }
              @keyframes gentle-rise {
                0% { transform: translateY(100px) translateX(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.6; }
                90% { opacity: 0.6; }
                100% { transform: translateY(-100px) translateX(30px) rotate(360deg); opacity: 0; }
              }
              .light-floating {
                animation: light-float 5s ease-in-out infinite;
              }
              .light-sparkle {
                animation: light-sparkle 2.5s ease-in-out infinite;
              }
              .light-orbit {
                animation: light-orbit 25s linear infinite;
              }
              .light-morph {
                animation: light-morph 10s ease-in-out infinite;
              }
              .color-shift {
                animation: color-shift 8s ease-in-out infinite;
              }
              .gentle-rise {
                animation: gentle-rise 6s ease-out infinite;
              }
            `}</style>
            
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
              {/* Light Mode Morphing Blobs */}
              <div className="absolute top-1/5 left-1/5 w-72 h-72 bg-gradient-to-br from-blue-200/20 to-purple-200/20 light-morph rounded-full blur-2xl"></div>
              <div className="absolute bottom-1/5 right-1/5 w-56 h-56 bg-gradient-to-br from-pink-200/20 to-orange-200/20 light-morph rounded-full blur-2xl" style={{ animationDelay: '5s' }}></div>
              <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-br from-green-200/15 to-blue-200/15 light-morph rounded-full blur-xl" style={{ animationDelay: '2.5s' }}></div>
              
              {/* Additional Background Blobs */}
              <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-gradient-to-br from-cyan-200/15 to-teal-200/15 light-morph rounded-full blur-2xl" style={{ animationDelay: '7s' }}></div>
              <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-gradient-to-br from-yellow-200/20 to-amber-200/20 light-morph rounded-full blur-xl" style={{ animationDelay: '3.5s' }}></div>
              
              {/* Orbiting Colored Elements */}
              <div className="absolute top-1/3 left-1/2 w-3 h-3">
                <div className="light-orbit absolute w-2 h-2 bg-gradient-to-r from-blue-400/40 to-purple-400/40 rounded-full shadow-lg"></div>
              </div>
              <div className="absolute top-2/3 left-1/3 w-4 h-4">
                <div className="light-orbit absolute w-2.5 h-2.5 bg-gradient-to-r from-pink-400/40 to-orange-400/40 rounded-full shadow-lg" style={{ animationDelay: '12s', animationDuration: '35s' }}></div>
              </div>
              
              {/* Colorful Sparkle Particles */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={`light-sparkle-${i}`}
                  className={`light-sparkle absolute w-1.5 h-1.5 rounded-full ${
                    i % 6 === 0 ? 'bg-blue-400/60' :
                    i % 6 === 1 ? 'bg-purple-400/60' :
                    i % 6 === 2 ? 'bg-pink-400/60' :
                    i % 6 === 3 ? 'bg-green-400/60' :
                    i % 6 === 4 ? 'bg-yellow-400/60' : 'bg-cyan-400/60'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2.5}s`,
                    animationDuration: `${2.5 + Math.random() * 1.5}s`,
                  }}
                />
              ))}
              
              {/* Gentle Rising Particles */}
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={`gentle-rise-${i}`}
                  className={`gentle-rise absolute w-1 h-1 rounded-full ${
                    i % 6 === 0 ? 'bg-blue-300/50' :
                    i % 6 === 1 ? 'bg-purple-300/50' :
                    i % 6 === 2 ? 'bg-pink-300/50' :
                    i % 6 === 3 ? 'bg-green-300/50' :
                    i % 6 === 4 ? 'bg-yellow-300/50' : 'bg-cyan-300/50'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    bottom: '-10px',
                    animationDelay: `${Math.random() * 6}s`,
                    animationDuration: `${6 + Math.random() * 3}s`,
                  }}
                />
              ))}

              {/* Large Floating Elements */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`light-large-${i}`}
                  className={`light-floating absolute w-4 h-4 rounded-full blur-sm ${
                    i % 4 === 0 ? 'bg-gradient-to-br from-blue-200/30 to-purple-200/30' :
                    i % 4 === 1 ? 'bg-gradient-to-br from-pink-200/30 to-orange-200/30' :
                    i % 4 === 2 ? 'bg-gradient-to-br from-green-200/30 to-blue-200/30' :
                    'bg-gradient-to-br from-yellow-200/30 to-cyan-200/30'
                  }`}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${5 + Math.random() * 3}s`,
                    animationDelay: `${Math.random() * 5}s`,
                  }}
                />
              ))}
              
              {/* Color Shifting Background Elements */}
              <div className="absolute top-0 right-0 w-96 h-96 color-shift rounded-full blur-3xl opacity-30"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 color-shift rounded-full blur-3xl opacity-25" style={{ animationDelay: '4s' }}></div>
            </div>
          </>
        )}

        <Navbar />
        <div className="pt-0 relative z-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/chats" element={<Chat />} />
            <Route path="/top" element={<Discussion />} />
            <Route path="/top/:id" element={<DiscussionDetail />} />
            <Route path="/game" element={<ProtectedRoute><GameMain /></ProtectedRoute>} />
            <Route path="/game/coding" element={<ProtectedRoute><Game /></ProtectedRoute>} />
            <Route path="/game/play/:gameId" element={<ProtectedRoute><Game /></ProtectedRoute>} />
            <Route path="/rapidfire" element={<ProtectedRoute><RapidFire /></ProtectedRoute>} />
            <Route path="/rapidfire/play/:gameId" element={<ProtectedRoute><RapidFire /></ProtectedRoute>} />
            <Route path="/contest" element={<Contest />} />
            <Route path="/contest/:id/problems" element={<ContestProblems />} />
            <Route path="/contest/:id/problem/:problemId" element={<ContestProblemDetail />} />
            {/* <Route path="/contest" element={<Contest />} />
            <Route path="/contest/:contestId/problems" element={<ContestProblems />} />
            <Route path="/contest/:contestId/problem/:problemId" element={<ContestProblemDetail />} /> */}
            {/* <Route path="/contest/:id" element={<ProtectedRoute><Contest /></ProtectedRoute>}/> */}
            <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/redeem" element={<ProtectedRoute><Redeem /></ProtectedRoute>} />
            <Route path="/company/:company" element={<CompanyProblems />} />
            <Route path="/company-problems" element={<CompanyProblems />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path='/announcements' element={<Announcements/>}/>
            <Route path='/announcements/:id' element={<AnnounceDetail/>}/>
            <Route path="/oauth" element={<OAuthHandler />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
