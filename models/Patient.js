import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide patient name'],
    trim: true
  },
  mobileNumber: {
    type: String,
    required: [true, 'Please provide mobile number'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Please provide address'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Please provide age'],
    min: 0,
    max: 150
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: [true, 'Please provide gender']
  },
  disease: {
    type: String,
    required: [true, 'Please provide disease/health issue'],
    trim: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fees: {
    type: Number,
    default: 0
  },
  feeStatus: {
    type: String,
    enum: ['paid', 'pending', 'not_required'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentAmount: {
    type: Number
  },
  isRecheck: {
    type: Boolean,
    default: false
  },
  bloodPressure: {
    type: String,
    required: [true, 'Please provide blood pressure reading'],
    trim: true
  },
  sugarLevel: {
    type: Number,
    required: [true, 'Please provide sugar level'],
    min: [1, 'Sugar level must be greater than 0']
  },
  isCancelled: {
    type: Boolean,
    default: false
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  tokenNumber: {
    type: Number,
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'cancelled'],
    default: 'waiting'
  },
  prescription: {
    diagnosis: String,
    medicines: [{
      name: String,
      dosage: String,
      duration: String
    }],
    inventoryItems: [{
      name: String,
      code: String,
      usage: String,
      dosage: String
    }],
    notes: String,
    createdAt: Date,
    pdfPath: String // Path to PDF file in medical section
  },
  behaviorRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
patientSchema.index({ doctor: 1, registrationDate: -1 });
patientSchema.index({ tokenNumber: 1, registrationDate: 1 });

export default mongoose.model('Patient', patientSchema);
