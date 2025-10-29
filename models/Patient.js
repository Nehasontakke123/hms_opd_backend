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
    enum: ['waiting', 'in-progress', 'completed'],
    default: 'waiting'
  },
  prescription: {
    diagnosis: String,
    medicines: [{
      name: String,
      dosage: String,
      duration: String
    }],
    notes: String,
    createdAt: Date,
    pdfPath: String // Path to PDF file in medical section
  }
}, {
  timestamps: true
});

// Index for efficient queries
patientSchema.index({ doctor: 1, registrationDate: -1 });
patientSchema.index({ tokenNumber: 1, registrationDate: 1 });

export default mongoose.model('Patient', patientSchema);
