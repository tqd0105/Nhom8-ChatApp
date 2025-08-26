const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// In-memory user storage (thay thế database)
const users = new Map(); // username -> { username, password (hashed), email, createdAt }

// File để lưu users
const USERS_FILE = path.join(__dirname, '../users.json');

// Load users từ file khi khởi động
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      const usersArray = JSON.parse(data);
      usersArray.forEach(user => {
        users.set(user.username, user);
      });
      console.log(`Loaded ${usersArray.length} users from file`);
    }
  } catch (error) {
    console.warn('Failed to load users from file:', error.message);
  }
}

// Save users vào file
function saveUsers() {
  try {
    const usersArray = Array.from(users.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2));
  } catch (error) {
    console.warn('Failed to save users to file:', error.message);
  }
}

// Load users khi module được import
loadUsers();

const authMiddleware = {
  // Middleware để verify JWT token
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Access token is required'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return next(createError(401, 'Token has expired'));
      } else if (error.name === 'JsonWebTokenError') {
        return next(createError(401, 'Invalid token'));
      } else {
        return next(createError(401, 'Token verification failed'));
      }
    }
  },

  // Optional middleware - không bắt buộc phải có token
  optionalAuth: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Ignore token errors for optional auth
    }
    
    next();
  },

  // Generate JWT token
  generateToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    });
  },

  // In-memory user management functions
  users: {
    // Add user to memory
    create: (userData) => {
      const user = {
        ...userData,
        createdAt: new Date().toISOString()
      };
      users.set(userData.username, user);
      saveUsers(); // Auto-save
      return user;
    },

    // Find user by username
    findByUsername: (username) => {
      return users.get(username);
    },

    // Check if user exists
    exists: (username) => {
      return users.has(username);
    },

    // Get all users (for debugging)
    getAll: () => {
      return Array.from(users.values());
    },

    // Update user
    update: (username, updateData) => {
      const user = users.get(username);
      if (user) {
        const updatedUser = { ...user, ...updateData };
        users.set(username, updatedUser);
        saveUsers(); // Auto-save
        return updatedUser;
      }
      return null;
    },

    // Delete user
    delete: (username) => {
      const result = users.delete(username);
      if (result) {
        saveUsers(); // Auto-save
      }
      return result;
    }
  }
};

module.exports = authMiddleware;
