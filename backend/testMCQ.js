import "./loadenv.js";
import mongoose from "mongoose";
import MCQQuestion from "./models/MCQQuestion.js";

console.log('🔍 Testing MCQ questions...');

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Check all MCQ questions
  const allQuestions = await MCQQuestion.find({});
  console.log(`📊 Total questions in database: ${allQuestions.length}`);

  // Check active questions
  const activeQuestions = await MCQQuestion.find({ isActive: true });
  console.log(`✅ Active questions: ${activeQuestions.length}`);

  // Show first few questions with full structure
  const sampleQuestions = await MCQQuestion.find({ isActive: true }).limit(3);
  console.log('\n📋 Sample questions:');
  
  sampleQuestions.forEach((q, i) => {
    console.log(`\nQuestion ${i + 1}:`);
    console.log(`  ID: ${q._id}`);
    console.log(`  Text: ${q.question}`);
    console.log(`  Domain: ${q.domain}`);
    console.log(`  Difficulty: ${q.difficulty}`);
    console.log(`  Active: ${q.isActive}`);
    console.log(`  Options (${q.options.length}):`);
    q.options.forEach((opt, idx) => {
      console.log(`    ${idx}: "${opt.text}" (${opt.isCorrect ? 'CORRECT' : 'wrong'})`);
    });
    console.log('  ---');
  });

  // Test aggregation query
  console.log('\n🎲 Testing aggregation query:');
  const dsaQuestions = await MCQQuestion.aggregate([
    { $match: { domain: 'dsa', isActive: true } },
    { $sample: { size: 3 } }
  ]);
  
  console.log(`DSA questions from aggregation: ${dsaQuestions.length}`);
  if (dsaQuestions.length > 0) {
    console.log('First DSA question:');
    console.log(`  ID: ${dsaQuestions[0]._id}`);
    console.log(`  Question: ${dsaQuestions[0].question}`);
    console.log(`  Options: ${dsaQuestions[0].options.length}`);
  }

} catch (error) {
  console.error('❌ Error:', error);
} finally {
  process.exit(0);
}
