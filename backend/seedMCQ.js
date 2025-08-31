import "./loadenv.js";
import mongoose from "mongoose";
import MCQQuestion from "./models/MCQQuestion.js";

const sampleQuestions = [
  // DSA Questions (3)
  {
    question: "What is the time complexity of searching in a balanced binary search tree?",
    options: [
      { text: "O(n)", isCorrect: false },
      { text: "O(log n)", isCorrect: true },
      { text: "O(n log n)", isCorrect: false },
      { text: "O(1)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Medium",
    explanation: "In a balanced BST, the height is log n, so search operations take O(log n) time."
  },
  {
    question: "Which sorting algorithm has the best average-case time complexity?",
    options: [
      { text: "Bubble Sort - O(n²)", isCorrect: false },
      { text: "Quick Sort - O(n log n)", isCorrect: true },
      { text: "Selection Sort - O(n²)", isCorrect: false },
      { text: "Insertion Sort - O(n²)", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    explanation: "Quick Sort has an average-case time complexity of O(n log n), making it one of the most efficient sorting algorithms."
  },
  {
    question: "What data structure is used to implement BFS (Breadth-First Search)?",
    options: [
      { text: "Stack", isCorrect: false },
      { text: "Queue", isCorrect: true },
      { text: "Priority Queue", isCorrect: false },
      { text: "Linked List", isCorrect: false }
    ],
    domain: "dsa",
    difficulty: "Easy",
    explanation: "BFS uses a queue to process nodes level by level, ensuring breadth-first traversal."
  },

  // System Design Questions (3)
  {
    question: "What is the primary purpose of a load balancer in system design?",
    options: [
      { text: "Data encryption", isCorrect: false },
      { text: "Distribute incoming requests across multiple servers", isCorrect: true },
      { text: "Store user sessions", isCorrect: false },
      { text: "Handle database connections", isCorrect: false }
    ],
    domain: "system-design",
    difficulty: "Medium",
    explanation: "Load balancers distribute incoming requests across multiple servers to ensure optimal resource utilization and high availability."
  },
  {
    question: "Which database type is best for handling complex relationships?",
    options: [
      { text: "NoSQL Document Store", isCorrect: false },
      { text: "Relational Database (SQL)", isCorrect: true },
      { text: "Key-Value Store", isCorrect: false },
      { text: "Graph Database for simple relations", isCorrect: false }
    ],
    domain: "system-design",
    difficulty: "Easy",
    explanation: "Relational databases excel at handling complex relationships through foreign keys, joins, and ACID properties."
  },
  {
    question: "What is horizontal scaling (scale-out) in system design?",
    options: [
      { text: "Adding more power to existing machines", isCorrect: false },
      { text: "Adding more machines to the resource pool", isCorrect: true },
      { text: "Optimizing existing code", isCorrect: false },
      { text: "Increasing database connections", isCorrect: false }
    ],
    domain: "system-design",
    difficulty: "Medium",
    explanation: "Horizontal scaling involves adding more machines to handle increased load, rather than upgrading existing hardware."
  },

  // AI/ML Questions (2)
  {
    question: "What is the main advantage of using ReLU activation function?",
    options: [
      { text: "It prevents vanishing gradient problem", isCorrect: true },
      { text: "It's computationally expensive", isCorrect: false },
      { text: "It always outputs between 0 and 1", isCorrect: false },
      { text: "It's only used in output layers", isCorrect: false }
    ],
    domain: "aiml",
    difficulty: "Medium",
    explanation: "ReLU helps prevent vanishing gradients by allowing positive values to pass through unchanged, enabling better training of deep networks."
  },
  {
    question: "Which algorithm is commonly used for dimensionality reduction?",
    options: [
      { text: "K-Means Clustering", isCorrect: false },
      { text: "Principal Component Analysis (PCA)", isCorrect: true },
      { text: "Linear Regression", isCorrect: false },
      { text: "Decision Trees", isCorrect: false }
    ],
    domain: "aiml",
    difficulty: "Easy",
    explanation: "PCA is a widely used technique for reducing the number of features while preserving most of the variance in data."
  },

  // Aptitude Questions (2)
  {
    question: "If a train travels 60 km in 45 minutes, what is its speed in km/hr?",
    options: [
      { text: "75 km/hr", isCorrect: false },
      { text: "80 km/hr", isCorrect: true },
      { text: "85 km/hr", isCorrect: false },
      { text: "90 km/hr", isCorrect: false }
    ],
    domain: "aptitude",
    difficulty: "Easy",
    explanation: "Speed = Distance/Time = 60 km / (45/60) hours = 60 km / 0.75 hours = 80 km/hr"
  },
  {
    question: "What is the next number in the sequence: 2, 6, 12, 20, 30, ?",
    options: [
      { text: "40", isCorrect: false },
      { text: "42", isCorrect: true },
      { text: "44", isCorrect: false },
      { text: "48", isCorrect: false }
    ],
    domain: "aptitude",
    difficulty: "Medium",
    explanation: "The pattern is n(n+1): 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, 6×7=42"
  }
];

async function seedMCQQuestions() {
  try {
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🧹 Clearing existing MCQ questions...");
    await MCQQuestion.deleteMany({});
    
    console.log("🌱 Seeding MCQ questions...");
    await MCQQuestion.insertMany(sampleQuestions);
    
    console.log("✅ Successfully seeded", sampleQuestions.length, "MCQ questions");
    
    // Verify the seeding
    const count = await MCQQuestion.countDocuments();
    console.log("📊 Total MCQ questions in database:", count);
    
    // Show distribution by domain
    const domainStats = await MCQQuestion.aggregate([
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log("📈 Questions by domain:");
    domainStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} questions`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding MCQ questions:", error);
    process.exit(1);
  }
}

seedMCQQuestions();
