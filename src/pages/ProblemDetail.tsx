// 

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Play, Send, Clock, MemoryStick as Memory, CheckCircle, XCircle, BookOpen, Video, Code, FileText, MessageSquare, Bot, Eye, Calendar, User, Coins, Copy } from 'lucide-react';
import CodeMirrorEditor from '../components/CodeMirrorEditor';
import { API_URL, SOCKET_URL } from "../config/api";

interface Problem {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  companies: string[];
  constraints: string;
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  testCases: {
    input: string;
    output: string;
    isPublic: boolean;
  }[];
  acceptanceRate: number;
  submissions: number;
  accepted: number;
  editorial?: {
    written?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  codeTemplates?: Record<string, string>;
}

interface Submission {
  _id: string;
  status: string;
  language: string;
  runtime: number;
  memory: number;
  date: string;
  code?: string;
}

interface Solution {
  language: string;
  completeCode: string;
}

interface RunResult {
  status: string;
  passedTests: number;
  totalTests: number;
  testResults: {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: number;
    memory: number;
  }[];
  executionTime: number;
  memory: number;
  error?: string;
  potd?: {
    awarded: boolean;
    coinsEarned: number;
    totalCoins: number;
    reason: string;
  };
}

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token, updateCoins } = useAuth(); // ✅ Get token from auth context
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [submissionResult, setSubmissionResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [editorial, setEditorial] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{prompt: string, response: string}[]>([]);

  // Predefined quick prompts for better user experience
  const quickPrompts = [
    "What's the optimal approach to solve this problem?",
    "What data structures should I use?",
    "Can you explain the algorithm with time complexity?",
    "What are the edge cases I should consider?",
    "How can I optimize my solution?",
    "Explain the problem with an example",
    "What are common mistakes to avoid?"
  ];

  // Generate contextual prompts based on problem
  const getContextualPrompts = () => {
    if (!problem) return quickPrompts;
    
    const contextualPrompts = [...quickPrompts];
    
    // Add difficulty-specific prompts
    if (problem.difficulty === 'Hard') {
      contextualPrompts.push("Break down this complex problem into smaller subproblems");
      contextualPrompts.push("What advanced algorithms are applicable here?");
    } else if (problem.difficulty === 'Easy') {
      contextualPrompts.push("What's the simplest approach to solve this?");
    }
    
    // Add tag-specific prompts
    if (problem.tags?.includes('Dynamic Programming')) {
      contextualPrompts.push("How can I identify the DP pattern here?");
      contextualPrompts.push("What's the recurrence relation?");
    }
    if (problem.tags?.includes('Graph')) {
      contextualPrompts.push("Should I use DFS or BFS for this graph problem?");
    }
    if (problem.tags?.includes('Tree')) {
      contextualPrompts.push("What tree traversal method should I use?");
    }
    if (problem.tags?.includes('Array')) {
      contextualPrompts.push("Are there any array manipulation techniques I should consider?");
    }
    
    return contextualPrompts;
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      alert('Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Code copied to clipboard!');
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
        alert('Failed to copy code');
      }
      document.body.removeChild(textArea);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProblem();
      if (user) {
        checkIfSolved();
      }
    }
  }, [id, user]);

  useEffect(() => {
    // Anti-cheat: Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => prev + 1);
        if (tabSwitchCount >= 2) {
          alert('Tab switching detected! This may affect your submission.');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tabSwitchCount]);

  useEffect(() => {
    // Anti-cheat: Prevent pasting
    const preventPaste = (e: Event) => {
      e.preventDefault();
      alert('Pasting is not allowed in coding challenges!');
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', preventPaste);
      return () => textarea.removeEventListener('paste', preventPaste);
    }
  }, []);

  const fetchProblem = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}`);
      setProblem(response.data);
      // setCode(getDefaultCode(language));
      setCode(response.data.codeTemplates?.[language] || '');

    } catch (error) {
      console.error('Error fetching problem:', error);
    } finally {
      setLoading(false);
    }
  };
  const generateResponse = async () => {
    if (!aiPrompt.trim()) {
      alert('Please enter a prompt.');
      return;
    }

    if (!token) {
      alert('Please login to use AI chat feature.');
      return;
    }

    if (!problem) {
      alert('Problem data not loaded yet. Please wait.');
      return;
    }

    setAiLoading(true);
    setAiResponse('');

    try {
      // Send comprehensive problem data to AI
      const problemData = {
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        tags: problem.tags,
        companies: problem.companies,
        constraints: problem.constraints,
        examples: problem.examples
      };

      const res = await axios.post(`${API_URL}/gemini`, {
        prompt: aiPrompt,
        problemData: problemData, // Send complete problem context
        context: problem?.description || ''
      }, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });

      setAiResponse(res.data.reply || 'No response received.');
      
      // Add to chat history
      setChatHistory(prev => [...prev, {
        prompt: aiPrompt,
        response: res.data.reply || 'No response received.'
      }]);
      
      // Clear the prompt input
      setAiPrompt('');
    } catch (error) {
      console.error('AI Error:', error);
      setAiResponse('Something went wrong while generating the response.');
    } finally {
      setAiLoading(false);
    }
  };

  const checkIfSolved = async () => {
    if (!user || !id || !token) return;
    
    try {
      const response = await axios.get(`${API_URL}/profile/${user.username}/solved`, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });
      const solvedProblems = response.data.solvedProblems;
      setIsSolved(solvedProblems.some((p: any) => p._id === id));
    } catch (error) {
      console.error('Error checking solved status:', error);
    }
  };

  const fetchEditorial = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/editorial`);
      setEditorial(response.data.editorial);
    } catch (error) {
      console.error('Error fetching editorial:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!user || !token) return;
    
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchSolutions = async () => {
    try {
      const response = await axios.get(`${API_URL}/problems/${id}/solutions`);
      setSolutions(response.data.solutions);
    } catch (error) {
      console.error('Error fetching solutions:', error);
    }
  };

  // 
  const handleLanguageChange = (newLanguage: string) => {
  setLanguage(newLanguage);

  if (problem?.codeTemplates) {
    setCode(problem.codeTemplates[newLanguage] || '');
  } else {
    setCode('');
  }
};


  const handleRun = async () => {
    if (!code.trim()) {
      alert('Please write some code before running!');
      return;
    }

    if (!token) {
      alert('Please login to run code.');
      return;
    }

    setRunning(true);
    setRunResult(null);
    
    try {
      console.log('🔑 Running code with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/problems/${id}/run`, {
        code,
        language
      }, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });
      setRunResult(response.data);
    } catch (error: any) {
      console.error('Error running code:', error);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        return;
      }
      setRunResult({
        status: 'Error',
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || 'Failed to run code'
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      alert('Please write some code before submitting!');
      return;
    }

    if (!token) {
      alert('Please login to submit solutions.');
      return;
    }

    setSubmitting(true);
    setSubmissionResult(null);
    
    try {
      console.log('🔑 Submitting solution with token:', token.substring(0, 20) + '...');
      const response = await axios.post(`${API_URL}/problems/${id}/submit`, {
        code,
        language
      }, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });
      setSubmissionResult(response.data);
      
      // Check if problem is now solved
      if (response.data.status === 'Accepted') {
        setIsSolved(true);
        
        // Check if POTD coins were awarded and update user coins in real-time
        if (response.data.potd && response.data.potd.awarded) {
          console.log('🪙 POTD coins awarded! Updating user coins in real-time:', response.data.potd);
          updateCoins(response.data.potd.totalCoins);
          
          // Show a success notification for POTD completion
          setTimeout(() => {
            alert(`🎉 Congratulations! You solved today's Problem of the Day and earned ${response.data.potd.coinsEarned} coins! 🪙`);
          }, 1000);
        }
      }

      // Refresh submissions to show the new one
      if (activeTab === 'submissions') {
        fetchSubmissions();
      }
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      if (error.response?.status === 401) {
        alert('Authentication failed. Please login again.');
        return;
      }
      setSubmissionResult({
        status: 'Error',
        passedTests: 0,
        totalTests: 0,
        testResults: [],
        executionTime: 0,
        memory: 0,
        error: error.response?.data?.error || 'Submission failed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Fetch data when tab is opened
    if (tab === 'editorial' && !editorial) {
      fetchEditorial();
    } else if (tab === 'submissions' && submissions.length === 0) {
      fetchSubmissions();
    } else if (tab === 'solutions' && solutions.length === 0) {
      fetchSolutions();
    }
  };

  const handleSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    if (submission.code) {
      setCode(submission.code);
      setLanguage(submission.language);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'Hard': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Success': return 'text-green-600 dark:text-green-400';
      case 'Wrong Answer':
      case 'Failed': return 'text-red-600 dark:text-red-400';
      case 'Compilation Error':
      case 'Error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Success': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'Wrong Answer':
      case 'Failed': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'Compilation Error':
      case 'Error': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Loading problem details...</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Problem not found</h2>
          <p className="text-gray-600 dark:text-gray-400">The problem you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Description Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 h-[calc(100vh-120px)] flex flex-col">
            {/* Problem Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  {problem.title}
                  {isSolved && (
                    <span className="ml-3 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full flex items-center shadow-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Solved
                    </span>
                  )}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm border ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {problem.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-lg px-4 py-2 backdrop-blur-sm">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Acceptance Rate: {problem.acceptanceRate.toFixed(1)}%
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Submissions: {problem.submissions}
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  Accepted: {problem.accepted}
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <nav className="flex space-x-8 px-0">
                {[
                  { id: 'description', label: 'Description', icon: <FileText className="h-4 w-4" /> },
                  { id: 'editorial', label: 'Editorial', icon: <BookOpen className="h-4 w-4" /> },
                  { id: 'solutions', label: 'Solutions', icon: <Code className="h-4 w-4" /> },
                  { id: 'submissions', label: 'Submissions', icon: <Send className="h-4 w-4" /> },
                  { id: 'chatai', label: 'ChatAI', icon: <Bot className="h-4 w-4" /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 hover:scale-105 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-t-lg'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className={`transition-colors ${activeTab === tab.id ? 'text-blue-500 dark:text-blue-400' : ''}`}>
                      {tab.icon}
                    </span>
                    <span className="ml-2">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex-1">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      Problem Description
                    </h3>
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      {problem.description}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                      <Code className="h-5 w-5 mr-2 text-green-500" />
                      Examples
                    </h3>
                    {problem.examples.map((example, index) => (
                      <div key={index} className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="mb-2">
                          <strong className="text-gray-900 dark:text-gray-100">Input:</strong>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded mt-1 text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 overflow-x-auto">
                            {example.input}
                          </pre>
                        </div>
                        <div className="mb-2">
                          <strong className="text-gray-900 dark:text-gray-100">Output:</strong>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded mt-1 text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 overflow-x-auto">
                            {example.output}
                          </pre>
                        </div>
                        {example.explanation && (
                          <div>
                            <strong className="text-gray-900 dark:text-gray-100">Explanation:</strong>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
                              {example.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                      <Memory className="h-5 w-5 mr-2 text-purple-500" />
                      Constraints
                    </h3>
                    <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                      {problem.constraints}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'editorial' && (
                <div>
                  {editorial ? (
                    <div>
                      {editorial.written && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                            <BookOpen className="h-5 w-5 mr-2 text-indigo-500" />
                            Written Editorial
                          </h3>
                          <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                              {editorial.written}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {editorial.videoUrl && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                            <Video className="h-5 w-5 mr-2 text-red-500" />
                            Video Editorial
                          </h3>
                          <a
                            href={editorial.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-video rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border border-gray-200 dark:border-gray-700"
                          >
                            <img
                              src={editorial.thumbnailUrl}
                              alt="Video Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </a>
                          <div className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Video className="h-5 w-5 mr-2" />
                            <a
                              href={editorial.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium"
                            >
                              Watch Video Editorial
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Editorial not available yet</p>
                      <p className="text-sm mt-2">Check back later for detailed solutions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'solutions' && (
                <div>
                  {solutions.length > 0 ? (
                    <div className="space-y-6">
                      {solutions.map((solution, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                              <Code className="h-5 w-5 mr-2 text-emerald-500" />
                              Official Solution - {solution.language.toUpperCase()}
                            </h4>
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm rounded-full border border-emerald-200 dark:border-emerald-800">
                              {solution.language}
                            </span>
                          </div>
                          <div className="relative">
                            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
                              <code className="text-gray-800 dark:text-gray-200">{solution.completeCode}</code>
                            </pre>
                            <div className="absolute top-2 right-2 opacity-70 hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => copyToClipboard(solution.completeCode)}
                                className="p-2 bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Copy code to clipboard"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Code className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No solutions available yet</p>
                      <p className="text-sm mt-2">Official solutions will appear here once published</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'submissions' && (
                <div>
                  {user && token ? (
                    submissions.length > 0 ? (
                      <div className="space-y-3">
                        {submissions.map((submission, index) => (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                              selectedSubmission?._id === submission._id 
                                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => handleSubmissionClick(submission)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(submission.status)}
                                <span className={`font-medium ${getStatusColor(submission.status)}`}>
                                  {submission.status}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                                  {submission.language.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {submission.runtime}ms
                                </div>
                                <div className="flex items-center">
                                  <Memory className="h-4 w-4 mr-1" />
                                  {submission.memory}MB
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(submission.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                <Eye className="h-4 w-4 mr-1" />
                                Click to view code
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Send className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No submissions yet</p>
                        <p className="text-sm mt-2">Your submissions will appear here after you submit solutions</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Please login to view your submissions</p>
                      <p className="text-sm mt-2">Sign in to track your progress and submission history</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chatai' && (
                <div>
                  {!token ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Bot className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Please login to use AI Chat feature</p>
                      <p className="text-sm mt-2">Sign in to get help with problem solving</p>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                          <Bot className="h-5 w-5 mr-2 text-indigo-500" />
                          AI Assistant
                          <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full">
                            Problem-Aware
                          </span>
                        </h3>

                        {/* Quick Prompts */}
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick questions:</p>
                          <div className="flex flex-wrap gap-2">
                            {getContextualPrompts().slice(0, 8).map((prompt, index) => (
                              <button
                                key={index}
                                onClick={() => setAiPrompt(prompt)}
                                disabled={aiLoading}
                                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full transition-colors disabled:opacity-50"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !aiLoading && generateResponse()}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                              placeholder="Ask about algorithms, approach, complexity, hints..."
                              disabled={aiLoading}
                            />
                            <button
                              onClick={generateResponse}
                              disabled={aiLoading || !aiPrompt.trim()}
                              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              {aiLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          
                          {aiLoading && (
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                              <div className="inline-flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                AI is analyzing the problem and generating response...
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Chat History and Current Response */}
                      {(chatHistory.length > 0 || aiResponse) && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center">
                            <MessageSquare className="h-5 w-5 mr-2 text-purple-500" />
                            AI Chat History
                          </h3>
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {/* Previous chat history */}
                            {chatHistory.map((chat, index) => (
                              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="mb-2">
                                  <div className="flex items-center mb-1">
                                    <User className="h-4 w-4 mr-2 text-blue-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">You asked:</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    {chat.prompt}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center mb-1">
                                    <Bot className="h-4 w-4 mr-2 text-purple-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI responded:</span>
                                  </div>
                                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                    {chat.response}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Current response (if any and not in history yet) */}
                            {aiResponse && !chatHistory.some(chat => chat.response === aiResponse) && (
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center mb-2">
                                  <Bot className="h-4 w-4 mr-2 text-purple-500" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Latest AI Response:</span>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                                  {aiResponse}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {chatHistory.length > 0 && (
                            <button
                              onClick={() => {
                                setChatHistory([]);
                                setAiResponse('');
                              }}
                              className="mt-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                              Clear chat history
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Code Editor Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 h-[calc(100vh-120px)] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Code className="h-5 w-5 mr-2 text-emerald-500" />
                  Code Editor
                </h3>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
              </div>
              
              {tabSwitchCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ Tab switching detected ({tabSwitchCount} times). This may affect your submission.
                  </p>
                </div>
              )}

              {selectedSubmission && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">
                    📝 Viewing code from submission: {selectedSubmission.status} ({new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 flex-1 flex flex-col">
              <div className="mb-4 flex-shrink-0">
                <CodeMirrorEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  className="h-96"
                  height="384px"
                />
              </div>

              <div className="flex space-x-4 mb-6 flex-shrink-0">
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:scale-[1.02]"
                  title={!token ? "Please login to run code" : ""}
                >
                  {running ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Code
                    </>
                  )}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !token}
                  className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:scale-[1.02]"
                  title={!token ? "Please login to submit code" : ""}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </button>
              </div>

              {/* Enhanced Console/Results */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex-1 flex flex-col">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 rounded-t-lg flex-shrink-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <Code className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                    Console Output
                  </h4>
                </div>
                <div className="p-4 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  {runResult && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Run Result:</span>
                          <span className={`font-semibold ${getStatusColor(runResult.status)}`}>
                            {runResult.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Passed: {runResult.passedTests}/{runResult.totalTests}
                        </div>
                      </div>
                      
                      {runResult.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
                          <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                          <div className="text-red-700 dark:text-red-200 text-sm font-mono break-words">{runResult.error}</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {runResult.testResults.map((result, index) => (
                            <div key={index} className={`border rounded-lg p-3 ${
                              result.passed 
                                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                                : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  {result.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                  )}
                                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Test Case {index + 1}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                                  <span>{result.executionTime}ms</span>
                                  <span>{result.memory}MB</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Input:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">{result.input}</pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                  <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">{result.expectedOutput}</pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                  <pre className={`p-2 rounded border overflow-x-auto ${
                                    result.passed 
                                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200' 
                                      : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                                  }`}>{result.actualOutput}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {submissionResult && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Submission Result:</span>
                          <span className={`font-semibold ${getStatusColor(submissionResult.status)}`}>
                            {submissionResult.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Passed: {submissionResult.passedTests}/{submissionResult.totalTests}
                        </div>
                      </div>
                      
                      {/* POTD Coin Award Notification */}
                      {submissionResult.potd && submissionResult.potd.awarded && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center">
                                <span className="text-lg">🪙</span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Problem of the Day Bonus!</h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span> for solving today's Problem of the Day! 🎉
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {submissionResult.error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="text-red-800 dark:text-red-300 text-sm font-medium mb-1">Error:</div>
                          <div className="text-red-700 dark:text-red-200 text-sm font-mono break-words">{submissionResult.error}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                              <span className="text-gray-600 dark:text-gray-300">Runtime:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{submissionResult.executionTime}ms</span>
                            </div>
                            <div className="flex items-center">
                              <Memory className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                              <span className="text-gray-600 dark:text-gray-300">Memory:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{submissionResult.memory}MB</span>
                            </div>
                          </div>
                          
                          {submissionResult.testResults.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Test Results (First 3):</h4>
                              {submissionResult.testResults.slice(0, 3).map((result, index) => (
                                <div key={index} className={`border rounded-lg p-3 ${
                                  result.passed 
                                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                      {result.passed ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                                      )}
                                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">Test Case {index + 1}</span>
                                    </div>
                                  </div>
                                  
                                  {!result.passed && (
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Expected:</div>
                                        <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 overflow-x-auto">{result.expectedOutput}</pre>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Output:</div>
                                        <pre className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-2 rounded text-red-800 dark:text-red-200 overflow-x-auto">{result.actualOutput}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!runResult && !submissionResult && (
                    <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                      <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Run your code to see the output here...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
