const express = require('express');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes (không cần token)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (cần token)
router.get('/profile', auth.verifyToken, authController.getProfile);
router.put('/profile', auth.verifyToken, authController.updateProfile);
router.get('/verify', auth.verifyToken, authController.verifyToken);

// Debug route (lấy tất cả users - trong production nên xóa hoặc bảo vệ)
router.get('/users', authController.getAllUsers);

module.exports = router;
