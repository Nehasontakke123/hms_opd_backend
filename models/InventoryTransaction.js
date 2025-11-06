import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  transactionType: {
    type: String,
    enum: ['prescription', 'restock', 'adjustment', 'expired', 'damaged'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
inventoryTransactionSchema.index({ medicine: 1, createdAt: -1 });
inventoryTransactionSchema.index({ transactionType: 1 });
inventoryTransactionSchema.index({ createdAt: -1 });

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);

