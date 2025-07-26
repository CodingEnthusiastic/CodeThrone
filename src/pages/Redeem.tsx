import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Coins, Gift, Truck, MapPin, Phone, User, CheckCircle, Star } from 'lucide-react';
import { API_URL, SOCKET_URL } from "../config/api";

interface RedeemItem {
  _id: string;
  name: string;
  description: string;
  coinsCost: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  popularity: number;
}

interface RedeemOrder {
  itemId: string;
  quantity: number;
  deliveryAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

const Redeem: React.FC = () => {
  const { user, token, updateCoins } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [items, setItems] = useState<RedeemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RedeemItem | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deliveryAddress, setDeliveryAddress] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const categories = ['all', 'electronics', 'clothing', 'books', 'accessories', 'vouchers'];

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchRedeemItems();
  }, [user, token, navigate]);

  const fetchRedeemItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/redeem/items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching redeem items:', error);
      // Set dummy data for demonstration
      setItems([
        {
          _id: '1',
          name: 'Coding T-Shirt',
          description: 'Premium quality cotton t-shirt with coding quotes',
          coinsCost: 500,
          category: 'clothing',
          imageUrl: 'https://via.placeholder.com/300x300/3B82F6/FFFFFF?text=Coding+T-Shirt',
          inStock: true,
          popularity: 95
        },
        {
          _id: '2',
          name: 'Programming Mug',
          description: 'Coffee mug for programmers with funny coding jokes',
          coinsCost: 250,
          category: 'accessories',
          imageUrl: 'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Programming+Mug',
          inStock: true,
          popularity: 88
        },
        {
          _id: '3',
          name: 'Bluetooth Headphones',
          description: 'Wireless headphones perfect for coding sessions',
          coinsCost: 1200,
          category: 'electronics',
          imageUrl: 'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Headphones',
          inStock: true,
          popularity: 92
        },
        {
          _id: '4',
          name: 'Algorithm Book',
          description: 'Advanced algorithms and data structures book',
          coinsCost: 800,
          category: 'books',
          imageUrl: 'https://via.placeholder.com/300x300/F59E0B/FFFFFF?text=Algorithm+Book',
          inStock: true,
          popularity: 85
        },
        {
          _id: '5',
          name: 'Amazon Gift Card',
          description: '$25 Amazon gift card for your shopping needs',
          coinsCost: 2000,
          category: 'vouchers',
          imageUrl: 'https://via.placeholder.com/300x300/EF4444/FFFFFF?text=Gift+Card',
          inStock: true,
          popularity: 98
        },
        {
          _id: '6',
          name: 'Mechanical Keyboard',
          description: 'RGB mechanical keyboard for better coding experience',
          coinsCost: 1500,
          category: 'electronics',
          imageUrl: 'https://via.placeholder.com/300x300/06B6D4/FFFFFF?text=Keyboard',
          inStock: false,
          popularity: 90
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemClick = (item: RedeemItem) => {
    if (!item.inStock) {
      alert('This item is currently out of stock!');
      return;
    }
    
    const totalCost = item.coinsCost * quantity;
    if (!user || (user.coins || 0) < totalCost) {
      alert(`You need ${totalCost} coins but only have ${user?.coins || 0} coins!`);
      return;
    }

    setSelectedItem(item);
    setShowRedeemModal(true);
  };

  const handleRedeemSubmit = async () => {
    if (!selectedItem || !user || !token) return;

    // Validate delivery address
    const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const field of requiredFields) {
      if (!deliveryAddress[field as keyof typeof deliveryAddress]) {
        alert(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return;
      }
    }

    const totalCost = selectedItem.coinsCost * quantity;
    if ((user.coins || 0) < totalCost) {
      alert(`Insufficient coins! You need ${totalCost} but have ${user.coins || 0}`);
      return;
    }

    setSubmitting(true);

    try {
      const orderData: RedeemOrder = {
        itemId: selectedItem._id,
        quantity,
        deliveryAddress
      };

      await axios.post(`${API_URL}/redeem/order`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update user coins
      const newCoinBalance = (user.coins || 0) - totalCost;
      updateCoins(newCoinBalance);

      alert(`🎉 Redemption successful! ${totalCost} coins deducted. Your order will be delivered to your address.`);
      
      // Reset form
      setShowRedeemModal(false);
      setSelectedItem(null);
      setQuantity(1);
      setDeliveryAddress({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
      });

    } catch (error: any) {
      console.error('Error processing redemption:', error);
      alert(error.response?.data?.error || 'Failed to process redemption. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
  );

  const getCategoryColor = (category: string) => {
    const colors = {
      electronics: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      clothing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      books: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      accessories: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      vouchers: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading redemption store...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 relative ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    }`}>
      {/* AI Cosmic Animation for Dark Mode */}
      {isDark && (
        <>
          <style>{`
            @keyframes ai-neural-pulse {
              0%, 100% {
                transform: translateX(0px) translateY(0px) scale(1) rotate(0deg);
                opacity: 0.6;
              }
              25% {
                transform: translateX(20px) translateY(-15px) scale(1.1) rotate(90deg);
                opacity: 1;
              }
              50% {
                transform: translateX(-10px) translateY(20px) scale(0.9) rotate(180deg);
                opacity: 0.8;
              }
              75% {
                transform: translateX(30px) translateY(5px) scale(1.05) rotate(270deg);
                opacity: 0.9;
              }
            }
            @keyframes ai-data-stream {
              0% { transform: translateY(-100px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(100vh) translateX(25px) rotate(360deg); opacity: 0; }
            }
            @keyframes neural-network {
              0%, 100% { 
                opacity: 0.4;
                transform: scale(1) rotate(0deg);
              }
              50% { 
                opacity: 1;
                transform: scale(1.1) rotate(180deg);
              }
            }
            @keyframes ai-constellation {
              0% { transform: rotate(0deg) translateX(120px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
            }
            @keyframes quantum-field {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1));
                transform: scale(1.1) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.1), rgba(16, 185, 129, 0.1));
                transform: scale(0.9) rotate(240deg);
              }
            }
            @keyframes ai-circuit-flow {
              0% { transform: translateX(-100px) translateY(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.7; }
              90% { opacity: 0.7; }
              100% { transform: translateX(100vw) translateY(20px) rotate(360deg); opacity: 0; }
            }
            .ai-neural-pulse {
              animation: ai-neural-pulse 7s ease-in-out infinite;
            }
            .ai-data-stream {
              animation: ai-data-stream 9s linear infinite;
            }
            .neural-network {
              animation: neural-network 3s ease-in-out infinite;
            }
            .ai-constellation {
              animation: ai-constellation 25s linear infinite;
            }
            .quantum-field {
              animation: quantum-field 14s ease-in-out infinite;
            }
            .ai-circuit-flow {
              animation: ai-circuit-flow 10s linear infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Quantum field backgrounds */}
            <div className="absolute top-1/4 left-1/5 w-96 h-96 quantum-field rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 quantum-field rounded-full blur-3xl" style={{ animationDelay: '5s' }}></div>
            <div className="absolute top-2/3 left-1/3 w-64 h-64 quantum-field rounded-full blur-2xl" style={{ animationDelay: '10s' }}></div>
            
            {/* AI Neural Network Nodes */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={`neural-node-${i}`}
                className={`neural-network absolute ${
                  i % 7 === 0 ? 'w-2 h-2 bg-blue-400 rounded-full' :
                  i % 7 === 1 ? 'w-1.5 h-1.5 bg-purple-400 rounded-full' :
                  i % 7 === 2 ? 'w-2 h-2 bg-cyan-400 rounded-full' :
                  i % 7 === 3 ? 'w-1 h-1 bg-green-400 rounded-full' :
                  i % 7 === 4 ? 'w-1.5 h-1.5 bg-teal-400 rounded-full' :
                  i % 7 === 5 ? 'w-2 h-2 bg-indigo-400 rounded-full' :
                  'w-1.5 h-1.5 bg-violet-400 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              />
            ))}
            
            {/* AI Data Streams */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`data-stream-${i}`}
                className={`ai-data-stream absolute w-1 h-6 ${
                  i % 4 === 0 ? 'bg-gradient-to-b from-blue-400 to-transparent' :
                  i % 4 === 1 ? 'bg-gradient-to-b from-purple-400 to-transparent' :
                  i % 4 === 2 ? 'bg-gradient-to-b from-cyan-400 to-transparent' :
                  'bg-gradient-to-b from-green-400 to-transparent'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 9}s`,
                  animationDuration: `${9 + Math.random() * 4}s`,
                }}
              />
            ))}

            {/* AI Circuit Flow */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`circuit-flow-${i}`}
                className={`ai-circuit-flow absolute w-1 h-1 ${
                  i % 4 === 0 ? 'bg-blue-400' :
                  i % 4 === 1 ? 'bg-purple-400' :
                  i % 4 === 2 ? 'bg-cyan-400' : 'bg-green-400'
                } rounded-full`}
                style={{
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 10}s`,
                  animationDuration: `${10 + Math.random() * 5}s`,
                }}
              />
            ))}

            {/* AI Constellation Orbiters */}
            <div className="absolute top-1/4 left-1/4 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-blue-400 rounded-full neural-network"></div>
            </div>
            <div className="absolute top-3/4 right-1/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-purple-400 rounded-full neural-network" style={{ animationDelay: '8s' }}></div>
            </div>
            <div className="absolute top-1/2 left-2/3 w-4 h-4">
              <div className="ai-constellation w-2 h-2 bg-cyan-400 rounded-full neural-network" style={{ animationDelay: '12s' }}></div>
            </div>

            {/* AI Neural Pulse Elements */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`ai-pulse-${i}`}
                className={`ai-neural-pulse absolute ${
                  i % 4 === 0 ? 'w-4 h-4 bg-gradient-to-br from-blue-500/40 to-cyan-500/40' :
                  i % 4 === 1 ? 'w-3 h-3 bg-gradient-to-br from-purple-500/40 to-violet-500/40' :
                  i % 4 === 2 ? 'w-3.5 h-3.5 bg-gradient-to-br from-green-500/40 to-teal-500/40' :
                  'w-4 h-4 bg-gradient-to-br from-indigo-500/40 to-purple-500/40'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${7 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 7}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Light Mode AI Animation */}
      {!isDark && (
        <>
          <style>{`
            @keyframes light-ai-float {
              0%, 100% {
                transform: translateY(0px) translateX(0px) rotate(0deg);
                opacity: 0.5;
              }
              25% {
                transform: translateY(-10px) translateX(12px) rotate(90deg);
                opacity: 0.8;
              }
              50% {
                transform: translateY(6px) translateX(-8px) rotate(180deg);
                opacity: 1;
              }
              75% {
                transform: translateY(-15px) translateX(18px) rotate(270deg);
                opacity: 0.6;
              }
            }
            @keyframes light-data-particle {
              0% { transform: translateY(-30px) translateX(0px) rotate(0deg); opacity: 0; }
              10% { opacity: 0.6; }
              90% { opacity: 0.6; }
              100% { transform: translateY(100vh) translateX(20px) rotate(360deg); opacity: 0; }
            }
            @keyframes ai-aurora {
              0%, 100% { 
                background: linear-gradient(45deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
                transform: scale(1) rotate(0deg);
              }
              33% { 
                background: linear-gradient(45deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12));
                transform: scale(1.05) rotate(120deg);
              }
              66% { 
                background: linear-gradient(45deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.12));
                transform: scale(0.95) rotate(240deg);
              }
            }
            @keyframes light-neural-glow {
              0%, 100% { 
                box-shadow: 0 0 10px rgba(59, 130, 246, 0.3), 0 0 20px rgba(147, 51, 234, 0.2);
                opacity: 0.5; 
              }
              50% { 
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(147, 51, 234, 0.4);
                opacity: 1; 
              }
            }
            .light-ai-float {
              animation: light-ai-float 6s ease-in-out infinite;
            }
            .light-data-particle {
              animation: light-data-particle 8s linear infinite;
            }
            .ai-aurora {
              animation: ai-aurora 11s ease-in-out infinite;
            }
            .light-neural-glow {
              animation: light-neural-glow 2.8s ease-in-out infinite;
            }
          `}</style>
          
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* AI Aurora backgrounds */}
            <div className="absolute top-1/5 left-1/3 w-96 h-96 ai-aurora rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/5 w-80 h-80 ai-aurora rounded-full blur-3xl" style={{ animationDelay: '4s' }}></div>
            <div className="absolute top-2/3 left-1/6 w-64 h-64 ai-aurora rounded-full blur-2xl" style={{ animationDelay: '8s' }}></div>
            
            {/* Light Neural Network Nodes */}
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={`light-neural-${i}`}
                className={`light-neural-glow absolute ${
                  i % 6 === 0 ? 'w-2 h-2 bg-blue-400/60 rounded-full' :
                  i % 6 === 1 ? 'w-1.5 h-1.5 bg-purple-400/60 rounded-full' :
                  i % 6 === 2 ? 'w-2 h-2 bg-cyan-400/60 rounded-full' :
                  i % 6 === 3 ? 'w-1 h-1 bg-green-400/60 rounded-full' :
                  i % 6 === 4 ? 'w-1.5 h-1.5 bg-teal-400/60 rounded-full' :
                  'w-2 h-2 bg-indigo-400/60 rounded-full'
                }`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2.8}s`,
                  animationDuration: `${2.8 + Math.random() * 1.5}s`,
                }}
              />
            ))}
            
            {/* Light Data Particles */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`light-data-${i}`}
                className={`light-data-particle absolute w-1 h-1 ${
                  i % 5 === 0 ? 'bg-blue-300/50' :
                  i % 5 === 1 ? 'bg-purple-300/50' :
                  i % 5 === 2 ? 'bg-cyan-300/50' :
                  i % 5 === 3 ? 'bg-green-300/50' : 'bg-teal-300/50'
                } rounded-full`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 8}s`,
                  animationDuration: `${8 + Math.random() * 3}s`,
                }}
              />
            ))}

            {/* Light AI Float Elements */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`light-ai-${i}`}
                className={`light-ai-float absolute ${
                  i % 4 === 0 ? 'w-3 h-3 bg-gradient-to-br from-blue-200/50 to-purple-200/50' :
                  i % 4 === 1 ? 'w-2.5 h-2.5 bg-gradient-to-br from-cyan-200/50 to-teal-200/50' :
                  i % 4 === 2 ? 'w-3 h-3 bg-gradient-to-br from-green-200/50 to-blue-200/50' :
                  'w-2.5 h-2.5 bg-gradient-to-br from-indigo-200/50 to-violet-200/50'
                } rounded-full blur-sm`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${6 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 6}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      
      <div className="relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Gift className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Coin Redemption Store</h1>
                <p className="text-gray-600 dark:text-gray-400">Exchange your hard-earned coins for amazing rewards!</p>
              </div>
            </div>
            <div className="flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 px-6 py-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-2" />
              <span className="text-xl font-bold text-yellow-800 dark:text-yellow-200">{user?.coins || 0}</span>
              <span className="text-sm text-yellow-600 dark:text-yellow-400 ml-1">coins</span>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 capitalize ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                {category === 'all' ? 'All Items' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
                !item.inStock ? 'opacity-60' : ''
              }`}
            >
              <div className="relative">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                {!item.inStock && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">Out of Stock</span>
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 text-yellow-500 mr-1" />
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{item.popularity}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Coins className="h-5 w-5 text-yellow-500 mr-1" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{item.coinsCost}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">coins</span>
                  </div>
                  
                  <button
                    onClick={() => handleRedeemClick(item)}
                    disabled={!item.inStock || (user?.coins || 0) < item.coinsCost}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
                      item.inStock && (user?.coins || 0) >= item.coinsCost
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Redeem
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No items found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try selecting a different category</p>
          </div>
        )}
      </div>

      {/* Redemption Modal */}
      {showRedeemModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Gift className="h-6 w-6 mr-2 text-purple-500" />
                Redeem {selectedItem.name}
              </h3>
              
              <div className="mb-6">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Cost:</span>
                  <div className="flex items-center">
                    <Coins className="h-5 w-5 text-yellow-500 mr-1" />
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedItem.coinsCost * quantity}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">coins</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Truck className="h-5 w-5 mr-2 text-green-500" />
                  Delivery Address
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={deliveryAddress.fullName}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, fullName: e.target.value})}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={deliveryAddress.phone}
                        onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <textarea
                      value={deliveryAddress.address}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, address: e.target.value})}
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="123 Main Street, Apartment 4B"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.city}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="New York"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.state}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="NY"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress.pincode}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, pincode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowRedeemModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Redemption
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Redeem;
