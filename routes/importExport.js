import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  importMedicinesFromJSON,
  importMedicinesFromExcel,
  exportMedicinesToJSON,
  exportMedicinesToExcel,
  syncMedicineData
} from '../controllers/importExportController.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for Excel file uploads (strict - only Excel files)
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for large medicine datasets
  },
  fileFilter: (req, file, cb) => {
    // Only accept Excel files for Excel import
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
    
    // Also check file extension as fallback
    const hasExcelExtension = /\.(xlsx|xls)$/i.test(file.originalname);
    
    if (allowedMimeTypes.includes(file.mimetype) || hasExcelExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls). For JSON files, use the "Import from JSON" section.'));
    }
  }
});

// Configure multer for JSON file uploads (if needed in future)
const uploadJSON = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || /\.json$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON files are allowed.'));
    }
  }
});

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 100MB. Please split your file into smaller chunks or compress it.',
        error: err.message
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message,
      error: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
      error: err.message
    });
  }
  next();
};

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.post('/import/json', importMedicinesFromJSON);
router.post('/import/excel', (req, res, next) => {
  uploadExcel.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, importMedicinesFromExcel);
router.get('/export/json', exportMedicinesToJSON);
router.get('/export/excel', exportMedicinesToExcel);
router.post('/sync', syncMedicineData);

export default router;

