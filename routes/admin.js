import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/adminController.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.route('/users')
  .get(getAllUsers)
  .post(createUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

export default router;
