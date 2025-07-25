import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Coins, Gift, Truck, MapPin, Phone, User, CheckCircle, Star } from 'lucide-react';

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
      const response = await axios.get('http://localhost:5000/api/redeem/items', {
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

      await axios.post('http://localhost:5000/api/redeem/order', orderData, {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
  );
};

export default Redeem;
