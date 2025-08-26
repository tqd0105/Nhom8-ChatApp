const bcrypt = require('bcrypt');
const Joi = require('joi');
const createError = require('http-errors');
const auth = require('../middleware/auth');

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  email: Joi.string().email().optional()
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const authController = {
  // Đăng ký tài khoản
  register: async (req, res, next) => {
    try {
      // Validate input
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        throw createError(400, error.details[0].message);
      }

      const { username, password, email } = value;

      // Check if user already exists
      if (auth.users.exists(username)) {
        throw createError(409, 'Username already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = auth.users.create({
        username,
        password: hashedPassword,
        email: email || null
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Đăng nhập
  login: async (req, res, next) => {
    try {
      // Validate input
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        throw createError(400, error.details[0].message);
      }

      const { username, password } = value;

      // Find user
      const user = auth.users.findByUsername(username);
      if (!user) {
        throw createError(401, 'Invalid username or password');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw createError(401, 'Invalid username or password');
      }

      // Generate token
      const token = auth.generateToken({
        username: user.username,
        email: user.email
      });

      res.json({
        message: 'Login successful',
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      });
    } catch (error) {
      next(error);
    }
  },

  // Lấy thông tin user hiện tại (cần token)
  getProfile: async (req, res, next) => {
    try {
      const user = auth.users.findByUsername(req.user.username);
      if (!user) {
        throw createError(404, 'User not found');
      }

      res.json({
        user: {
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Cập nhật profile (cần token)
  updateProfile: async (req, res, next) => {
    try {
      const updateSchema = Joi.object({
        email: Joi.string().email().optional(),
        password: Joi.string().min(6).optional()
      });

      const { error, value } = updateSchema.validate(req.body);
      if (error) {
        throw createError(400, error.details[0].message);
      }

      const { email, password } = value;
      const updateData = {};

      if (email) updateData.email = email;
      if (password) {
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(password, saltRounds);
      }

      const updatedUser = auth.users.update(req.user.username, updateData);
      if (!updatedUser) {
        throw createError(404, 'User not found');
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          username: updatedUser.username,
          email: updatedUser.email,
          createdAt: updatedUser.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Verify token (cho frontend check)
  verifyToken: async (req, res, next) => {
    try {
      res.json({
        valid: true,
        user: {
          username: req.user.username,
          email: req.user.email
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Lấy danh sách users (cho admin/debug)
  getAllUsers: async (req, res, next) => {
    try {
      const users = auth.users.getAll().map(user => ({
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }));
      
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
