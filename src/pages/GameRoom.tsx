import React, { useEffect, useRef, useState } from "react";
import { Clock, LogOut, Send, CheckCircle, XCircle } from "lucide-react";
import Confetti from "react-confetti";

interface GameRoomProps {
  activeGame: any;
  user: any;
  socketRef: React.MutableRefObject<any>;
  socketConnected: boolean;
  code: string;
  setCode: (code: string) => void;
  handleSubmitCode: () => void;
  isSubmitEnabled: () => boolean;
  submitting: boolean;
  submissionResult: any;
  timeRemaining: number;
  gameStarted: boolean;
  gameFinished: boolean;
  forceLeaveAndDeleteGame: () => void;
  opponentProgress: { testCasesPassed: number; totalTestCases: number };
  language: string;
  handleLanguageChange: (lang: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy":
      return "text-green-600 bg-green-100";
    case "Medium":
      return "text-yellow-600 bg-yellow-100";
    case "Hard":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const GameRoom: React.FC<GameRoomProps> = ({
  activeGame,
  user,
  socketRef,
  socketConnected,
  code,
  setCode,
  handleSubmitCode,
  isSubmitEnabled,
  submitting,
  submissionResult,
  timeRemaining,
  gameStarted,
  gameFinished,
  forceLeaveAndDeleteGame,
  opponentProgress,
  language,
  handleLanguageChange,
  textareaRef,
}) => {
  // ...existing code for getCurrentPlayer/getOpponentPlayer, etc...
  const getCurrentPlayer = () => {
    if (!activeGame || !user) return null;
    return activeGame.players.find((p: any) => String(p.user._id) === String(user.id));
  };
  const getOpponentPlayer = () => {
    if (!activeGame || !user) return null;
    return activeGame.players.find((p: any) => String(p.user._id) !== String(user.id));
  };
  const currentPlayer = getCurrentPlayer();
  const opponentPlayer = getOpponentPlayer();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Game Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {activeGame.gameMode === "random" ? "Random Match" : `Room: ${activeGame.roomId}`}
              </h1>
              <p className="text-gray-600">
                Problem: {activeGame.problem?.title}
                {activeGame.problem && (
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                      activeGame.problem.difficulty
                    )}`}
                  >
                    {activeGame.problem.difficulty}
                  </span>
                )}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    activeGame.status === "ongoing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {activeGame.status === "ongoing" ? "Game Active" : "Waiting for players"}
                </span>
                <span className="text-sm text-gray-600">
                  Players: {activeGame.players.length}/2
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-red-600 mb-2">
                <Clock className="h-5 w-5 mr-2" />
                <span className="text-xl font-mono">{formatTime(timeRemaining)}</span>
              </div>
              <p className="text-sm text-gray-500">
                Time Limit: {activeGame.timeLimit} minutes
              </p>
              {!gameStarted && activeGame.players.length < 2 && (
                <p className="text-sm text-orange-600 mt-1">Waiting for opponent...</p>
              )}
              {!gameStarted && activeGame.players.length === 2 && (
                <p className="text-sm text-green-600 mt-1">Starting game...</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={forceLeaveAndDeleteGame}
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Game
            </button>
          </div>
        </div>

        {/* Players Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{user?.username} (You)</h3>
                <p className="text-sm text-gray-600">
                  Rating: {currentPlayer?.user.ratings?.gameRating || 1200}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {currentPlayer?.testCasesPassed || 0}/{currentPlayer?.totalTestCases || 0}
                </div>
                <p className="text-sm text-gray-500">Tests passed</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    currentPlayer?.totalTestCases
                      ? (currentPlayer.testCasesPassed / currentPlayer.totalTestCases) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {opponentPlayer?.user.username || "Waiting for opponent..."}
                </h3>
                <p className="text-sm text-gray-600">
                  Rating: {opponentPlayer?.user.ratings?.gameRating || "N/A"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">
                  {opponentProgress.testCasesPassed}/{opponentProgress.totalTestCases || 0}
                </div>
                <p className="text-sm text-gray-500">Tests passed</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    opponentProgress.totalTestCases
                      ? (opponentProgress.testCasesPassed / opponentProgress.totalTestCases) * 100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Problem Description */}
          {activeGame.problem && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Problem Description</h3>
              <div className="prose max-w-none">
                <div className="mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {activeGame.problem.description}
                  </p>
                </div>
                {activeGame.problem.examples.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Examples:</h4>
                    {activeGame.problem.examples.map((example: any, index: number) => (
                      <div key={index} className="mb-3 p-3 bg-gray-50 rounded">
                        <div className="mb-2">
                          <strong>Input:</strong>
                          <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                            {example.input}
                          </pre>
                        </div>
                        <div className="mb-2">
                          <strong>Output:</strong>
                          <pre className="bg-gray-100 p-2 rounded mt-1 text-sm">
                            {example.output}
                          </pre>
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
                )}
                <div>
                  <h4 className="font-semibold mb-2">Constraints:</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {activeGame.problem.constraints}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Code Editor</h3>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={gameFinished}
              >
                <option value="cpp">C++20</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="c">C</option>
              </select>
            </div>
            <div className="mb-4">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Write your code here..."
                disabled={gameFinished || !gameStarted}
              />
            </div>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={handleSubmitCode}
                disabled={!isSubmitEnabled()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Submitting..." : "Submit"}
              </button>
              {!isSubmitEnabled() && (
                <div className="text-xs text-gray-500 flex items-center">
                  {!code.trim() && <span className="mr-2">No code</span>}
                  {gameFinished && <span className="mr-2">Game finished</span>}
                  {activeGame?.status !== "ongoing" && !gameStarted && (
                    <span className="mr-2">Game not active</span>
                  )}
                  {submitting && <span className="mr-2">Submitting</span>}
                  {!socketConnected && <span className="mr-2">Not connected</span>}
                  {activeGame?.players?.length !== 2 && <span className="mr-2">Need 2 players</span>}
                </div>
              )}
            </div>
            {submissionResult && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-4">
                  {submissionResult.status === "Accepted" ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span
                    className={`font-semibold ${
                      submissionResult.status === "Accepted"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {submissionResult.status}
                  </span>
                </div>
                <div className="text-sm mb-4">
                  <span className="text-gray-600">Test Cases:</span>
                  <span className="ml-2 font-medium">
                    {submissionResult.passedTests}/{submissionResult.totalTests}
                  </span>
                </div>
                {submissionResult.testResults.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Test Results:</h4>
                    <div className="space-y-2">
                      {submissionResult.testResults.map((result: any, index: number) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center">
                            {result.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mr-2" />
                            )}
                            <span>Test Case {index + 1}</span>
                          </div>
                          {!result.passed && (
                            <div className="ml-6 mt-2 text-xs text-gray-600">
                              <div>Expected: {result.expectedOutput}</div>
                              <div>Got: {result.actualOutput}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
