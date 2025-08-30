"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import MarqueeLogos from "../pages/MarqueeLogos"
import StarsBackground from "../components/StarsBackground"
// Utility to detect mobile device
function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}
import axios from "axios"
import {
  Code,
  Trophy,
  Users,
  TrendingUp,
  ArrowRight,
  Play,
  BookOpen,
  Calendar,
  Star,
  Zap,
  Target,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Brain,
  Building2,
  Gift,
  Award,
} from "lucide-react"
import { GoMail } from "react-icons/go"
import { API_URL, SOCKET_URL } from "../config/api"

interface Announcement {
  _id: string
  title: string
  content: string
  type: string
  priority: string
  createdAt: string
  createdBy: {
    username: string
  }
}

interface Contest {
  _id: string
  name: string
  description: string
  startTime: string
  endTime: string
  duration: number
  participants: any[]
  status: string
}

// interface ExploreCard {
//   title: string
//   description: string
//   problems: number
//   difficulty: string
//   color: string
//   icon: React.ReactNode
//   filter: string
// }

interface CompanyStats {
  company: string
  count: number
  avgAcceptanceRate: number
  totalSubmissions: number
  easyCount: number
  mediumCount: number
  hardCount: number
}

// interface TopicStats {
//   topic: string
//   count: number
//   avgAcceptanceRate: number
//   easyCount: number
//   mediumCount: number
//   hardCount: number
// }

export interface TopicStats {
  topic: string;
  count: number;
  avgAcceptanceRate: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
}

export interface ExploreCard {
  title: string;
  description: string;
  problems: number;
  difficulty: string;
  color: string;
  icon: React.ReactNode;
  filter: string;
}

interface PlatformStats {
  totalUsers: number
  totalProblems: number
  totalSubmissions: number
  activeGames: number
  averageRating: number
  topRatedUser?: {
    username: string
    rating: number
  }
}

interface RecentActivity {
  type: "submission" | "game" | "achievement"
  user: string
  description: string
  timestamp: string
}

interface LeaderboardEntry {
  username: string
  rating: number
  gamesPlayed: number
  winRate: number
}

interface UserCoins {
  coins: number
  totalEarned: number
}

const tips = [
  "Tip 1: Solve problems daily to build consistency.",
  "Tip 2: Write clean and readable code.",
  "Tip 3: Debug systematically, not randomly.",
  "Tip 4: Learn by explaining your solution.",
  "Tip 5: Focus on time and space optimization."
];

function LoadingCard() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

const Home: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { isDark } = useTheme()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [userCoins, setUserCoins] = useState<UserCoins>({ coins: 0, totalEarned: 0 })
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalProblems: 0,
    totalSubmissions: 0,
    activeGames: 0,
    averageRating: 1200,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dynamicText, setDynamicText] = useState("P");
   const [tipIndex, setTipIndex] = useState(0);
  console.log("🏠 Home component rendered")

  const carouselItems = [
    {
      title: "Practice & Master",
      description: "Solve 2000+ coding problems from easy to expert level with detailed explanations",
      image: "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["2000+ Problems", "Multiple Languages", "Real-time Testing"],
      gradient: isDark
      ? "from-transparent via-transparent to-transparent"
      : "from-blue-500/20 via-indigo-500/20 to-purple-500/20",
    },
    {
      title: "Compete Globally",
      description: "Join weekly contests and compete with programmers worldwide",
      image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["Weekly Contests", "Global Rankings", "ELO Rating System"],
      gradient: isDark
  ? "from-transparent via-transparent to-transparent"
  : "from-blue-500/20 via-indigo-500/20 to-purple-500/20",
    },
    {
      title: "Play Games Like chess.com",
      description: "Challenge others in live coding battles with anti-cheat protection",
      image: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["Live Battles", "Anti-cheat", "Rating System"],
      gradient: isDark
  ? "from-transparent via-transparent to-transparent"
  : "from-blue-500/20 via-indigo-500/20 to-purple-500/20",
    },
    {
      title: "AI Interview Practice",
      description: "Practice technical interviews with AI-powered questions and feedback",
      image: "https://www.theladders.com/wp-content/uploads/interview-190927.jpg",
      features: ["AI Questions", "Voice Interaction", "Real-time Feedback"],
      gradient: isDark
  ? "from-transparent via-transparent to-transparent"
  : "from-blue-500/20 via-indigo-500/20 to-purple-500/20",
    },
  ]

  useEffect(() => {
    // Fetch data when component mounts, regardless of auth state
    // The data fetching functions should handle auth internally
    console.log("🔄 Home useEffect triggered")
    fetchData()
    fetchTopicStats()
    fetchCompanyStats()
    fetchPlatformData()
    if (user) {
      fetchUserCoins()
    }
  }, [user])

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2000); // Change tip every 2 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  // ...existing code...
  useEffect(() => {
    const fullText = "Programming";
    let i = 1;
    let timeout: NodeJS.Timeout;
    let interval: NodeJS.Timeout;

    const startTyping = () => {
      interval = setInterval(() => {
        setDynamicText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) {
          clearInterval(interval);
          timeout = setTimeout(() => {
            i = 1;
            startTyping();
          }, 5000); // 5 seconds pause after full word
        }
      }, 120); // fast motion
    };

    startTyping();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);
  // Auto-slide carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [carouselItems.length])

  const fetchUserCoins = async () => {
    try {
      // Use coins directly from AuthContext user object (same as Navbar)
      if (user) {
        setUserCoins({
          coins: user.coins || 0,
          totalEarned: user.coins || 0 // Using coins as totalEarned since no separate field exists
        })
        console.log('💰 Updated userCoins from AuthContext:', { coins: user.coins || 0, totalEarned: user.coins || 0 })
      } else {
        setUserCoins({ coins: 0, totalEarned: 0 })
        console.log('💰 No user found, setting coins to 0')
      }
    } catch (error) {
      console.error('Failed to set user coins:', error)
      setUserCoins({ coins: 0, totalEarned: 0 })
    }
  }

  const fetchPlatformData = async () => {
    try {
      console.log("📊 Fetching platform statistics...")
      setError(null)

      // FALLBACK: Use realistic values since we don't have these endpoints yet
      console.log("⚠️ Using realistic fallback data")

      setStats({
        totalUsers: 12847,
        totalProblems: 2156,
        totalSubmissions: 1847392,
        activeGames: 23,
        averageRating: 1342,
        topRatedUser: {
          username: "CodeMaster",
          rating: 2847,
        },
      })

      setRecentActivity([
        {
          type: "submission",
          user: "Alice_Dev",
          description: 'solved "Two Sum" problem',
          timestamp: new Date(Date.now() - 180000).toISOString(),
        },
        {
          type: "game",
          user: "Bob_Coder",
          description: "won a game against Charlie_Pro",
          timestamp: new Date(Date.now() - 420000).toISOString(),
        },
        {
          type: "achievement",
          user: "Diana_Tech",
          description: "earned 'Problem Solver' badge",
          timestamp: new Date(Date.now() - 720000).toISOString(),
        },
      ])

      setLeaderboard([
        { username: "CodeMaster", rating: 2847, gamesPlayed: 156, winRate: 84 },
        { username: "AlgoExpert", rating: 2634, gamesPlayed: 143, winRate: 79 },
        { username: "DevNinja", rating: 2521, gamesPlayed: 198, winRate: 73 },
        { username: "TechGuru", rating: 2387, gamesPlayed: 167, winRate: 71 },
        { username: "CodeWarrior", rating: 2298, gamesPlayed: 134, winRate: 68 },
      ])
    } catch (error) {
      console.error("❌ Error fetching platform data:", error)
      setError("Unable to load latest statistics.")
    }
  }

  const fetchData = async () => {
    console.log("📡 Fetching home page data...")
    try {
      const [announcementsRes, contestsRes] = await Promise.all([
        axios.get(`${API_URL}/announcements`),
        axios.get(`${API_URL}/contests`),
      ])
      console.log("✅ Home data fetched successfully")

      const ann = Array.isArray(announcementsRes.data)
        ? announcementsRes.data
        : announcementsRes.data.announcements || []
      setAnnouncements(ann)
      setContests(contestsRes.data.filter((c: Contest) => c.status === "upcoming").slice(0, 3))
    } catch (error) {
      console.error("❌ Error fetching home data:", error)
      setAnnouncements([])
      setContests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTopicStats = async () => {
    console.log("📊 Fetching topic statistics...")
    try {
      const response = await axios.get(`${API_URL}/problems/topic-stats`)
    if (!response.data) {
      throw new Error('No data received from server');
    }
    
    // console.log("📊 Raw topic stats:", response.data);
    // setTopicStats(response.data);
    // console.log("✅ Topic stats fetched:", response.data.length, "topics")
    // Map the raw topics to their display names
    const mappedStats = response.data.map((stat: TopicStats) => ({
      ...stat,
      count: Number(stat.count),
      avgAcceptanceRate: Number(stat.avgAcceptanceRate),
      easyCount: Number(stat.easyCount),
      mediumCount: Number(stat.mediumCount),
      hardCount: Number(stat.hardCount)
    }));

    console.log("📊 Mapped topic stats:", mappedStats);
    setTopicStats(mappedStats);
    } catch (error) {
      console.error("❌ Error fetching topic stats:", error)
      // Fallback data
      if (typeof window !== 'undefined') {
      setTopicStats([
        { topic: "Array", count: 245, avgAcceptanceRate: 52.3, easyCount: 89, mediumCount: 124, hardCount: 32 },
        {
          topic: "Dynamic Programming",
          count: 187,
          avgAcceptanceRate: 34.7,
          easyCount: 23,
          mediumCount: 98,
          hardCount: 66,
        },
        { topic: "Tree", count: 156, avgAcceptanceRate: 41.2, easyCount: 45, mediumCount: 78, hardCount: 33 },
        { topic: "Graph", count: 134, avgAcceptanceRate: 38.9, easyCount: 34, mediumCount: 67, hardCount: 33 },
        { topic: "String", count: 198, avgAcceptanceRate: 48.6, easyCount: 78, mediumCount: 89, hardCount: 31 },
        { topic: "Hash Table", count: 167, avgAcceptanceRate: 55.1, easyCount: 67, mediumCount: 78, hardCount: 22 },
        { topic: "Two Pointers", count: 89, avgAcceptanceRate: 58.3, easyCount: 34, mediumCount: 45, hardCount: 10 },
        { topic: "Binary Search", count: 76, avgAcceptanceRate: 42.7, easyCount: 23, mediumCount: 34, hardCount: 19 },
      ])
    }
    else{
      setTopicStats([]) // Empty array in production
    }
    }
  }

  const fetchCompanyStats = async () => {
    console.log("🏢 Fetching company statistics...")
    try {
      const response = await axios.get(`${API_URL}/problems/company`)
      setCompanyStats(response.data)
      console.log("✅ Company stats fetched:", response.data.length, "companies")
    } catch (error) {
      console.error("❌ Error fetching company stats:", error)
      // Fallback data
      setCompanyStats([
        {
          company: "Netflix",
          count: 89,
          avgAcceptanceRate: 38.4,
          totalSubmissions: 234567,
          easyCount: 23,
          mediumCount: 45,
          hardCount: 21,
        },
        {
          company: "Google",
          count: 234,
          avgAcceptanceRate: 42.3,
          totalSubmissions: 1234567,
          easyCount: 67,
          mediumCount: 123,
          hardCount: 44,
        },
        {
          company: "Amazon",
          count: 198,
          avgAcceptanceRate: 45.7,
          totalSubmissions: 987654,
          easyCount: 78,
          mediumCount: 89,
          hardCount: 31,
        },
        {
          company: "Microsoft",
          count: 176,
          avgAcceptanceRate: 48.2,
          totalSubmissions: 876543,
          easyCount: 56,
          mediumCount: 87,
          hardCount: 33,
        },
        {
          company: "Apple",
          count: 145,
          avgAcceptanceRate: 44.8,
          totalSubmissions: 654321,
          easyCount: 45,
          mediumCount: 67,
          hardCount: 33,
        },
        {
          company: "Meta",
          count: 134,
          avgAcceptanceRate: 41.9,
          totalSubmissions: 543210,
          easyCount: 43,
          mediumCount: 56,
          hardCount: 35,
        },
        {
          company: "Tesla",
          count: 67,
          avgAcceptanceRate: 35.7,
          totalSubmissions: 123456,
          easyCount: 12,
          mediumCount: 34,
          hardCount: 21,
        },
        {
          company: "Uber",
          count: 78,
          avgAcceptanceRate: 43.2,
          totalSubmissions: 345678,
          easyCount: 23,
          mediumCount: 34,
          hardCount: 21,
        },
      ])
    } finally {
      setStatsLoading(false)
    }
  }

  const getTimeUntilContest = (startTime: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const diff = start.getTime() - now.getTime()

    if (diff <= 0) return "Starting soon"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    return `${hours}h`
  }

  const getExploreCards = (): ExploreCard[] => {
    const topicMap = topicStats.reduce((acc, topic) => {
    acc[topic.topic.toLowerCase()] = topic;
    return acc;
  }, {} as Record<string, TopicStats>);

  const cards = [
      {
        title: "Array",
        description: "Master array manipulation and algorithms",
        problems: topicMap["array"]?.count || 0,
        difficulty: "Easy to Hard",
        color: "from-blue-500 via-blue-600 to-indigo-600",
        icon: <Target className="h-6 w-6" />,
        filter: "Array",
      },
      {
        title: "Dynamic Programming",
        description: "Solve complex optimization problems",
        problems: topicMap["dynamic programming"]?.count || 0,
        difficulty: "Medium to Hard",
        color: "from-purple-500 via-violet-600 to-purple-700",
        icon: <Zap className="h-6 w-6" />,
        filter: "Dynamic Programming",
      },
      {
        title: "Trees & Graphs",
        description: "Navigate through data structures",
        problems: (topicMap["tree"]?.count || 0) + (topicMap["graph"]?.count || 0),
        difficulty: "Easy to Hard",
        color: "from-emerald-500 via-green-600 to-teal-600",
        icon: <BookOpen className="h-6 w-6" />,
        filter: "Tree,Graph",
      },
      {
        title: "String",
        description: "String manipulation and pattern matching",
        problems: topicMap["string"]?.count || 0,
        difficulty: "Easy to Medium",
        color: "from-orange-500 via-amber-600 to-yellow-600",
        icon: <Code className="h-6 w-6" />,
        filter: "String",
      },
      {
        title: "Hash Table",
        description: "Efficient data lookup and storage",
        problems: topicMap["hash table"]?.count || 0,
        difficulty: "Easy to Hard",
        color: "from-teal-500 via-cyan-600 to-blue-600",
        icon: <Trophy className="h-6 w-6" />,
        filter: "Hash Table",
      },
      {
        title: "Two Pointers",
        description: "Optimize array and string problems",
        problems: topicMap["two pointers"]?.count || 0,
        difficulty: "Easy to Medium",
        color: "from-pink-500 via-rose-600 to-red-600",
        icon: <TrendingUp className="h-6 w-6" />,
        filter: "Two Pointers",
      },
      {
        title: "Binary Search",
        description: "Efficient searching algorithms",
        problems: topicMap["binary search"]?.count || 0,
        difficulty: "Medium to Hard",
        color: "from-indigo-500 via-purple-600 to-violet-600",
        icon: <Star className="h-6 w-6" />,
        filter: "Binary Search",
      },
    ]

    console.log('🗺️ Topic Map:', topicMap);
  console.log('🎴 Explore Cards:', cards);

  return cards;
  }

  const getCompanies = () => {
    const companyMap = companyStats.reduce(
      (acc, company) => {
        acc[company.company] = company
        return acc
      },
      {} as Record<string, CompanyStats>,
    )

    const companyConfigs = [
      {
        name: "Netflix",
        logo: "https://images.pexels.com/photos/265685/pexels-photo-265685.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-red-600 via-red-700 to-red-800",
        bgGradient: "from-red-50 to-red-100",
        darkBgGradient: "from-red-900/20 to-red-800/20",
        borderColor: "border-red-200",
        darkBorderColor: "border-red-700/30",
        textColor: "text-red-700",
        darkTextColor: "text-red-300",
      },
      {
        name: "Google",
        logo: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-blue-500 via-red-500 to-yellow-500",
        bgGradient: "from-blue-50 to-red-50",
        darkBgGradient: "from-blue-900/20 to-red-900/20",
        borderColor: "border-blue-200",
        darkBorderColor: "border-blue-700/30",
        textColor: "text-blue-700",
        darkTextColor: "text-blue-300",
      },
      {
        name: "Amazon",
        logo: "https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-orange-500 via-amber-500 to-yellow-500",
        bgGradient: "from-orange-50 to-amber-50",
        darkBgGradient: "from-orange-900/20 to-amber-900/20",
        borderColor: "border-orange-200",
        darkBorderColor: "border-orange-700/30",
        textColor: "text-orange-700",
        darkTextColor: "text-orange-300",
      },
      {
        name: "Microsoft",
        logo: "https://images.pexels.com/photos/159304/network-cable-ethernet-computer-159304.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-blue-600 via-cyan-500 to-teal-500",
        bgGradient: "from-blue-50 to-cyan-50",
        darkBgGradient: "from-blue-900/20 to-cyan-900/20",
        borderColor: "border-blue-200",
        darkBorderColor: "border-blue-700/30",
        textColor: "text-blue-700",
        darkTextColor: "text-blue-300",
      },
      {
        name: "Apple",
        logo: "https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-gray-600 via-slate-600 to-gray-700",
        bgGradient: "from-gray-50 to-slate-50",
        darkBgGradient: "from-gray-800/20 to-slate-800/20",
        borderColor: "border-gray-200",
        darkBorderColor: "border-gray-700/30",
        textColor: "text-gray-700",
        darkTextColor: "text-gray-300",
      },
      {
        name: "Meta",
        logo: "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-blue-600 via-indigo-600 to-purple-600",
        bgGradient: "from-blue-50 to-purple-50",
        darkBgGradient: "from-blue-900/20 to-purple-900/20",
        borderColor: "border-blue-200",
        darkBorderColor: "border-blue-700/30",
        textColor: "text-blue-700",
        darkTextColor: "text-blue-300",
      },
      {
        name: "Tesla",
        logo: "https://images.pexels.com/photos/35967/mini-cooper-auto-model-vehicle.jpg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-red-500 via-pink-500 to-rose-500",
        bgGradient: "from-red-50 to-pink-50",
        darkBgGradient: "from-red-900/20 to-pink-900/20",
        borderColor: "border-red-200",
        darkBorderColor: "border-red-700/30",
        textColor: "text-red-700",
        darkTextColor: "text-red-300",
      },
      {
        name: "Uber",
        logo: "https://images.pexels.com/photos/97075/pexels-photo-97075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300",
        color: "from-gray-900 via-gray-800 to-black",
        bgGradient: "from-gray-50 to-gray-100",
        darkBgGradient: "from-gray-800/20 to-gray-900/20",
        borderColor: "border-gray-200",
        darkBorderColor: "border-gray-700/30",
        textColor: "text-gray-700",
        darkTextColor: "text-gray-300",
      },
    ]

    return companyConfigs.map((config) => ({
      ...config,
      stats: companyMap[config.name] || {
        company: config.name,
        count: 0,
        avgAcceptanceRate: 0,
        totalSubmissions: 0,
        easyCount: 0,
        mediumCount: 0,
        hardCount: 0,
      },
    }))
  }

  const getTopCompanies = () => {
    const companyMap = companyStats.reduce((acc, company) => {
      acc[company.company] = company
      return acc
    }, {} as Record<string, CompanyStats>)

    const topCompanyConfigs = [
      { name: "Google", icon: "🏢", color: "from-blue-600 to-red-500" },
      { name: "Microsoft", icon: "💻", color: "from-blue-600 to-cyan-500" },
      { name: "Amazon", icon: "📦", color: "from-orange-500 to-yellow-500" },
      { name: "Apple", icon: "🍎", color: "from-gray-800 to-gray-600" },
      { name: "Meta", icon: "👥", color: "from-blue-600 to-purple-600" },
      { name: "Netflix", icon: "🎬", color: "from-red-600 to-black" }
    ]

    return topCompanyConfigs.map((config) => ({
      ...config,
      count: companyMap[config.name]?.count || 0,
    }))
  }

  const quickStats = [
    {
      label: "Problems Solved",
      value: user ? `${user.stats?.problemsSolved?.total || 0} problems` : "Sign In to Check",
      icon: <Code className="h-5 w-5" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Total Submissions",
      value: user ? `${user.stats?.totalSubmissions + user.stats?.correctSubmissions || 0} submissions` : "Start Now",
      icon: <Star className="h-5 w-5" />,
      color: "from-purple-500 to-pink-500",
    },
  ]

  const exploreCards = getExploreCards()
  const companies = getCompanies()
  const topCompanies = getTopCompanies()

  // Show loading spinner only if we're in the initial loading state and don't know auth status yet
  const isInitialLoading = authLoading && user === null && !localStorage.getItem('token');
  
  if (isInitialLoading) {
  return(
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

  // Responsive logic for gap and text
  const getResponsiveSettings = () => {
    if (typeof window === 'undefined') return { gapClass: '', dynamicText: dynamicText, buttonGap: '' };
    const width = window.innerWidth;
    if (width >= 768 && width <= 1023) {
      return { gapClass: 'mt-8', dynamicText: dynamicText, buttonGap: 'mt-8' };
    }
    if (width >= 1024 && width <= 1460) {
      return { gapClass: '', dynamicText: 'Coding', buttonGap: '' };
    }
    return { gapClass: '', dynamicText: dynamicText, buttonGap: '' };
  }

  return (
    <div
      className={`h-screen overflow-y-auto transition-colors duration-300 relative ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
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
            @keyframes wave-motion {
              0%, 100% { 
                clip-path: polygon(0% 47%, 10% 48%, 33% 54%, 54% 60%, 70% 61%, 84% 59%, 100% 52%, 100% 100%, 0% 100%);
                opacity: 0.2;
              }
              50% { 
                clip-path: polygon(0% 60%, 15% 65%, 34% 66%, 51% 62%, 67% 50%, 84% 45%, 100% 46%, 100% 100%, 0% 100%);
                opacity: 0.3;
              }
            }
            @keyframes subtle-wave {
              0%, 100% {
                background-position: 0% 50%;
                opacity: 0.1;
              }
              50% {
                background-position: 100% 50%;
                opacity: 0.2;
              }
            }
            @keyframes text-glow {
              0%, 100% { 
                text-shadow: 0 0 5px rgba(59, 130, 246, 0.3), 0 0 10px rgba(59, 130, 246, 0.2);
              }
              50% { 
                text-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2);
              }
            }
            @keyframes premium-text-wave {
              0%, 100% { 
                background-position: 0% 50%;
                text-shadow: 0 5px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 255, 255, 0.2);
              }
              25% {
                background-position: 25% 50%;
                text-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 255, 255, 0.3);
              }
              50% { 
                background-position: 100% 50%;
                text-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 50px rgba(255, 255, 255, 0.4);
              }
              75% {
                background-position: 75% 50%;
                text-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 255, 255, 0.3);
              }
            }
            @keyframes elegant-float {
              0%, 100% { 
                transform: translateY(0px) scale(1);
                filter: brightness(1);
              }
              50% { 
                transform: translateY(-5px) scale(1.02);
                filter: brightness(1.1);
              }
            }
            @keyframes gradient-text-shift {
              0%, 100% { 
                background-position: 0% 50%;
              }
              50% { 
                background-position: 100% 50%;
              }
            }
            @keyframes text-shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            @keyframes particle-float {
              0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translateY(-100px) translateX(50px) rotate(360deg); opacity: 0; }
            }
            @keyframes gradient-shift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
            @keyframes card-entrance {
              0% { 
                opacity: 0; 
                transform: translateY(30px) scale(0.95) rotateX(10deg);
                filter: blur(5px);
              }
              100% { 
                opacity: 1; 
                transform: translateY(0) scale(1) rotateX(0deg);
                filter: blur(0px);
              }
            }
            @keyframes magnetic-pull {
              0%, 100% { transform: scale(1) rotate(0deg); }
              25% { transform: scale(1.05) rotate(1deg); }
              50% { transform: scale(1.1) rotate(-1deg); }
              75% { transform: scale(1.05) rotate(0.5deg); }
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
            .wave-effect {
              animation: wave-motion 6s ease-in-out infinite;
            }
            .subtle-wave {
              animation: subtle-wave 8s ease-in-out infinite;
              background-size: 200% 200%;
            }
            .text-glow-effect {
              animation: text-glow 3s ease-in-out infinite;
            }
            .premium-text-wave {
              animation: premium-text-wave 6s ease-in-out infinite;
              background-size: 200% 200%;
            }
            .elegant-float {
              animation: elegant-float 4s ease-in-out infinite;
            }
            .gradient-text-shift {
              animation: gradient-text-shift 4s ease-in-out infinite;
              background-size: 200% 200%;
            }
            .text-shimmer {
              background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.4) 50%,
                rgba(255, 255, 255, 0) 100%
              );
              background-size: 200% 100%;
              animation: text-shimmer 3s infinite;
              -webkit-background-clip: text;
              background-clip: text;
            }
            .particle-system {
              animation: particle-float 4s ease-out infinite;
            }
            .gradient-animate {
              animation: gradient-shift 4s ease infinite;
              background-size: 400% 400%;
            }
            .card-animate-in {
              animation: card-entrance 0.6s ease-out forwards;
            }
            .magnetic-hover:hover {
              animation: magnetic-pull 0.6s ease-in-out;
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
            @keyframes light-hover-glow {
              0%, 100% { 
                box-shadow: 0 10px 30px rgba(59, 130, 246, 0.1), 0 5px 15px rgba(147, 51, 234, 0.1);
                transform: translateY(0px) scale(1);
              }
              50% { 
                box-shadow: 0 20px 50px rgba(59, 130, 246, 0.2), 0 10px 25px rgba(147, 51, 234, 0.2);
                transform: translateY(-5px) scale(1.02);
              }
            }
            @keyframes light-card-shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            @keyframes light-border-dance {
              0%, 100% { 
                border-color: rgba(59, 130, 246, 0.3);
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
              }
              25% { 
                border-color: rgba(147, 51, 234, 0.4);
                box-shadow: 0 0 25px rgba(147, 51, 234, 0.15);
              }
              50% { 
                border-color: rgba(236, 72, 153, 0.4);
                box-shadow: 0 0 30px rgba(236, 72, 153, 0.2);
              }
              75% { 
                border-color: rgba(34, 197, 94, 0.4);
                box-shadow: 0 0 25px rgba(34, 197, 94, 0.15);
              }
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
            .light-hover-glow:hover {
              animation: light-hover-glow 0.6s ease-in-out;
            }
            .light-card-shimmer {
              background: linear-gradient(
                90deg,
                rgba(59, 130, 246, 0) 0%,
                rgba(59, 130, 246, 0.1) 25%,
                rgba(147, 51, 234, 0.1) 50%,
                rgba(236, 72, 153, 0.1) 75%,
                rgba(59, 130, 246, 0) 100%
              );
              background-size: 200% 100%;
              animation: light-card-shimmer 3s infinite;
            }
            .light-border-dance {
              animation: light-border-dance 4s ease-in-out infinite;
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
            <div className="absolute top-3/4 right-1/4 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-violet-200/20 light-morph rounded-full blur-lg" style={{ animationDelay: '6s' }}></div>
            
            {/* Orbiting Colored Elements */}
            <div className="absolute top-1/3 left-1/2 w-3 h-3">
              <div className="light-orbit absolute w-2 h-2 bg-gradient-to-r from-blue-400/40 to-purple-400/40 rounded-full shadow-lg"></div>
            </div>
            <div className="absolute top-2/3 left-1/3 w-4 h-4">
              <div className="light-orbit absolute w-2.5 h-2.5 bg-gradient-to-r from-pink-400/40 to-orange-400/40 rounded-full shadow-lg" style={{ animationDelay: '12s', animationDuration: '35s' }}></div>
            </div>
            <div className="absolute top-1/6 right-1/4 w-3 h-3">
              <div className="light-orbit absolute w-1.5 h-1.5 bg-gradient-to-r from-green-400/40 to-cyan-400/40 rounded-full shadow-lg" style={{ animationDelay: '8s', animationDuration: '20s' }}></div>
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
            
            {/* Medium Floating Elements */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`light-medium-${i}`}
                className={`light-floating absolute w-2.5 h-2.5 rounded-full blur-sm ${
                  i % 5 === 0 ? 'bg-blue-300/25' :
                  i % 5 === 1 ? 'bg-purple-300/25' :
                  i % 5 === 2 ? 'bg-pink-300/25' :
                  i % 5 === 3 ? 'bg-green-300/25' : 'bg-yellow-300/25'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${4 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 4}s`,
                }}
              />
            ))}
            
            {/* Color Shifting Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 color-shift rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 color-shift rounded-full blur-3xl opacity-25" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-1/2 left-0 w-60 h-60 color-shift rounded-full blur-2xl opacity-20" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-1/4 right-0 w-72 h-72 color-shift rounded-full blur-3xl opacity-15" style={{ animationDelay: '6s' }}></div>
          </div>
        </>
      )}
      
      {/* Hero Section with Enhanced Carousel */}
      {/* Hero Section with Enhanced Carousel */}
      <div className="relative overflow-hidden min-h-screen">
        {isDark && !isMobile() ? (
          <StarsBackground />
        ) : (
          <>
            {/* Fixed Gradient Background for Light Mode */}
            <div className={isDark ? "absolute inset-0 bg-black" : "absolute inset-0 bg-gradient-to-br from-blue-700 via-purple-600 to-pink-600"}></div>
          </>
        )}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10"></div>
        {/* Light mode floating elements */}
        {!isDark && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`light-float-${i}`}
                className={`absolute w-2 h-2 rounded-full ${
                  i % 4 === 0 ? 'bg-blue-300/30' :
                  i % 4 === 1 ? 'bg-indigo-300/30' :
                  i % 4 === 2 ? 'bg-purple-300/30' : 'bg-pink-300/30'
                } light-floating`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${4 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 subtle-wave"></div>

        {/* Enhanced Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse morphing-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse morphing-blob" style={{ animationDelay: '4s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl floating-ball"></div>
          <div className="absolute bottom-1/4 right-1/3 w-24 h-24 bg-gradient-to-br from-pink-400/10 to-orange-400/10 rounded-full blur-2xl floating-ball" style={{ animationDelay: '2s' }}></div>
        </div>

  <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-0 pt-0 sm:pt-6 md:pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-screen">
            {/* Left Content */}
            <div className="z-10 space-y-8 card-animate-in">
              <div className="space-y-3">
                <h1 className={`text-5xl md:text-8xl font-bold text-white leading-[1.2] relative elegant-float ${getResponsiveSettings().gapClass}`}>
                  <span className="relative inline-block premium-text-wave">
                    Master
                  </span>
                  <span className="block pb-3 relative overflow-hidden leading-[1.25]">
                    <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent gradient-text-shift font-extrabold relative">
                      {getResponsiveSettings().dynamicText}
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent text-shimmer"></div>
                    </span>
                  </span>
                  <span className="block text-4xl md:text-5xl mt-2 relative">
                    <span className="premium-text-wave">Like Never Before</span>
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl card-animate-in" style={{ animationDelay: '0.2s' }}>
                  Join thousands of developers mastering coding skills through our comprehensive platform featuring
                  <span className="font-semibold text-yellow-300 animate-pulse"> interactive problems</span>,
                  <span className="font-semibold text-green-300 animate-pulse" style={{ animationDelay: '0.5s' }}> live contests</span>, and
                  <span className="font-semibold text-blue-300 animate-pulse" style={{ animationDelay: '1s' }}> real-time battles</span>.
                </p>
              </div>

              {!user ? (
                <div className={`flex flex-col sm:flex-row gap-4 card-animate-in ${getResponsiveSettings().buttonGap}`} style={{ animationDelay: '0.4s' }}>
                  <Link
                    to="/register"
                    className="group relative overflow-hidden bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-2xl hover:shadow-white/25 hover:scale-105 magnetic-hover"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300 gradient-animate"></div>
                    <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce" />
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    
                    {/* Button glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/50 to-purple-400/50 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></div>
                  </Link>
                  <Link
                    to="/problems"
                    className="group border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center justify-center backdrop-blur-sm hover:scale-105 magnetic-hover"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Explore Problems
                    
                    {/* Border glow effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/70 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>
                  </Link>
                </div>
              ) : (
                <div className={`flex flex-col sm:flex-row gap-4 card-animate-in ${getResponsiveSettings().buttonGap}`} style={{ animationDelay: '0.4s' }}>
                  <Link
                    to="/problems"
                    className="group relative overflow-hidden bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-2xl hover:shadow-white/25 hover:scale-105 magnetic-hover"
                  >
                    <Brain className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                    Continue Learning
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                    
                    {/* Button glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/50 to-purple-400/50 opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-500"></div>
                  </Link>
                  <Link
                    to="/contest"
                    className="group border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center justify-center backdrop-blur-sm hover:scale-105 magnetic-hover"
                  >
                    <Trophy className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Join Contest
                    
                    {/* Border glow effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/70 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300"></div>
                  </Link>
                </div>
              )}
            </div>

            {/* Right Carousel */}
              {/* Right Carousel: Only show on devices >= 768px */}
              <div className="relative card-animate-in hidden md:block" style={{ animationDelay: '0.6s' }}>
                <div className="relative h-96 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm border border-white/20">
                  {carouselItems.map((item, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-95"
                      }`}
                    >
                      <div className="relative h-full">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent gradient-animate"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                          <h3 className="text-3xl font-bold mb-3 text-red-180 text-glow-effect">
                            {item.title}
                          </h3>
                          <p className="text-white/90 mb-4 text-lg leading-relaxed">{item.description}</p>
                          <div className="flex flex-wrap gap-3">
                            {item.features.map((feature, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30 hover:scale-105 transition-transform duration-300"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Carousel Indicators */}
                <div className="flex justify-center mt-6 space-x-3">
                  {carouselItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all duration-300 rounded-full ${
                        index === currentSlide ? "w-8 h-3 bg-white shadow-lg" : "w-3 h-3 bg-white/50 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>

                {/* Enhanced Quick Stats */}
                <div className="mt-8">
                  <div className="grid grid-cols-2 gap-4">
                    {quickStats.map((stat, index) => (
                      <div
                        key={index}
                        className="group relative overflow-hidden bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                        ></div>
                        <div className="relative">
                          <div className="flex items-center mb-3 text-white">
                            <div className="p-2 bg-white/20 rounded-lg mr-3 group-hover:scale-110 transition-transform duration-300">
                              {stat.icon}
                            </div>
                            <span className="text-sm font-medium text-white/90">{stat.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-white group-hover:scale-105 transition-transform duration-300">
                            {stat.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Enhanced Explore Section */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                Master Every
                <span className={`bg-gradient-to-r ${
                  isDark 
                    ? "from-blue-600 via-purple-600 to-pink-600" 
                    : "from-blue-500 via-purple-500 to-pink-500"
                } bg-clip-text text-transparent`}>
                  {" "}
                  Algorithm
                </span>
              </h2>
              <p className={`text-xl max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Discover curated problem sets and learning paths designed to take you from beginner to expert
              </p>
            </div>          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
              {exploreCards.map((card, index) => (
                <Link
                  key={index}
                  to={`/problems?tags=${encodeURIComponent(card.filter)}`}
                  className={`group relative overflow-hidden rounded-3xl transition-all duration-500 flex-shrink-0 w-80 h-72 md:h-80 hover:scale-105 hover:shadow-2xl ${
                    isDark
                      ? "bg-gray-800/50 border-2 border-white/30 hover:bg-gray-800/80 hover:border-white/50"
                      : "bg-white/90 border-2 border-gray-200/60 hover:bg-white hover:border-gray-300/80 shadow-lg hover:shadow-xl"
                  } backdrop-blur-sm`}
                >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 ${
                    isDark ? "group-hover:opacity-20" : "group-hover:opacity-15"
                  } transition-all duration-500`}
                ></div>                  <div className="relative p-8 h-full flex flex-col justify-between">
                    <div>
                      <div
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} text-white mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}
                      >
                        {card.icon}
                      </div>
                      <h3
                        className={`text-xl font-bold mb-3 transition-all duration-300 ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {card.title}
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {card.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                          {statsLoading ? "..." : card.problems.toLocaleString()}
                        </div>
                        <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>problems</div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${card.color} text-white shadow-lg`}
                      >
                        {card.difficulty}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Feature Cards - Coins & Certificates with Premium Animations */}
        {user && (
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className={`text-3xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                <span className={`${
                  isDark 
                    ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-pulse" 
                    : "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse"
                }`}>
                  Unlock Your Potential
                </span>
              </h2>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-12 h-[2px] bg-gradient-to-r from-transparent ${
                  isDark ? "via-yellow-400" : "via-blue-500"
                } to-transparent animate-pulse`}></div>
                <div className={`w-2 h-2 ${
                  isDark ? "bg-yellow-400" : "bg-blue-500"
                } rounded-full animate-bounce`}></div>
                <div className={`w-12 h-[2px] bg-gradient-to-r from-transparent ${
                  isDark ? "via-orange-400" : "via-purple-500"
                } to-transparent animate-pulse`}></div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coins & Redeem Feature with Advanced Animations */}
              <div className={`group relative overflow-hidden rounded-3xl transition-all duration-700 hover:scale-[1.03] transform-gpu ${
                isDark 
                  ? "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 border-2 border-white/30 hover:border-white/50" 
                  : "bg-gradient-to-br from-white via-yellow-50 to-orange-50 border-2 border-black/30 hover:border-black/50"
              } shadow-2xl hover:shadow-3xl hover:shadow-yellow-500/20`}>
                
                {/* Floating Animation Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400/30 to-orange-500/30 rounded-full blur-xl animate-bounce delay-100"></div>
                  <div className="absolute top-1/2 -left-8 w-12 h-12 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-lg animate-pulse delay-300"></div>
                  <div className="absolute bottom-4 right-1/3 w-8 h-8 bg-gradient-to-br from-yellow-300/40 to-orange-400/40 rounded-full blur-md animate-ping delay-500"></div>
                </div>

                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-orange-500/5 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
                
                {/* Animated Border Glow */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-yellow-400/50 via-orange-500/50 to-red-500/50 opacity-0 group-hover:opacity-20 blur-xl transition-all duration-700"></div>
                
                <div className="relative p-8 z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {/* Coin Icon with Advanced Animation */}
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 transform-gpu">
                          <span className="text-2xl animate-bounce">🪙</span>
                        </div>
                        {/* Floating Notification Badge */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-xs text-white font-bold animate-bounce delay-200">!</span>
                        </div>
                        {/* Ripple Effect */}
                        <div className="absolute inset-0 rounded-2xl bg-yellow-400/30 animate-ping opacity-0 group-hover:opacity-100"></div>
                      </div>
                      <div className="transform transition-all duration-500 group-hover:translate-x-2">
                        <h3 className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"} group-hover:text-yellow-600 transition-colors duration-300`}>
                          You have{" "}
                          <span className="relative inline-block">
                            <span className="text-yellow-500 font-extrabold text-3xl animate-pulse">
                              {userCoins.coins}
                            </span>
                            {/* Glowing effect on coins number */}
                            <div className="absolute inset-0 text-yellow-500 font-extrabold text-3xl animate-ping opacity-0 group-hover:opacity-30"></div>
                          </span>{" "}
                          coins
                        </h3>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} transition-all duration-300 group-hover:text-yellow-600`}>
                          Total earned: {userCoins.totalEarned} coins
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className={`text-lg mb-6 ${isDark ? "text-gray-300" : "text-gray-700"} ${isDark ? "group-hover:text-gray-200" : "group-hover:text-gray-600"} transition-colors duration-300`}>
                    Redeem your hard-earned coins for amazing rewards! Get exclusive merchandise, gift cards, and premium features.
                  </p>

                  {/* Animated Reward Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { name: "T-Shirts", cost: "500", color: "blue", delay: "0" },
                      { name: "Gift Cards", cost: "2000", color: "green", delay: "100" },
                      { name: "Headphones", cost: "1200", color: "purple", delay: "200" }
                    ].map((item, index) => (
                      <div 
                        key={index}
                        className={`text-center p-3 rounded-lg transition-all duration-500 hover:scale-110 hover:rotate-2 transform-gpu ${
                          isDark ? "bg-gray-700/50 hover:bg-gray-700 border border-white/20 hover:border-white/40" : "bg-white/70 hover:bg-white border border-black/20 hover:border-black/40"
                        } hover:shadow-xl`}
                        style={{ animationDelay: `${item.delay}ms` }}
                      >
                        <div className={`text-lg font-bold animate-pulse ${
                          isDark 
                            ? `text-${item.color}-400` 
                            : `text-${item.color}-600`
                        }`}>
                          {item.name}
                        </div>
                        <div className={`text-xs ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                          {item.cost} coins
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Premium Animated Button */}
                  <Link
                    to="/redeem"
                    className="w-full relative overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-500 flex items-center justify-center group/button shadow-2xl hover:shadow-3xl transform hover:scale-105"
                  >
                    {/* Button ripple effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                    
                    <span className="mr-2 animate-bounce">🎁</span>
                    <span className="relative z-10">Redeem Now</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover/button:translate-x-2 transition-transform duration-300" />
                    
                    {/* Button glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 opacity-0 group-hover/button:opacity-30 blur-xl transition-opacity duration-500"></div>
                  </Link>
                </div>
              </div>

              {/* Company Certificates Feature with Premium Animations */}
              <div className={`group relative overflow-hidden rounded-3xl transition-all duration-700 hover:scale-[1.03] transform-gpu ${
                isDark 
                  ? "bg-gradient-to-br from-gray-800 via-blue-900/20 to-purple-900/20 border-2 border-white/30 hover:border-white/50" 
                  : "bg-gradient-to-br from-white via-blue-50 to-purple-50 border-2 border-black/30 hover:border-black/50"
              } shadow-2xl hover:shadow-3xl hover:shadow-blue-500/20`}>
                
                {/* Floating Animation Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute top-4 right-8 w-12 h-12 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-full blur-lg animate-float"></div>
                  <div className="absolute bottom-8 left-4 w-8 h-8 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-full blur-md animate-bounce delay-700"></div>
                  <div className="absolute top-1/2 right-4 w-6 h-6 bg-gradient-to-br from-blue-300/40 to-cyan-400/40 rounded-full blur-sm animate-ping delay-1000"></div>
                </div>

                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                {/* Trophy Animation Styles */}
                <style>{`
                  @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    25% { transform: translateY(-10px) rotate(2deg); }
                    50% { transform: translateY(-5px) rotate(-1deg); }
                    75% { transform: translateY(-15px) rotate(1deg); }
                  }
                  .animate-float {
                    animation: float 4s ease-in-out infinite;
                  }
                  @keyframes trophy-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6), 0 0 60px rgba(147, 51, 234, 0.3); }
                  }
                  .trophy-glow {
                    animation: trophy-glow 2s ease-in-out infinite;
                  }
                `}</style>
                
                <div className="relative p-8 z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {/* Trophy Icon with Advanced Animation */}
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500 transform-gpu trophy-glow">
                          <Trophy className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        {/* Star Badge with Rotation */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-spin">
                          <Star className="h-3 w-3 text-white" />
                        </div>
                        {/* Orbital Rings */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/30 animate-ping opacity-0 group-hover:opacity-100"></div>
                        <div className="absolute inset-[-4px] rounded-2xl border border-purple-400/20 animate-pulse opacity-0 group-hover:opacity-100"></div>
                      </div>
                      <div className="transform transition-all duration-500 group-hover:translate-x-2">
                        <h3 className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"} group-hover:text-blue-600 transition-colors duration-300`}>
                          Earn{" "}
                          <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse font-extrabold">
                            Certificates
                          </span>
                        </h3>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} transition-all duration-300 group-hover:text-blue-600`}>
                          Complete company-specific problems
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className={`text-lg mb-6 ${isDark ? "text-gray-300" : "text-gray-700"} ${isDark ? "group-hover:text-gray-200" : "group-hover:text-gray-600"} transition-colors duration-300`}>
                    Solve 100% of problems from top tech companies and earn professional certificates to boost your portfolio!
                  </p>

                  {/* Animated Company Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {topCompanies.slice(0, 4).map((company, index) => (
                      <Link
                        key={company.name}
                        to={`/company/${company.name}`}
                        className={`group/company p-3 rounded-lg transition-all duration-500 hover:scale-105 transform-gpu ${
                          isDark ? "bg-gray-700/50 hover:bg-gray-700 border border-white/20 hover:border-white/40" : "bg-white/70 hover:bg-white border-2 border-black/20 hover:border-black/40"
                        } hover:shadow-xl hover:border-blue-300`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${company.color} rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover/company:rotate-12 group-hover/company:scale-110 transition-all duration-500 shadow-lg`}>
                            <span className="animate-pulse">{company.icon}</span>
                          </div>
                          <div className="transform transition-all duration-300 group-hover/company:translate-x-1">
                            <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"} ${isDark ? "group-hover/company:text-blue-400" : "group-hover/company:text-blue-600"} transition-colors duration-300`}>
                              {company.name}
                            </div>
                            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"} ${isDark ? "group-hover/company:text-blue-300" : "group-hover/company:text-blue-500"} transition-colors duration-300`}>
                              {company.count} problems
                            </div>
                          </div>
                        </div>
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-lg bg-blue-400/10 opacity-0 group-hover/company:opacity-100 transition-opacity duration-300"></div>
                      </Link>
                    ))}
                  </div>

                  {/* Premium Animated Button */}
                  <Link
                    to="/problems?company=all"
                    className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-500 flex items-center justify-center group/button shadow-2xl hover:shadow-3xl transform hover:scale-105"
                  >
                    {/* Button wave effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                    
                    <Building2 className="mr-2 h-5 w-5 animate-bounce" />
                    <span className="relative z-10">Explore All Companies</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover/button:translate-x-2 transition-transform duration-300" />
                    
                    {/* Button particles effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover/button:opacity-20 blur-xl transition-opacity duration-500"></div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Announcements & Contests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Announcements */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Latest Announcements
              </h2>
              <Link
                to="/announcements"
                className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm hover:underline"
              >
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p>Loading announcements...</p>
                </div>
              ) : announcements.length > 0 ? (
                announcements.slice(0, 3).map((announcement) => (
                  <Link
                    key={announcement._id}
                    to={`/announcements/${announcement._id}`}
                    className={`group relative overflow-hidden p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] block ${
                      isDark
                        ? "bg-gradient-to-r from-orange-900/20 to-red-900/20 border-2 border-white/20 hover:bg-orange-900/30 hover:border-white/40"
                        : "bg-gradient-to-r from-orange-50 to-red-50 border-2 border-black/20 hover:bg-orange-100 hover:border-black/40"
                    } border-l-4 border-l-orange-500 hover:shadow-lg`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium mr-3 ${
                              announcement.priority === "high"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : announcement.priority === "medium"
                                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                  : "bg-green-500/20 text-green-400 border border-green-500/30"
                            }`}
                          >
                            {announcement.type}
                          </span>
                          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            {new Date(announcement.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4
                          className={`font-bold mb-2 group-hover:text-orange-600 transition-colors line-clamp-1 ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {announcement.title}
                        </h4>

                        <p
                          className={`text-sm mb-2 leading-relaxed line-clamp-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          {announcement.content}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            By {announcement.createdBy?.username || "Admin"}
                          </span>
                          <span className="text-orange-600 text-sm font-medium group-hover:underline">Read more →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                      isDark ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <BookOpen className={`h-8 w-8 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                  </div>
                  <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>No announcements yet</p>
                </div>
              )}

              {announcements.length > 3 && (
                <div className="text-center pt-4">
                  <Link
                    to="/announcements"
                    className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm hover:underline"
                  >
                    View all announcements
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Contests */}
          <div
            className={`relative overflow-hidden rounded-3xl p-8 transition-all duration-300 ${
              isDark ? "bg-gray-800/50 border-2 border-white/30 hover:border-white/50" : "bg-white border-2 border-black/30 hover:border-black/50"
            } backdrop-blur-sm hover:shadow-2xl`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Upcoming Contests
                  </h3>
                  <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>Compete with developers worldwide</p>
                </div>
                <Link to="/contest" className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline">
                  View all
                </Link>
              </div>

              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p>Loading contests...</p>
                  </div>
                ) : contests.length > 0 ? (
                  contests.map((contest) => (
                    <Link
                      key={contest._id}
                      to="/contest"
                      className={`group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? "bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-2 border-white/20 hover:border-white/40"
                          : "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-black/20 hover:bg-blue-100 hover:border-black/40"
                      } hover:shadow-lg block`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4
                            className={`font-bold mb-2 group-hover:text-blue-600 transition-colors ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {contest.name}
                          </h4>
                          <p className={`text-sm mb-4 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                            {contest.description}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-blue-600 mb-1">
                            {getTimeUntilContest(contest.startTime)}
                          </div>
                          <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>remaining</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className={`flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>{new Date(contest.startTime).toLocaleDateString()}</span>
                        </div>
                        <div className={`flex items-center ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <Users className="h-4 w-4 mr-2" />
                          <span>{contest.participants.length} registered</span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        isDark ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <Trophy className={`h-10 w-10 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
                    </div>
                    <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>No upcoming contests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          <MarqueeLogos />
          
        {/* Learn and Upskill Section */}
        <div
          className={`relative overflow-hidden rounded-3xl p-12 mb-20 ${
            isDark ? "bg-gray-800/50 border-2 border-white/30" : "bg-white border-2 border-black/30"
          } backdrop-blur-sm`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-red-500/5"></div>
          <div className="relative">
            <div className="text-center mb-12">
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                Learn and
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                  {" "}
                  Upskill
                </span>
              </h2>
              <p className={`text-xl max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Master essential skills with our curated learning paths and comprehensive tutorials
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
                {[
                  {
                    title: "Data Structures & Algorithms",
                    description: "Master the fundamentals of DSA with comprehensive tutorials and practice problems",
                    link: "https://www.youtube.com/watch?v=y3OOaXrFy-Q&list=PLQEaRBV9gAFu4ovJ41PywklqI7IyXwr01",
                    image: "https://tse3.mm.bing.net/th/id/OIP.IodRARzhZ9CBPYBS2_9LEgHaEK?pid=Api&P=0&h=180",
                    color: "from-blue-500 to-indigo-600",
                    icon: "🧮"
                  },
                  {
                    title: "System Design",
                    description: "Learn how to design scalable systems and architect robust applications",
                    link: "https://www.youtube.com/watch?v=AK0hu0Zxua4&list=PLQEaRBV9gAFvzp6XhcNFpk1WdOcyVo9qT",
                    image: "https://tse2.mm.bing.net/th/id/OIP.0iCWYNiceXNXodc6dWCZewHaDe?pid=Api&P=0&h=180",
                    color: "from-green-500 to-emerald-600",
                    icon: "🏗️"
                  },
                  {
                    title: "Full Stack Development",
                    description: "Build complete web applications from frontend to backend with modern technologies",
                    link: "https://www.youtube.com/watch?v=tVzUXW6siu0&list=PLu0W_9lII9agq5TrH9XLIKQvv0iaF2X3w&pp=0gcJCV8EOCosWNin",
                    image: "https://i.ytimg.com/vi/tVzUXW6siu0/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLBenW1M30gqWfrb8bLNydwUJiebEA",
                    color: "from-purple-500 to-violet-600",
                    icon: "💻"
                  },
                  {
                    title: "Spring Boot",
                    description: "Master Java Spring Boot framework for enterprise application development",
                    link: "https://www.youtube.com/watch?v=Zxwq3aW9ctU&list=PLsyeobzWxl7qbKoSgR5ub6jolI8-ocxCF",
                    image: "https://i.ytimg.com/vi/Zxwq3aW9ctU/hqdefault.jpg?sqp=-oaymwEXCOADEI4CSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLBPvSBVpeCabK8qzRMBY6XNM4VRSw",
                    color: "from-orange-500 to-red-600",
                    icon: "🌱"
                  },
                  {
                    title: "Generative AI",
                    description: "Explore the cutting-edge world of AI and machine learning technologies",
                    link: "https://www.youtube.com/watch?v=WOyZid8OkkI&list=PLd7PleJR_EFfRYiLdagOsv4FczMl1Cxt_",
                    image: "https://i.ytimg.com/vi/WOyZid8OkkI/hq720.jpg?sqp=-oaymwEXCNAFEJQDSFryq4qpAwkIARUAAIhCGAE=&rs=AOn4CLAr8shMX8h7efRCCis0s5kBP0Iugw",
                    color: "from-cyan-500 to-blue-600",
                    icon: "🤖"
                  }
                ].map((topic, index) => (
                  <a
                    key={index}
                    href={topic.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative overflow-hidden rounded-3xl transition-all duration-500 flex-shrink-0 w-80 h-96 hover:scale-105 hover:shadow-2xl ${
                      isDark
                        ? "bg-gray-800/80 border-2 border-gray-600/50 hover:bg-gray-700/90 hover:border-gray-500/70"
                        : "bg-white/95 border-2 border-gray-200/60 hover:bg-white hover:border-gray-300/80 shadow-lg hover:shadow-2xl light-hover-glow light-border-dance"
                    } backdrop-blur-sm shadow-lg`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-0 ${
                        isDark ? "group-hover:opacity-15" : "group-hover:opacity-12"
                      } transition-all duration-500`}
                    ></div>

                    {/* Light mode shimmer effect */}
                    {!isDark && (
                      <div className="absolute inset-0 light-card-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"></div>
                    )}

                    <div className="relative h-full flex flex-col">
                      {/* Image Section */}
                      <div className="relative h-48 overflow-hidden rounded-t-3xl">
                        <img
                          src={topic.image}
                          alt={topic.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className={`absolute inset-0 ${
                          isDark 
                            ? "bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" 
                            : "bg-gradient-to-t from-black/60 via-transparent to-transparent"
                        }`}></div>
                        
                        {/* Topic Icon */}
                        <div className="absolute top-4 right-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${topic.color} rounded-2xl flex items-center justify-center text-white text-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`}>
                            {topic.icon}
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className={`flex-1 p-6 flex flex-col justify-between ${
                        isDark ? "bg-gray-800/90" : "bg-white/95 group-hover:bg-white"
                      } rounded-b-3xl transition-all duration-300`}>
                        <div>
                          <h3
                            className={`text-xl font-bold mb-3 transition-all duration-300 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {topic.title}
                          </h3>
                          <p className={`text-sm leading-relaxed ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}>
                            {topic.description}
                          </p>
                        </div>

                        {/* Call to Action */}
                        <div className="mt-4">
                          <div className={`inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r ${topic.color} text-white font-medium text-sm shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 ${
                            !isDark ? "group-hover:shadow-blue-300/50" : ""
                          }`}>
                            <span className="mr-2">Start Learning</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${topic.color} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`}></div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Company Interview Practice */}
        <div
          className={`relative overflow-hidden rounded-3xl p-12 mb-20 ${
            isDark ? "bg-gray-800/50 border-2 border-white/30" : "bg-white border-2 border-black/30"
          } backdrop-blur-sm`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-cyan-500/5"></div>
          <div className="relative">
            <div className="text-center mb-12">
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                Practice by
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {" "}
                  Company
                </span>
              </h2>
              <p className={`text-xl max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Prepare for interviews at top tech companies with curated problem sets and real interview questions
              </p>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-8 pb-4" style={{ width: "max-content" }}>
                {companies.map((company, index) => (
                  <Link
                    key={index}
                    to={`/company/${encodeURIComponent(company.name)}`}
                    className={`group relative overflow-hidden rounded-3xl transition-all duration-500 flex-shrink-0 w-80 h-[480px] hover:scale-105 hover:shadow-2xl ${
                      isDark
                        ? `bg-gradient-to-br ${company.darkBgGradient} border-2 border-white/30 hover:bg-gray-800/80 hover:border-white/50`
                        : `bg-gradient-to-br ${company.bgGradient} border-2 border-black/30 hover:bg-gray-50 hover:border-black/50`
                    } backdrop-blur-sm`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${company.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                    ></div>

                    <div className="relative h-full flex flex-col">
                      {/* Company Logo Section */}
                      <div className="h-48 overflow-hidden rounded-t-3xl relative">
                        <img
                          src={company.logo || "/placeholder.svg"}
                          alt={company.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

                        {/* Company Badge */}
                        <div className="absolute top-4 left-4">
                          <div
                            className={`flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm ${company.textColor}`}
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {company.name}
                          </div>
                        </div>

                        {/* Stats Badge */}
                        <div className="absolute top-4 right-4">
                          <div className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {Number(company.stats.avgAcceptanceRate).toFixed(2)}% avg
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <h3
                            className={`text-2xl font-bold mb-3 transition-all duration-300 ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {company.name}
                          </h3>
                          <p className={`text-sm mb-6 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                            Master {company.name} interview questions with our curated problem collection and real
                            interview experiences.
                          </p>
                        </div>

                        {/* Statistics Grid */}
                        <div className="space-y-4">
                          {/* Problem Count */}
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Total Problems
                            </span>
                            <span
                              className={`text-2xl font-bold ${company.textColor} ${isDark ? company.darkTextColor : ""}`}
                            >
                              {statsLoading ? "..." : company.stats.count.toLocaleString()}
                            </span>
                          </div>

                          {/* Difficulty Breakdown */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                <span className={isDark ? "text-gray-300" : "text-gray-600"}>Easy</span>
                              </div>
                              <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {company.stats.easyCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                                <span className={isDark ? "text-gray-300" : "text-gray-600"}>Medium</span>
                              </div>
                              <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {company.stats.mediumCount}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                                <span className={isDark ? "text-gray-300" : "text-gray-600"}>Hard</span>
                              </div>
                              <span className={`font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                {company.stats.hardCount}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className={`w-full rounded-full h-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                              <div
                                className={`bg-gradient-to-r ${company.color} h-2 rounded-full transition-all duration-1000 group-hover:w-full`}
                                style={{ width: `${Math.min(company.stats.avgAcceptanceRate, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={isDark ? "text-gray-400" : "text-gray-500"}>Success Rate</span>
                              <span
                                className={`font-medium ${company.textColor} ${isDark ? company.darkTextColor : ""}`}
                              >
                                {company.stats.avgAcceptanceRate}%
                              </span>
                            </div>
                          </div>

                          {/* Submissions Count */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                              Total Submissions
                            </span>
                            <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {company.stats.totalSubmissions.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Features Section */}
        <div
          className={`relative overflow-hidden rounded-3xl p-12 mb-20 ${
            isDark ? "bg-gray-800/50 border-2 border-white/30" : "bg-white border-2 border-black/30"
          } backdrop-blur-sm`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
          <div className="relative">
            <div className="text-center mb-16">
              <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
                Everything You Need to
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {" "}
                  Excel
                </span>
              </h2>
              <p className={`text-xl max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Our comprehensive platform provides all the tools and resources you need to become an exceptional
                programmer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <Code className="h-8 w-8" />,
                  title: "Practice Problems",
                  description: "2000+ coding problems from easy to expert level with detailed solutions",
                  link: "/problems",
                  color: "from-orange-500 to-red-500",
                  bgColor: "from-orange-500/10 to-red-500/10",
                },
                {
                  icon: <Trophy className="h-8 w-8" />,
                  title: "Global Contests",
                  description: "Weekly contests to compete with programmers worldwide and climb rankings",
                  link: "/contest",
                  color: "from-yellow-500 to-orange-500",
                  bgColor: "from-yellow-500/10 to-orange-500/10",
                },
                {
                  icon: <Play className="h-8 w-8" />,
                  title: "Real-time Battles",
                  description: "Challenge others in live coding battles with anti-cheat protection",
                  link: "/game",
                  color: "from-green-500 to-teal-500",
                  bgColor: "from-green-500/10 to-teal-500/10",
                },
                {
                  icon: <Users className="h-8 w-8" />,
                  title: "Community",
                  description: "Connect with developers, share solutions, and learn together",
                  link: "/top",
                  color: "from-blue-500 to-purple-500",
                  bgColor: "from-blue-500/10 to-purple-500/10",
                },
              ].map((feature, index) => (
                <Link
                  key={index}
                  to={feature.link}
                  className={`group relative overflow-hidden p-8 rounded-3xl transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
                    isDark
                      ? "bg-gray-800/50 border-2 border-white/30 hover:bg-gray-800/80 hover:border-white/50"
                      : "bg-white border-2 border-black/30 hover:bg-gray-50 hover:border-black/50"
                  } backdrop-blur-sm`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  ></div>
                  <div className="relative text-center">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}
                    >
                      {feature.icon}
                    </div>
                    <h3
                      className={`text-xl font-bold mb-4 transition-all duration-300 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {feature.title}
                    </h3>
                    <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {feature.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                  <Code className="h-8 w-8 text-white" />
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  CodeThrone
                </span>
              </div>
              <p className="text-gray-300 mb-8 max-w-md text-lg leading-relaxed">
                Master coding skills with our comprehensive platform featuring problems, contests, and real-time
                battles. Join thousands of developers improving their skills every day.
              </p>
              <div className="flex space-x-4">
                {[
                  {
                    icon: <Github className="h-6 w-6" />,
                    href: "https://github.com/CodingEnthusiastic",
                    color: "hover:text-gray-300",
                  },
                  {
                    icon: <GoMail className="h-6 w-6" />,
                    href: "https://mail.google.com/",
                    color: "hover:text-blue-400",
                  },
                  {
                    icon: <Linkedin className="h-6 w-6" />,
                    href: "https://www.linkedin.com/in/rishabh-shenoy-3b3566286/",
                    color: "hover:text-blue-500",
                  },
                ].map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    className={`p-3 bg-gray-800 rounded-xl text-gray-400 ${social.color} transition-all duration-300 hover:scale-110 hover:bg-gray-700`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-white">Quick Links</h3>
              <ul className="space-y-4">
                {[
                  { name: "Problems", href: "/problems" },
                  { name: "Contests", href: "/contest" },
                  { name: "Game Mode", href: "/game" },
                  { name: "Discussions", href: "/top" },
                  { name: "Interview Practice", href: "/interview" },
                ].map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="text-gray-300 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-white">Contact</h3>
              <ul className="space-y-4">
                {[
                  { icon: <Mail className="h-5 w-5" />, text: "rishabh10d58@gmail.com" },
                  { icon: <Phone className="h-5 w-5" />, text: "+91 7058055335" },
                  { icon: <MapPin className="h-5 w-5" />, text: "Mumbai, India" },
                ].map((contact, index) => (
                  <li key={index} className="flex items-center text-gray-300 group">
                    <div className="p-2 bg-gray-800 rounded-lg mr-3 group-hover:bg-gray-700 transition-colors duration-300">
                      {contact.icon}
                    </div>
                    <span className="group-hover:text-white transition-colors duration-300">{contact.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 CodeThrone. All rights reserved. Built with ❤️ for developers.</p>
            <div className="flex space-x-8 mt-4 md:mt-0">
              {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link, index) => (
                <a
                  key={index}
                  href="#"
                  className="text-gray-400 hover:text-white text-sm transition-colors duration-300 hover:underline"
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home;