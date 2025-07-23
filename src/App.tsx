import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Discussion from './pages/Discussion';
import DiscussionDetail from './pages/DiscussionDetail';
import Game from './pages/Game';
import Contest from './pages/Contest';
import Interview from './pages/Interview';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import CompanyProblems from './pages/CompanyProblems';
import AdminDashboard from './pages/Admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ContestProblems from './pages/ContestProblems';
import ContestProblemDetail from './pages/ContestProblemDetail';  
import Announcements from './pages/Announcements';
import AnnounceDetail from './pages/AnnounceDetail';
import OAuthHandler from './pages/OAuthHandler';

// Move loading logic to a wrapper component
const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="pt-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/top" element={<Discussion />} />
            <Route path="/top/:id" element={<DiscussionDetail />} />
            <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
            <Route path="/game/play/:gameId" element={<ProtectedRoute><Game /></ProtectedRoute>} />
            <Route path="/contest" element={<Contest />} />
            <Route path="/contest/:id/problems" element={<ContestProblems />} />
            <Route path="/contest/:id/problem/:problemId" element={<ContestProblemDetail />} />
            {/* <Route path="/contest" element={<Contest />} />
            <Route path="/contest/:contestId/problems" element={<ContestProblems />} />
            <Route path="/contest/:contestId/problem/:problemId" element={<ContestProblemDetail />} /> */}
            {/* <Route path="/contest/:id" element={<ProtectedRoute><Contest /></ProtectedRoute>}/> */}
            <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
            <Route path="/profile/:username" element={<Profile />} />
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