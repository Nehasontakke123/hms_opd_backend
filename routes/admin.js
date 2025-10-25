const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

router.route('/users')
  .get(getAllUsers)
  .post(createUser);

router.route('/users/:id')
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
