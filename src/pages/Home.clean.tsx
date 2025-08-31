import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  ArrowRight, 
  Code, 
  Trophy, 
  Users, 
  Zap,
  Star,
  TrendingUp,
  Award,
  Target,
  Brain
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';

interface Contest {
  _id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  participants: any[];
  status: string;
}

interface CompanyStats {
  company: string;
  count: number;
  avgAcceptanceRate: number;
  totalSubmissions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [contests, setContests] = useState<Contest[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contestsRes, statsRes] = await Promise.all([
          axios.get(`${API_URL}/api/contest`),
          axios.get(`${API_URL}/api/problems/company-stats`)
        ]);
        
        setContests(contestsRes.data.slice(0, 3));
        setCompanyStats(statsRes.data.slice(0, 12));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "1000+ Problems",
      description: "Curated coding challenges from top companies"
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Live Contests",
      description: "Compete with developers worldwide"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Community",
      description: "Learn together with 10k+ developers"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Interview",
      description: "Practice with AI-powered mock interviews"
    }
  ];

  const companies = [
    'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 
    'Adobe', 'Uber', 'Airbnb', 'Tesla', 'Twitter', 'LinkedIn'
  ];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading CodeThrone...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)] py-12 lg:py-20">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Cracking Top{' '}
                <span className="text-blue-600">Software Jobs</span>{' '}
                made Simple!
              </h1>
              
              <p className={`text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                We combine a world-class curriculum, live mentorship, and a step-by-step
                gamified growth process to ensure you can crack any coding test or interview with
                confidence!
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link
                  to={user ? "/problems" : "/register"}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 inline-flex items-center justify-center"
                >
                  {user ? "Start Practicing" : "Start learning for Free"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                
                {!user && (
                  <Link
                    to="/login"
                    className={`px-8 py-4 rounded-lg text-lg font-semibold border-2 transition-colors duration-200 inline-flex items-center justify-center ${
                      isDark
                        ? 'border-gray-700 text-gray-300 hover:bg-gray-800'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Join Premium
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    1000+
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Happy Careers
                  </div>
                </div>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    30+
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    LPA Average
                  </div>
                </div>
                <div>
                  <div className={`text-2xl sm:text-3xl font-bold ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    95%
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Success Rate
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Company Logos */}
            <div className="relative">
              <div className="grid grid-cols-3 gap-6 items-center justify-items-center">
                {companies.slice(0, 6).map((company, index) => (
                  <div
                    key={company}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-300 hover:scale-110 ${
                      isDark
                        ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl'
                    }`}
                    style={{ 
                      animationDelay: `${index * 0.1}s`,
                      animation: 'fadeIn 0.6s ease-out forwards'
                    }}
                  >
                    {company.slice(0, 3)}
                  </div>
                ))}
              </div>
              
              {/* Floating Animation */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-4 h-4 bg-blue-500/20 rounded-full animate-ping"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-purple-500/20 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Top Resources at Your Disposal
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Don't settle for just an Average job, Start preparing for MAANG jobs today!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl'
                }`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  isDark ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <div className={isDark ? 'text-white' : 'text-blue-600'}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {feature.title}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Stats Section */}
      <section className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Practice Problems from Top Companies
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Master coding interviews with real questions from MAANG and other top tech companies
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {companyStats.slice(0, 12).map((stat) => (
              <Link
                key={stat.company}
                to={`/problems?company=${encodeURIComponent(stat.company)}`}
                className={`p-6 rounded-xl border text-center transition-all duration-300 hover:scale-105 group ${
                  isDark
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl'
                }`}
              >
                <div className={`text-2xl font-bold mb-2 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {stat.count}
                </div>
                <div className={`text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {stat.company}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Problems
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/problems"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 inline-flex items-center"
            >
              Explore All Problems
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Contests Section */}
      {contests.length > 0 && (
        <section className={`py-20 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Live Contests
              </h2>
              <p className={`text-lg max-w-3xl mx-auto ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Compete with the best and showcase your coding skills
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {contests.map((contest) => (
                <div
                  key={contest._id}
                  className={`p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                    isDark
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200 shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className={`h-6 w-6 ${
                      contest.status === 'active' ? 'text-green-500' : 'text-blue-600'
                    }`} />
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      contest.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {contest.status}
                    </span>
                  </div>
                  
                  <h3 className={`text-xl font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {contest.name}
                  </h3>
                  
                  <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {contest.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {contest.participants.length} participants
                    </div>
                    <Link
                      to={`/contest/${contest._id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Join Contest →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us Section */}
      <section className={`py-20 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              CodeThrone is Different!
            </h2>
            <p className={`text-lg max-w-3xl mx-auto ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              We make sure that the prep is highly focused and aimed towards the best results for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-8 w-8" />,
                title: "Focused Learning Path",
                description: "Structured curriculum designed by industry experts"
              },
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Real-time Coding",
                description: "Practice with live coding battles and multiplayer games"
              },
              {
                icon: <Award className="h-8 w-8" />,
                title: "Interview Preparation",
                description: "AI-powered mock interviews and behavioral questions"
              },
              {
                icon: <TrendingUp className="h-8 w-8" />,
                title: "Progress Tracking",
                description: "Detailed analytics and performance insights"
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: "Community Support",
                description: "Learn together with thousands of developers"
              },
              {
                icon: <Star className="h-8 w-8" />,
                title: "Gamified Experience",
                description: "Earn coins, unlock achievements, and climb leaderboards"
              }
            ].map((item, index) => (
              <div
                key={index}
                className={`text-center p-8 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDark
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${
                  isDark ? 'bg-blue-600' : 'bg-blue-100'
                }`}>
                  <div className={isDark ? 'text-white' : 'text-blue-600'}>
                    {item.icon}
                  </div>
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.title}
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${isDark ? 'bg-gray-800' : 'bg-blue-600'}`}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            What are you waiting for?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who have already started their journey to crack top tech interviews
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={user ? "/problems" : "/register"}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors duration-200 inline-flex items-center justify-center"
            >
              {user ? "Start Practicing" : "Start Learning for Free"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            
            <Link
              to="/contest"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200 inline-flex items-center justify-center"
            >
              Join Live Contest
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
