import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide medicine name'],
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true
  },
  brandName: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  form: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other'],
    default: 'Tablet'
  },
  strength: {
    type: String,
    trim: true
  },
  unit: {
    type: String,
    default: 'unit'
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStockLevel: {
    type: Number,
    default: 1000,
    min: 0
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  category: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['manual', 'imported'],
    default: 'manual'
  },
  importedData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
medicineSchema.index({ name: 'text', genericName: 'text', brandName: 'text' });
medicineSchema.index({ stockQuantity: 1 });
medicineSchema.index({ expiryDate: 1 });
medicineSchema.index({ isActive: 1 });

// Virtual for low stock status
medicineSchema.virtual('isLowStock').get(function() {
  return this.stockQuantity <= this.minStockLevel;
});

// Virtual for expired status
medicineSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date(this.expiryDate) < new Date();
});

// Virtual for expiring soon (within 30 days)
medicineSchema.virtual('isExpiringSoon').get(function() {
  if (!this.expiryDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return new Date(this.expiryDate) <= thirtyDaysFromNow && new Date(this.expiryDate) > new Date();
});

export default mongoose.model('Medicine', medicineSchema);

