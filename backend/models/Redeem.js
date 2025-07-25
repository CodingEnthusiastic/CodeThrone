import mongoose from 'mongoose';

const redeemItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  coinsCost: {
    type: Number,
    required: true,
    min: 1
  },
  category: {
    type: String,
    required: true,
    enum: ['electronics', 'clothing', 'books', 'accessories', 'vouchers']
  },
  imageUrl: {
    type: String,
    required: true
  },
  inStock: {
    type: Boolean,
    default: true
  },
  popularity: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const redeemOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedeemItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  totalCost: {
    type: Number,
    required: true,
    min: 1
  },
  deliveryAddress: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  trackingNumber: {
    type: String,
    sparse: true
  }
});

const RedeemItem = mongoose.model('RedeemItem', redeemItemSchema);
const RedeemOrder = mongoose.model('RedeemOrder', redeemOrderSchema);

export { RedeemItem, RedeemOrder };
