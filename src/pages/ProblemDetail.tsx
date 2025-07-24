// 

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Play, Send, Clock, MemoryStick as Memory, CheckCircle, XCircle, BookOpen, Video, Code, FileText, MessageSquare, Bot, Eye, Calendar, User } from 'lucide-react';
import SmartCodeEditor from '../components/SmartCodeEditor';

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
}

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth(); // ✅ Get token from auth context
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
      const response = await axios.get(`http://localhost:5000/api/problems/${id}`);
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

    setAiLoading(true);
    setAiResponse('');

    try {
      const res = await axios.post('http://localhost:5000/api/gemini', {
        prompt: aiPrompt,
        context: problem?.description || ''
      }, {
        headers: {
          'Authorization': `Bearer ${token}`, // ✅ Add auth header
          'Content-Type': 'application/json'
        }
      });

      setAiResponse(res.data.reply || 'No response received.');
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
      const response = await axios.get(`http://localhost:5000/api/profile/${user.username}/solved`, {
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
      const response = await axios.get(`http://localhost:5000/api/problems/${id}/editorial`);
      setEditorial(response.data.editorial);
    } catch (error) {
      console.error('Error fetching editorial:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!user || !token) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/api/problems/${id}/submissions`, {
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
      const response = await axios.get(`http://localhost:5000/api/problems/${id}/solutions`);
      setSolutions(response.data.solutions);
    } catch (error) {
      console.error('Error fetching solutions:', error);
    }
  };

  const getDefaultCode = (lang: string) => {
    const templates = {
      cpp: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
      java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        // Your code here
    }
}`,
      python: `def solution():
    # Your code here
    pass

if __name__ == "__main__":
    solution()`,
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Your code here
    return 0;
}`
    };
    return templates[lang as keyof typeof templates] || '';
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
      const response = await axios.post(`http://localhost:5000/api/problems/${id}/run`, {
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
      const response = await axios.post(`http://localhost:5000/api/problems/${id}/submit`, {
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
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Success': return 'text-green-600';
      case 'Wrong Answer':
      case 'Failed': return 'text-red-600';
      case 'Compilation Error':
      case 'Error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Wrong Answer':
      case 'Failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Compilation Error':
      case 'Error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Problem not found</h2>
          <p className="text-gray-600">The problem you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Description Panel */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Problem Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  {problem.title}
                  {isSolved && (
                    <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Solved
                    </span>
                  )}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {problem.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Acceptance Rate: {problem.acceptanceRate.toFixed(1)}%</span>
                <span>Submissions: {problem.submissions}</span>
                <span>Accepted: {problem.accepted}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
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
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.icon}
                    <span className="ml-2">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {/* <div className="p-6 h-96 overflow-y-auto"> */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Problem Description</h3>
                    <div className="whitespace-pre-wrap text-gray-700">{problem.description}</div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Examples</h3>
                    {problem.examples.map((example, index) => (
                      <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <div className="mb-2">
                          <strong>Input:</strong>
                          <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">{example.input}</pre>
                        </div>
                        <div className="mb-2">
                          <strong>Output:</strong>
                          <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">{example.output}</pre>
                        </div>
                        {example.explanation && (
                          <div>
                            <strong>Explanation:</strong>
                            <p className="mt-1 text-sm">{example.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                    <div className="whitespace-pre-wrap text-gray-700 text-sm">{problem.constraints}</div>
                  </div>
                </div>
              )}

              {activeTab === 'editorial' && (
                <div>
                  {editorial ? (
                    <div>
                      {editorial.written && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Written Editorial</h3>
                          <div className="prose max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700">{editorial.written}</div>
                          </div>
                        </div>
                      )}
                      
                      {editorial.videoUrl && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Video Editorial</h3>
                          <a
                            href={editorial.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block aspect-video rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
                          >
                            <img
                              src={editorial.thumbnailUrl}
                              alt="Video Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </a>
                          <div className="mt-2 text-blue-600 hover:text-blue-800 flex items-center">
                            <Video className="h-5 w-5 mr-2" />
                            <a
                              href={editorial.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Watch Video Editorial
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Editorial not available yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'solutions' && (
                <div>
                  {solutions.length > 0 ? (
                    <div className="space-y-6">
                      {solutions.map((solution, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">
                              Official Solution - {solution.language.toUpperCase()}
                            </h4>
                          </div>
                          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                            <code>{solution.completeCode}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No solutions available yet</p>
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
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                              selectedSubmission?._id === submission._id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => handleSubmissionClick(submission)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(submission.status)}
                                <span className={`font-medium ${getStatusColor(submission.status)}`}>
                                  {submission.status}
                                </span>
                                <span className="text-sm text-gray-600 bg-gray-200 px-2 py-1 rounded">
                                  {submission.language.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(submission.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                Click to view code
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No submissions yet</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Please login to view your submissions</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chatai' && (
                <div className="space-y-4">
                  {!token ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Please login to use AI Chat feature</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="Ask something about the problem..."
                        />
                        <button
                          onClick={generateResponse}
                          disabled={aiLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {aiLoading ? 'Thinking...' : 'Ask'}
                        </button>
                      </div>

                      {aiResponse && (
                        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 text-left whitespace-pre-wrap text-sm text-gray-700 max-h-96 overflow-y-auto">
                          {aiResponse}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Code Editor Panel */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Code Editor</h3>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cpp">C++20</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
              </div>
              
              {tabSwitchCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Tab switching detected ({tabSwitchCount} times). This may affect your submission.
                  </p>
                </div>
              )}

              {selectedSubmission && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-800 text-sm">
                    📝 Viewing code from submission: {selectedSubmission.status} ({new Date(selectedSubmission.date).toLocaleDateString()})
                  </p>
                </div>
              )}
            </div>

            <div className="p-6">
              <div className="mb-4">
                <SmartCodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  disabled={false}
                  placeholder="Write your code here..."
                  className="h-96"
                />
              </div>

              <div className="flex space-x-4 mb-6">
                <button
                  onClick={handleRun}
                  disabled={running || !token}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!token ? "Please login to run code" : ""}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {running ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !token}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!token ? "Please login to submit code" : ""}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>

              {/* Enhanced Console/Results */}
              <div className="border border-gray-200 rounded-lg dark:bg-gray-800 dark:tx-white">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Console Output</h4>
                </div>
                <div className="p-4 h-64 overflow-y-auto">
                  {runResult && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-600 mr-2">Run Result:</span>
                          <span className={`font-semibold ${getStatusColor(runResult.status)}`}>
                            {runResult.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Passed: {runResult.passedTests}/{runResult.totalTests}
                        </div>
                      </div>
                      
                      {runResult.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                          <div className="text-red-800 text-sm font-medium mb-1">Error:</div>
                          <div className="text-red-700 text-sm font-mono">{runResult.error}</div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {runResult.testResults.map((result, index) => (
                            <div key={index} className={`border rounded-lg p-3 ${
                              result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                  {result.passed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-600 mr-2" />
                                  )}
                                  <span className="font-medium text-sm">Test Case {index + 1}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-600">
                                  <span>{result.executionTime}ms</span>
                                  <span>{result.memory}MB</span>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Input:</div>
                                  <pre className="bg-white p-2 rounded border text-gray-800 overflow-x-auto">{result.input}</pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Expected:</div>
                                  <pre className="bg-white p-2 rounded border text-gray-800 overflow-x-auto">{result.expectedOutput}</pre>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-700 mb-1">Your Output:</div>
                                  <pre className={`p-2 rounded border overflow-x-auto ${
                                    result.passed ? 'bg-white text-gray-800' : 'bg-red-100 text-red-800'
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
                          <span className="text-sm font-medium text-gray-600 mr-2">Submission Result:</span>
                          <span className={`font-semibold ${getStatusColor(submissionResult.status)}`}>
                            {submissionResult.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Passed: {submissionResult.passedTests}/{submissionResult.totalTests}
                        </div>
                      </div>
                      
                      {submissionResult.error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="text-red-800 text-sm font-medium mb-1">Error:</div>
                          <div className="text-red-700 text-sm font-mono">{submissionResult.error}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="text-gray-600">Runtime:</span>
                              <span className="ml-2 font-medium">{submissionResult.executionTime}ms</span>
                            </div>
                            <div className="flex items-center">
                              <Memory className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="text-gray-600">Memory:</span>
                              <span className="ml-2 font-medium">{submissionResult.memory}MB</span>
                            </div>
                          </div>
                          
                          {submissionResult.testResults.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">Test Results (First 3):</h4>
                              {submissionResult.testResults.slice(0, 3).map((result, index) => (
                                <div key={index} className={`border rounded-lg p-3 ${
                                  result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                      {result.passed ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-red-600 mr-2" />
                                      )}
                                      <span className="font-medium text-sm">Test Case {index + 1}</span>
                                    </div>
                                  </div>
                                  
                                  {!result.passed && (
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div>
                                        <div className="font-medium text-gray-700 mb-1">Expected:</div>
                                        <pre className="bg-white p-2 rounded border text-gray-800 overflow-x-auto">{result.expectedOutput}</pre>
                                      </div>
                                      <div>
                                        <div className="font-medium text-gray-700 mb-1">Your Output:</div>
                                        <pre className="bg-red-100 p-2 rounded border text-red-800 overflow-x-auto">{result.actualOutput}</pre>
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
                    <div className="text-gray-500 text-sm text-center py-8">
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
