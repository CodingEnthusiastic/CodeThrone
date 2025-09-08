import { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Code, 
  Plus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface TestCase {
  input: string;
  output: string;
  isPublic: boolean;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime?: number;
  memory?: number;
  status?: string;
  stderr?: string;
}

interface RunResult {
  status: string;
  passedTests?: number;
  totalTests?: number;
  testResults?: TestResult[];
  executionTime?: number;
  memory?: number;
  error?: string;
  potd?: {
    awarded: boolean;
    coinsEarned: number;
  };
}

interface ConsoleOutputProps {
  running: boolean;
  submitting: boolean;
  runResult: RunResult | null;
  submissionResult: RunResult | null;
  publicTestCases: TestCase[];
  onResize?: (height: number) => void;
}


// import React, { useState, useRef, useEffect, forwardRef } from 'react';
// import {
//   FileText,
//   CheckCircle,
//   XCircle,
//   Code,
//   Plus,
//   ChevronUp,
//   ChevronDown
// } from 'lucide-react';

const ConsoleOutput = forwardRef<HTMLDivElement, ConsoleOutputProps>(({
  running,
  submitting,
  runResult,
  submissionResult,
  publicTestCases,
  onResize
}, ref) => {
  const [activeTestCaseTab, setActiveTestCaseTab] = useState(0);
  const [activeMainTab, setActiveMainTab] = useState<'testcases' | 'results'>('results');
  const [isExpanded, setIsExpanded] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Switch to 'Test Result' tab as soon as running or submitting starts
    if ((running || submitting) && activeMainTab !== 'results') {
      setActiveMainTab('results');
    }
    // Also scroll to results when they appear
    if ((runResult || submissionResult) && consoleRef.current) {
      setTimeout(() => {
        consoleRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [running, submitting, runResult, submissionResult, activeMainTab]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // Styling helpers
  const cardBase =
    "rounded-xl shadow-lg border transition-all duration-200";
  const cardAccepted =
    "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/60 border-green-200 dark:border-green-700";
  const cardRejected =
    "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/60 border-red-200 dark:border-red-700";
  const tabActive =
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold border-blue-400 dark:border-blue-500";
  const tabInactive =
    "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent";

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-gray-900 flex flex-col border-t border-gray-200 dark:border-gray-800"
      style={{
        minHeight: isExpanded ? '340px' : '48px',
        width: '100%',
        boxShadow: isExpanded ? '0 2px 16px 0 rgba(0,0,0,0.07)' : undefined,
      }}
    >
      {/* Header */}
      <div className="px-5 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-gray-900 dark:text-gray-100 flex items-center text-base ${!isExpanded && 'sr-only'}`}>
            <FileText className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
            Console Output
            {(running || submitting) && (
              <div className="ml-2 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                  {running ? "Running..." : "Submitting..."}
                </span>
              </div>
            )}
          </h4>
          {!isExpanded && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FileText className="h-3 w-3 mr-1" />
              Console
            </div>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleExpanded}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              title={isExpanded ? "Collapse console" : "Expand console"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {isExpanded && (
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <nav className="flex">
            <button
              onClick={() => setActiveMainTab('testcases')}
              className={`px-6 py-3 text-sm border-b-2 ${activeMainTab === 'testcases' ? tabActive : tabInactive}`}
            >
              Testcase
            </button>
            <button
              onClick={() => setActiveMainTab('results')}
              className={`px-6 py-3 text-sm border-b-2 ${activeMainTab === 'results' ? tabActive : tabInactive}`}
            >
              Test Result
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      {isExpanded && (
        <div
          ref={consoleRef}
          className="flex-1 px-8 py-6 overflow-y-auto bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out scrollbar-smooth"
          style={{
            minHeight: '240px',
            width: '100%',
            scrollBehavior: 'smooth'
          }}
        >
          {/* Testcase Tab */}
          {activeMainTab === 'testcases' && (
            <div>
              <div className="flex space-x-2 mb-4">
                {publicTestCases.slice(0,2).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTestCaseTab(idx)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-all duration-150 ${
                      activeTestCaseTab === idx
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500 font-semibold"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Case {idx + 1}
                  </button>
                ))}
                {publicTestCases.length > 0 && (
                  <button className="px-4 py-2 rounded-lg border text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              {publicTestCases[activeTestCaseTab] ? (
                <div className={`${cardBase} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-6 mb-2`}>
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Input</div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {publicTestCases[activeTestCaseTab]?.input || 'No input data'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Expected Output</div>
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {publicTestCases[activeTestCaseTab]?.output || 'No expected output'}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No test cases available</h4>
                  <p className="text-gray-500 dark:text-gray-400">Test cases will appear here when available</p>
                </div>
              )}
            </div>
          )}

          {/* Test Results Tab Content */}
          {activeMainTab === 'results' && (
            <div className="space-y-4">
              {/* Loading State */}
              {(running || submitting) && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {running ? "Running your code..." : "Submitting your solution..."}
                  </p>
                </div>
              )}

              {/* Empty state - Please run the code */}
              {!running && !submitting && !runResult && !submissionResult && (
                <div className="text-center py-8">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                    <Code className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">You must run your code first</h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Click the "Run" button to execute your code and see the results here.</p>
                </div>
              )}

              {/* Run Result */}
              {runResult && !submissionResult && (
                <div className={`p-6 mb-2 ${cardBase} ${runResult.status === "Accepted" || runResult.status === "Success" ? cardAccepted : cardRejected}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    {runResult.status === "Accepted" || runResult.status === "Success" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`font-bold text-lg ${runResult.status === "Accepted" || runResult.status === "Success" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      Run Result: {runResult.status === "Success" ? "Accepted" : runResult.status}
                    </span>
                    {runResult.passedTests !== undefined && runResult.totalTests !== undefined && (
                      <span className="ml-4 text-gray-600 dark:text-gray-400 text-sm">
                        Passed: {runResult.passedTests}/{runResult.totalTests} • Runtime: {runResult.executionTime || 0}ms
                      </span>
                    )}
                  </div>
                  {/* Test Case Navigation */}
                  {runResult.testResults && runResult.testResults.length > 0 && (
                    <div className="flex space-x-2 mb-4">
                      {runResult.testResults.slice(0,2).map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTestCaseTab(idx)}
                          className={`px-4 py-2 rounded-lg border text-sm transition-all duration-150 ${
                            activeTestCaseTab === idx
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500 font-semibold"
                              : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                  {runResult.testResults && runResult.testResults[activeTestCaseTab] && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Input</div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {runResult.testResults[activeTestCaseTab].input || 'No input data'}
                          </pre>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Output</div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {runResult.testResults[activeTestCaseTab].actualOutput || 'No output'}
                          </pre>
                        </div>
                                  <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Expected</div>
                                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                      {runResult.testResults[activeTestCaseTab].expectedOutput || 'No expected output'}
                                    </pre>
                                  </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Expected</div>
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            {runResult.testResults[activeTestCaseTab].expectedOutput || 'No expected output'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                  {runResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {runResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Result */}
              {submissionResult && (
                <div className={`p-6 mb-2 ${cardBase} ${submissionResult.status === "Accepted" ? cardAccepted : cardRejected}`}>
                  <div className="flex items-center space-x-3 mb-4">
                    {submissionResult.status === "Accepted" ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`font-bold text-lg ${submissionResult.status === "Accepted" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                      {submissionResult.status}
                    </span>
                    {submissionResult.passedTests !== undefined && submissionResult.totalTests !== undefined && (
                      <span className="ml-4 text-gray-600 dark:text-gray-400 text-sm">
                        Passed: {submissionResult.passedTests}/{submissionResult.totalTests} • Runtime: {submissionResult.executionTime || 0}ms
                      </span>
                    )}
                  </div>
                  {submissionResult.potd && submissionResult.potd.awarded && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                          🪙
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Problem of the Day Bonus!</h4>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {submissionResult.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                      <div className="flex items-center mb-2">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                        <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
                      </div>
                      <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
                        {submissionResult.error}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ConsoleOutput.displayName = 'ConsoleOutput';

export default ConsoleOutput;
//   const consoleRef = useRef<HTMLDivElement>(null);

//   // Auto-scroll to results when they appear
//   useEffect(() => {
//     if ((runResult || submissionResult) && consoleRef.current) {
//       setTimeout(() => {
//         consoleRef.current?.scrollIntoView({ 
//           behavior: 'smooth', 
//           block: 'start' 
//         });
//       }, 100);
//     }
//   }, [runResult, submissionResult]);

//   const toggleExpanded = () => {
//     setIsExpanded(!isExpanded);
//   };

//   return (
//     <div 
//       ref={ref}
//       className="bg-white dark:bg-gray-800 flex flex-col border-t border-gray-200 dark:border-gray-700"
//       style={{ 
//         minHeight: isExpanded ? '400px' : '60px',
//         width: '100%'
//       }}
//     >
//       {/* Console Header */}
//       <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm flex-shrink-0">
//         <div className="flex items-center justify-between">
//           <h4 className={`font-semibold text-gray-900 dark:text-gray-100 flex items-center text-sm ${!isExpanded && 'sr-only'}`}>
//             <FileText className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
//             Console Output
//             {(running || submitting) && (
//               <div className="ml-2 flex items-center">
//                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
//                 <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
//                   {running ? "Running..." : "Submitting..."}
//                 </span>
//               </div>
//             )}
//           </h4>
          
//           {!isExpanded && (
//             <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
//               <FileText className="h-3 w-3 mr-1" />
//               Console
//             </div>
//           )}
          
//           <div className="flex items-center space-x-2">
//             <button
//               onClick={toggleExpanded}
//               className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
//               title={isExpanded ? "Collapse console" : "Expand console"}
//             >
//               {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Navigation Tabs - Test Cases and Test Results */}
//       {isExpanded && (
//         <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850">
//           <nav className="flex">
//             {/* <button
//               onClick={() => setActiveMainTab('testcases')}
//               className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
//                 activeMainTab === 'testcases'
//                   ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
//                   : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
//               }`}
//             >
//               Test Cases
//             </button> */}
//             <button
//               onClick={() => setActiveMainTab('results')}
//               className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
//                 activeMainTab === 'results'
//                   ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
//                   : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
//               }`}
//             >
//               Test Results
//             </button>
//           </nav>
//         </div>
//       )}

//       {/* Console Content */}
//       {isExpanded && (
//         <div 
//           ref={consoleRef} 
//           className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-850 transition-all duration-300 ease-in-out scrollbar-smooth"
//           style={{ 
//             minHeight: '300px',
//             width: '100%',
//             scrollBehavior: 'smooth'
//           }}
//         >
//           {/* Test Cases Tab Content */}
//           {activeMainTab === 'testcases' && (
//             <div className="space-y-4">
//               {/* Public Test Cases Display */}
//               {publicTestCases.length > 0 && (
//                 <div>
//                   <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Public Test Cases</h4>
//                   <div className="space-y-3">
//                     {publicTestCases.map((testCase, index) => (
//                       <div 
//                         key={index} 
//                         className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
//                       >
//                         <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                           Test Case {index + 1}
//                         </div>
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                           <div>
//                             <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Input:</div>
//                             <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
//                               {testCase.input}
//                             </pre>
//                           </div>
//                           <div>
//                             <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Expected Output:</div>
//                             <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600 text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
//                               {testCase.output}
//                             </pre>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
              
//               {publicTestCases.length === 0 && (
//                 <div className="text-center py-8">
//                   <Code className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
//                   <p className="text-gray-500 dark:text-gray-400">No public test cases available</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Test Results Tab Content */}
//           {activeMainTab === 'results' && (
//             <div className="space-y-4">
//               {/* Loading State */}
//               {(running || submitting) && !runResult && !submissionResult && (
//                 <div className="text-center py-8">
//                   <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
//                   <p className="text-gray-600 dark:text-gray-400">
//                     {running ? "Running your code..." : "Submitting your solution..."}
//                   </p>
//                 </div>
//               )}

//           {/* Run Result */}
//           {runResult && !submissionResult && (
//             <div className="space-y-4">
//               <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
//                 runResult.status === "Accepted" || runResult.status === "Success"
//                   ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
//                   : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
//               }`}>
//                 {runResult.status === "Accepted" || runResult.status === "Success" ? (
//                   <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
//                 ) : (
//                   <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
//                 )}
//                 <div>
//                   <div className={`font-bold text-lg ${
//                     runResult.status === "Accepted" || runResult.status === "Success"
//                       ? "text-green-700 dark:text-green-300" 
//                       : "text-red-700 dark:text-red-300"
//                   }`}>
//                     Run Result: {runResult.status === "Success" ? "Accepted" : runResult.status}
//                   </div>
//                   {runResult.passedTests !== undefined && runResult.totalTests !== undefined && (
//                     <div className="text-gray-600 dark:text-gray-400 text-sm">
//                       Passed: {runResult.passedTests}/{runResult.totalTests} • Runtime: {runResult.executionTime || 0}ms
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Test Case Navigation */}
//               {runResult.testResults && runResult.testResults.length > 0 && (
//                 <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
//                   <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
//                     <div className="flex overflow-x-auto">
//                       {runResult.testResults.map((result, index) => (
//                         <button
//                           key={index}
//                           onClick={() => setActiveTestCaseTab(index)}
//                           className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 flex items-center space-x-2 ${
//                             activeTestCaseTab === index
//                               ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
//                               : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
//                           } ${
//                             result.passed 
//                               ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
//                               : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
//                           }`}
//                         >
//                           <span>Case {index + 1}</span>
//                         </button>
//                       ))}
//                     </div>
//                   </div>

//                   {runResult.testResults[activeTestCaseTab] && (
//                     <div className="p-4 space-y-4">
//                       <div>
//                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
//                         <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
//                           <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                             {runResult.testResults[activeTestCaseTab].input || 'No input data'}
//                           </pre>
//                         </div>
//                       </div>

//                       <div>
//                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Output</h4>
//                         <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
//                           <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                             {runResult.testResults[activeTestCaseTab].actualOutput || 'No output'}
//                           </pre>
//                         </div>
//                       </div>

//                       <div>
//                         <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
//                         <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
//                           <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                             {runResult.testResults[activeTestCaseTab].expectedOutput || 'No expected output'}
//                           </pre>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {runResult.error && (
//                 <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
//                   <div className="flex items-center mb-2">
//                     <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
//                     <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
//                   </div>
//                   <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
//                     {runResult.error}
//                   </pre>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Submission Result */}
//           {submissionResult && (
//             <div className="space-y-4">
//               <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
//                 submissionResult.status === "Accepted"
//                   ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
//                   : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
//               }`}>
//                 {submissionResult.status === "Accepted" ? (
//                   <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
//                 ) : (
//                   <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
//                 )}
//                 <div>
//                   <div className={`font-bold text-lg ${
//                     submissionResult.status === "Accepted"
//                       ? "text-green-700 dark:text-green-300" 
//                       : "text-red-700 dark:text-red-300"
//                   }`}>
//                     {submissionResult.status}
//                   </div>
//                   {submissionResult.passedTests !== undefined && submissionResult.totalTests !== undefined && (
//                     <div className="text-gray-600 dark:text-gray-400 text-sm">
//                       Passed: {submissionResult.passedTests}/{submissionResult.totalTests} • Runtime: {submissionResult.executionTime || 0}ms
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {submissionResult.potd && submissionResult.potd.awarded && (
//                 <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
//                   <div className="flex items-center">
//                     <div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
//                       🪙
//                     </div>
//                     <div className="ml-3">
//                       <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Problem of the Day Bonus!</h4>
//                       <p className="text-xs text-yellow-700 dark:text-yellow-300">
//                         You earned <span className="font-semibold">{submissionResult.potd.coinsEarned} coins</span>!
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {submissionResult.error && (
//                 <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
//                   <div className="flex items-center mb-2">
//                     <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
//                     <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
//                   </div>
//                   <pre className="text-red-700 dark:text-red-200 text-sm font-mono whitespace-pre-wrap">
//                     {submissionResult.error}
//                   </pre>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Default Public Test Cases View */}
//           {!runResult && !submissionResult && !running && !submitting && publicTestCases.length > 0 && (
//             <div className="space-y-4">
//               <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
//                 {/* <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"> */}
//                   {/* <div className="flex items-center space-x-2">
//                     <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
//                     <h4 className="font-semibold text-gray-900 dark:text-gray-100">Testcase</h4>
//                     <div className="w-3 h-3 bg-green-500 rounded-full"></div>
//                     <h4 className="font-semibold text-gray-900 dark:text-gray-100">Test Result</h4>
//                   </div> */}
//                 {/* </div> */}

//                 <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
//                   <div className="flex overflow-x-auto">
//                     {publicTestCases.map((_, index) => (
//                       <button
//                         key={index}
//                         onClick={() => setActiveTestCaseTab(index)}
//                         className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
//                           activeTestCaseTab === index
//                             ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
//                             : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
//                         }`}
//                       >
//                         Case {index + 1}
//                       </button>
//                     ))}
//                     <button className="px-4 py-3 text-sm font-medium text-gray-400 dark:text-gray-500 cursor-not-allowed">
//                       <Plus className="w-4 h-4" />
//                     </button>
//                   </div>
//                 </div>

//                 {publicTestCases[activeTestCaseTab] && (
//                   <div className="p-4 space-y-4">
//                     <div>
//                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input</h4>
//                       <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
//                         <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                           {publicTestCases[activeTestCaseTab]?.input || 'No input data'}
//                         </pre>
//                       </div>
//                     </div>

//                     <div>
//                       <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Expected</h4>
//                       <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
//                         <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
//                           {publicTestCases[activeTestCaseTab]?.output || 'No expected output'}
//                         </pre>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <div className="text-center py-6">
//                 <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
//                   <Code className="h-6 w-6 text-gray-400" />
//                 </div>
//                 <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Ready to test?</h4>
//                 <p className="text-gray-500 dark:text-gray-400 text-xs">Run your code to see output</p>
//               </div>
//             </div>
//           )}

//           {/* Empty state when no test cases */}
//           {!runResult && !submissionResult && !running && !submitting && publicTestCases.length === 0 && (
//             <div className="text-center py-12">
//               <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
//                 <Code className="h-8 w-8 text-gray-400" />
//               </div>
//               <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Ready to test your code?</h3>
//               <p className="text-gray-500 dark:text-gray-400 text-sm">Run your code to see the output here...</p>
//             </div>
//           )}
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// });

// ConsoleOutput.displayName = 'ConsoleOutput';

// export default ConsoleOutput;
