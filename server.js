import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import doctorRoutes from './routes/doctor.js';
import patientRoutes from './routes/patient.js';
import prescriptionRoutes from './routes/prescription.js';
import appointmentRoutes from './routes/appointment.js';
import medicalRecordsRoutes from './routes/medicalRecords.js';
import inventoryRoutes from './routes/inventory.js';
import importExportRoutes from './routes/importExport.js';
import paymentRoutes from './routes/payment.js';

// Load environment variables
dotenv.config();
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://hms-opd-frontend-dr9r.vercel.app',
    'https://hms-opd-frontend-ll9f.vercel.app',
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tekisky OPD Backend is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/prescription', prescriptionRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/medical-records', medicalRecordsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin/import-export', importExportRoutes);
app.use('/api/payment', paymentRoutes);

// Serve medical records (prescription PDFs) with correct content-type
app.use('/medical_records', express.static('medical_records', {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));




// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
