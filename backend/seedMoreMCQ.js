import "./loadenv.js";
import mongoose from 'mongoose';
import MCQQuestion from './models/MCQQuestion.js';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedMCQQuestions();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

const newMCQQuestions = [
  {
    question: "What is the time complexity of binary search?",
    options: [
      { text: "O(n)", isCorrect: false },
      { text: "O(log n)", isCorrect: true },
      { text: "O(n log n)", isCorrect: false },
      { text: "O(n²)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Binary Search",
    explanation: "Binary search divides the search space in half at each step, resulting in O(log n) time complexity.",
    tags: ["binary-search", "time-complexity"]
  },
  {
    question: "Which data structure follows LIFO principle?",
    options: [
      { text: "Queue", isCorrect: false },
      { text: "Stack", isCorrect: true },
      { text: "Array", isCorrect: false },
      { text: "Linked List", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Data Structures",
    explanation: "Stack follows Last In First Out (LIFO) principle where the last element added is the first one to be removed.",
    tags: ["stack", "data-structures"]
  },
  {
    question: "What is the worst-case time complexity of QuickSort?",
    options: [
      { text: "O(n log n)", isCorrect: false },
      { text: "O(n²)", isCorrect: true },
      { text: "O(n)", isCorrect: false },
      { text: "O(log n)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Sorting",
    explanation: "QuickSort has O(n²) worst-case complexity when the pivot is always the smallest or largest element.",
    tags: ["quicksort", "sorting", "time-complexity"]
  },
  {
    question: "Which algorithm is used to find shortest paths in a weighted graph?",
    options: [
      { text: "BFS", isCorrect: false },
      { text: "DFS", isCorrect: false },
      { text: "Dijkstra's", isCorrect: true },
      { text: "Kruskal's", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Graph",
    explanation: "Dijkstra's algorithm finds shortest paths from a source vertex to all other vertices in a weighted graph.",
    tags: ["dijkstra", "graph", "shortest-path"]
  },
  {
    question: "What is the space complexity of merge sort?",
    options: [
      { text: "O(1)", isCorrect: false },
      { text: "O(log n)", isCorrect: false },
      { text: "O(n)", isCorrect: true },
      { text: "O(n²)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Sorting",
    explanation: "Merge sort requires O(n) extra space for the temporary arrays used during the merge process.",
    tags: ["mergesort", "space-complexity"]
  },
  {
    question: "Which traversal of BST gives sorted order?",
    options: [
      { text: "Preorder", isCorrect: false },
      { text: "Inorder", isCorrect: true },
      { text: "Postorder", isCorrect: false },
      { text: "Level order", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Binary Tree",
    explanation: "Inorder traversal of a Binary Search Tree visits nodes in ascending sorted order.",
    tags: ["bst", "traversal", "inorder"]
  },
  {
    question: "What is the time complexity of inserting into a hash table?",
    options: [
      { text: "O(1) average case", isCorrect: true },
      { text: "O(n) always", isCorrect: false },
      { text: "O(log n)", isCorrect: false },
      { text: "O(n²)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Hash Table",
    explanation: "Hash table insertion is O(1) on average due to constant-time hash function computation and direct indexing.",
    tags: ["hashtable", "insertion", "time-complexity"]
  },
  {
    question: "Which technique is used in dynamic programming?",
    options: [
      { text: "Divide and conquer", isCorrect: false },
      { text: "Memoization", isCorrect: true },
      { text: "Greedy choice", isCorrect: false },
      { text: "Backtracking", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    explanation: "Dynamic programming uses memoization to store results of subproblems and avoid redundant calculations.",
    tags: ["dp", "memoization"]
  },
  {
    question: "What is the maximum number of edges in a simple undirected graph with n vertices?",
    options: [
      { text: "n", isCorrect: false },
      { text: "n-1", isCorrect: false },
      { text: "n(n-1)/2", isCorrect: true },
      { text: "n²", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Graph Theory",
    explanation: "A complete graph with n vertices has n(n-1)/2 edges, which is the maximum for a simple undirected graph.",
    tags: ["graph-theory", "edges"]
  },
  {
    question: "Which of the following is NOT a stable sorting algorithm?",
    options: [
      { text: "Merge Sort", isCorrect: false },
      { text: "Bubble Sort", isCorrect: false },
      { text: "Quick Sort", isCorrect: true },
      { text: "Insertion Sort", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Sorting",
    explanation: "QuickSort is not stable because it may change the relative order of equal elements during partitioning.",
    tags: ["stability", "sorting"]
  },
  {
    question: "What is the height of a balanced binary tree with n nodes?",
    options: [
      { text: "O(n)", isCorrect: false },
      { text: "O(log n)", isCorrect: true },
      { text: "O(n log n)", isCorrect: false },
      { text: "O(√n)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Binary Tree",
    explanation: "A balanced binary tree maintains O(log n) height to ensure efficient operations.",
    tags: ["binary-tree", "height", "balanced"]
  },
  {
    question: "Which algorithm finds Minimum Spanning Tree?",
    options: [
      { text: "Dijkstra's", isCorrect: false },
      { text: "Kruskal's", isCorrect: true },
      { text: "Floyd-Warshall", isCorrect: false },
      { text: "Bellman-Ford", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Graph",
    explanation: "Kruskal's algorithm finds the Minimum Spanning Tree by sorting edges and using Union-Find data structure.",
    tags: ["mst", "kruskal", "graph"]
  },
  {
    question: "What is the best case time complexity of insertion sort?",
    options: [
      { text: "O(n²)", isCorrect: false },
      { text: "O(n log n)", isCorrect: false },
      { text: "O(n)", isCorrect: true },
      { text: "O(log n)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Sorting",
    explanation: "Insertion sort has O(n) best case when the array is already sorted, requiring only comparisons.",
    tags: ["insertion-sort", "best-case"]
  },
  {
    question: "Which data structure is used to implement recursion?",
    options: [
      { text: "Queue", isCorrect: false },
      { text: "Stack", isCorrect: true },
      { text: "Array", isCorrect: false },
      { text: "Heap", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Recursion",
    explanation: "Recursion is implemented using the call stack, which follows the LIFO principle of a stack.",
    tags: ["recursion", "call-stack"]
  },
  {
    question: "What is the time complexity of finding an element in a heap?",
    options: [
      { text: "O(1)", isCorrect: false },
      { text: "O(log n)", isCorrect: false },
      { text: "O(n)", isCorrect: true },
      { text: "O(n log n)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Heap",
    explanation: "Finding an arbitrary element in a heap requires O(n) time as heaps are not designed for searching.",
    tags: ["heap", "search"]
  },
  {
    question: "Which technique is used to solve the 0/1 Knapsack problem optimally?",
    options: [
      { text: "Greedy", isCorrect: false },
      { text: "Dynamic Programming", isCorrect: true },
      { text: "Divide and Conquer", isCorrect: false },
      { text: "Backtracking", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    explanation: "0/1 Knapsack requires dynamic programming to find optimal solution by considering all possible combinations.",
    tags: ["knapsack", "dp"]
  },
  {
    question: "What is the space complexity of DFS using recursion?",
    options: [
      { text: "O(1)", isCorrect: false },
      { text: "O(V)", isCorrect: true },
      { text: "O(E)", isCorrect: false },
      { text: "O(V + E)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Graph",
    explanation: "DFS using recursion has O(V) space complexity due to the call stack in the worst case (straight line graph).",
    tags: ["dfs", "space-complexity"]
  },
  {
    question: "Which of the following has the best average-case time complexity for searching?",
    options: [
      { text: "Linear Search", isCorrect: false },
      { text: "Binary Search", isCorrect: false },
      { text: "Hash Table", isCorrect: true },
      { text: "Binary Search Tree", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Hash Table",
    explanation: "Hash tables provide O(1) average-case search time, making them fastest for searching operations.",
    tags: ["hashtable", "search"]
  },
  {
    question: "What is the maximum number of nodes at level k in a binary tree?",
    options: [
      { text: "k", isCorrect: false },
      { text: "2^k", isCorrect: true },
      { text: "2k", isCorrect: false },
      { text: "k²", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    topic: "Binary Tree",
    explanation: "At level k in a binary tree, there can be at most 2^k nodes (assuming root is at level 0).",
    tags: ["binary-tree", "levels"]
  },
  {
    question: "Which algorithm is used for topological sorting?",
    options: [
      { text: "BFS (Kahn's algorithm)", isCorrect: true },
      { text: "Binary Search", isCorrect: false },
      { text: "Merge Sort", isCorrect: false },
      { text: "Dijkstra's", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    topic: "Graph",
    explanation: "Kahn's algorithm uses BFS with in-degree calculation to perform topological sorting of directed acyclic graphs.",
    tags: ["topological-sort", "bfs"]
  }
];

async function seedMCQQuestions() {
  try {
    console.log('🌱 Starting to seed 20 new MCQ questions...');
    
    // Insert all questions
    const result = await MCQQuestion.insertMany(newMCQQuestions);
    console.log(`✅ Successfully inserted ${result.length} MCQ questions`);
    
    // Show summary
    const topics = [...new Set(newMCQQuestions.map(q => q.topic))];
    const difficulties = newMCQQuestions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Summary:');
    console.log(`   Total questions: ${result.length}`);
    console.log(`   Topics covered: ${topics.join(', ')}`);
    console.log(`   Difficulty distribution:`, difficulties);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MCQ questions:', error);
    process.exit(1);
  }
}
