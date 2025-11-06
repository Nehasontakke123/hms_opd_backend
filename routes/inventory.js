import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAllMedicines,
  getMedicineById,
  createOrUpdateMedicine,
  updateStock,
  getTransactions,
  getMedicineSuggestions
} from '../controllers/inventoryController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/medicines', getAllMedicines);
router.get('/medicines/search/suggestions', getMedicineSuggestions);
router.get('/medicines/:id', getMedicineById);
router.get('/transactions', getTransactions);

// Admin only routes
router.post('/medicines', authorize('admin'), createOrUpdateMedicine);
router.put('/medicines/:id', authorize('admin'), createOrUpdateMedicine);
router.put('/medicines/:id/stock', authorize('admin'), updateStock);

export default router;

