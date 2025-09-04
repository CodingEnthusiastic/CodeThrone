import "../loadenv.js" // This must be first
import mongoose from 'mongoose';
import migrateUserStats from './migrateUserStats.js';

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codearena");
    console.log('📱 Connected to MongoDB');
    
    // Run migration
    await migrateUserStats();
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔐 Database connection closed');
    
  } catch (error) {
    console.error('💥 Migration error:', error);
    process.exit(1);
  }
};

runMigration();
