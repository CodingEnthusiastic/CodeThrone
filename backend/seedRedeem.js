import './loadenv.js';
import mongoose from 'mongoose';
import { RedeemItem } from './models/Redeem.js';

const seedData = [
  {
    name: 'Coding T-Shirt',
    description: 'Premium quality cotton t-shirt with coding quotes and programming humor',
    coinsCost: 500,
    category: 'clothing',
    imageUrl: 'https://via.placeholder.com/300x300/3B82F6/FFFFFF?text=Coding+T-Shirt',
    inStock: true,
    popularity: 95
  },
  {
    name: 'Programming Mug',
    description: 'Coffee mug for programmers with funny coding jokes - Perfect for your morning coffee',
    coinsCost: 250,
    category: 'accessories',
    imageUrl: 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Programming+Mug',
    inStock: true,
    popularity: 88
  },
  {
    name: 'Bluetooth Headphones',
    description: 'Wireless headphones perfect for coding sessions - Noise cancellation included',
    coinsCost: 1200,
    category: 'electronics',
    imageUrl: 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Headphones',
    inStock: true,
    popularity: 92
  },
  {
    name: 'Algorithm Book',
    description: 'Advanced algorithms and data structures book - Essential for competitive programming',
    coinsCost: 800,
    category: 'books',
    imageUrl: 'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=Algorithm+Book',
    inStock: true,
    popularity: 85
  },
  {
    name: 'Amazon Gift Card ($25)',
    description: '$25 Amazon gift card for your shopping needs - Digital delivery',
    coinsCost: 2000,
    category: 'vouchers',
    imageUrl: 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=Gift+Card',
    inStock: true,
    popularity: 98
  },
  {
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard for better coding experience - Cherry MX switches',
    coinsCost: 1500,
    category: 'electronics',
    imageUrl: 'https://via.placeholder.com/300x300/06B6D4/FFFFFF?text=Keyboard',
    inStock: false,
    popularity: 90
  },
  {
    name: 'Coding Hoodie',
    description: 'Comfortable hoodie with developer-themed designs - Perfect for coding marathons',
    coinsCost: 750,
    category: 'clothing',
    imageUrl: 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Coding+Hoodie',
    inStock: true,
    popularity: 87
  },
  {
    name: 'Mouse Pad',
    description: 'Large gaming mouse pad with programming motifs - Anti-slip base',
    coinsCost: 200,
    category: 'accessories',
    imageUrl: 'https://via.placeholder.com/300x300/6366F1/FFFFFF?text=Mouse+Pad',
    inStock: true,
    popularity: 75
  }
];

async function seedRedeemItems() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena');
    console.log('✅ Connected to MongoDB');

    console.log('🗑️ Clearing existing redeem items...');
    await RedeemItem.deleteMany({});

    console.log('🌱 Seeding redeem items...');
    await RedeemItem.insertMany(seedData);

    console.log(`✅ Successfully seeded ${seedData.length} redeem items!`);
    
    // Display seeded items
    console.log('\n📦 Seeded Items:');
    seedData.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} - ${item.coinsCost} coins (${item.category})`);
    });

  } catch (error) {
    console.error('❌ Error seeding redeem items:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedRedeemItems();
