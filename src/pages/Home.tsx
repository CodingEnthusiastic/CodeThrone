"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
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
} from "lucide-react"
import { GoMail } from "react-icons/go"

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

const Home: React.FC = () => {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [topicStats, setTopicStats] = useState<TopicStats[]>([])
  const [companyStats, setCompanyStats] = useState<CompanyStats[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
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

  console.log("🏠 Home component rendered")

  const carouselItems = [
    {
      title: "Practice & Master",
      description: "Solve 2000+ coding problems from easy to expert level with detailed explanations",
      image: "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["2000+ Problems", "Multiple Languages", "Real-time Testing"],
      gradient: "from-violet-600 via-purple-600 to-blue-600",
    },
    {
      title: "Compete Globally",
      description: "Join weekly contests and compete with programmers worldwide",
      image: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["Weekly Contests", "Global Rankings", "ELO Rating System"],
      gradient: "from-orange-500 via-red-500 to-pink-600",
    },
    {
      title: "Real-time Battles",
      description: "Challenge others in live coding battles with anti-cheat protection",
      image: "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["Live Battles", "Anti-cheat", "Rating System"],
      gradient: "from-green-600 via-green-700 to-green-500",
    },
    {
      title: "AI Interview Practice",
      description: "Practice technical interviews with AI-powered questions and feedback",
      image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800",
      features: ["AI Questions", "Voice Interaction", "Real-time Feedback"],
      gradient: "from-indigo-500 via-blue-500 to-cyan-500",
    },
  ]

  useEffect(() => {
    console.log("🔄 Home useEffect triggered")
    fetchData()
    fetchTopicStats()
    fetchCompanyStats()
    fetchPlatformData()
  }, [])

  // Auto-slide carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [carouselItems.length])

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
        axios.get("http://localhost:5000/api/announcements"),
        axios.get("http://localhost:5000/api/contests"),
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
      const response = await axios.get("http://localhost:5000/api/problems/topic-stats")
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
      if (process.env.NODE_ENV === 'development') {
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
      const response = await axios.get("http://localhost:5000/api/problems/company")
      setCompanyStats(response.data)
      console.log("✅ Company stats fetched:", response.data.length, "companies")
    } catch (error) {
      console.error("❌ Error fetching company stats:", error)
      // Fallback data
      setCompanyStats([
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
          company: "Netflix",
          count: 89,
          avgAcceptanceRate: 38.4,
          totalSubmissions: 234567,
          easyCount: 23,
          mediumCount: 45,
          hardCount: 21,
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

  const quickStats = [
    {
      label: "Problems Solved",
      value: user ? user.stats.problemsSolved.total + " problems" : "Sign In to Check",
      icon: <Code className="h-5 w-5" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Total Submissions",
      value: user ? user.submissions.length + " submissions" : "Start Now",
      icon: <Star className="h-5 w-5" />,
      color: "from-purple-500 to-pink-500",
    },
  ]

  const exploreCards = getExploreCards()
  const companies = getCompanies()

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
      {/* Hero Section with Enhanced Carousel */}
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${carouselItems[currentSlide].gradient}`}></div>
        <div className="absolute inset-0 bg-black/20"></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pb-0 pt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[700px]">
            {/* Left Content */}
            <div className="z-10 space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl md:text-8xl font-bold text-white leading-[1.2]">
                  Master
                  <span className="block pb-3 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent leading-[1.25]">
                    Programming
                  </span>
                  <span className="block text-4xl md:text-5xl mt-2">Like Never Before</span>
                </h1>

                <p className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl">
                  Join thousands of developers mastering coding skills through our comprehensive platform featuring
                  <span className="font-semibold text-yellow-300"> interactive problems</span>,
                  <span className="font-semibold text-green-300"> live contests</span>, and
                  <span className="font-semibold text-blue-300"> real-time battles</span>.
                </p>
              </div>

              {!user ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/register"
                    className="group relative overflow-hidden bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-2xl hover:shadow-white/25 hover:scale-105"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <Rocket className="mr-2 h-5 w-5 group-hover:animate-bounce" />
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <Link
                    to="/problems"
                    className="group border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center justify-center backdrop-blur-sm hover:scale-105"
                  >
                    <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Explore Problems
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/problems"
                    className="group relative overflow-hidden bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-2xl hover:shadow-white/25 hover:scale-105"
                  >
                    <Brain className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                    Continue Learning
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <Link
                    to="/contest"
                    className="group border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white hover:text-gray-900 transition-all duration-300 inline-flex items-center justify-center backdrop-blur-sm hover:scale-105"
                  >
                    <Trophy className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Join Contest
                  </Link>
                </div>
              )}
            </div>

            {/* Right Carousel */}
            <div className="relative">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          {item.title}
                        </h3>
                        <p className="text-white/90 mb-4 text-lg leading-relaxed">{item.description}</p>
                        <div className="flex flex-wrap gap-3">
                          {item.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium border border-white/30"
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
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {" "}
                Algorithm
              </span>
            </h2>
            <p className={`text-xl max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Discover curated problem sets and learning paths designed to take you from beginner to expert
            </p>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
              {exploreCards.map((card, index) => (
                <Link
                  key={index}
                  to={`/problems?tags=${encodeURIComponent(card.filter)}`}
                  className={`group relative overflow-hidden rounded-3xl transition-all duration-500 flex-shrink-0 w-80 h-72 md:h-80 hover:scale-105 hover:shadow-2xl ${
                    isDark
                      ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/80"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  } border backdrop-blur-sm`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-20 transition-all duration-500`}
                  ></div>

                  <div className="relative p-8 h-full flex flex-col justify-between">
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

        {/* Enhanced Announcements & Contests Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {/* Announcements */}
          <section>
            <h2 className={`text-2xl font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
              Latest Announcements
            </h2>
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
                        ? "bg-gradient-to-r from-orange-900/20 to-red-900/20 border-orange-500/30 hover:bg-orange-900/30"
                        : "bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 hover:bg-orange-100"
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
              isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200"
            } border backdrop-blur-sm hover:shadow-2xl`}
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
                    <div
                      key={contest._id}
                      className={`group relative overflow-hidden p-6 rounded-2xl transition-all duration-300 hover:scale-105 ${
                        isDark
                          ? "bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30"
                          : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                      } border hover:shadow-lg`}
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
                    </div>
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

        {/* Enhanced Company Interview Practice */}
        <div
          className={`relative overflow-hidden rounded-3xl p-12 mb-20 ${
            isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200"
          } border backdrop-blur-sm`}
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
                        ? `bg-gradient-to-br ${company.darkBgGradient} border ${company.darkBorderColor} hover:bg-gray-800/80`
                        : `bg-gradient-to-br ${company.bgGradient} border ${company.borderColor} hover:bg-gray-50`
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
            isDark ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200"
          } border backdrop-blur-sm`}
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
                      ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/80"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  } border backdrop-blur-sm`}
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
                  CodeArena
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
            <p className="text-gray-400 text-sm">© 2025 CodeArena. All rights reserved. Built with ❤️ for developers.</p>
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

export default Home
