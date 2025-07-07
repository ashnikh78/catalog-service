// src/routes/userRoutes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { AuthController, ProfileController, auth, requireRole } = require('../controllers/UserController');
const passport = require('passport');

const authRoutes = express.Router();

// Validation middleware for register
const validateRegister = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['customer', 'admin', 'designer', 'production'])
    .withMessage('Role must be one of: customer, admin, designer, production'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Register route validation error:', errors.array());
      return res.status(400).json({ success: false, error: errors.array().map(e => e.msg) });
    }
    next();
  },
];

// Validation middleware for login
const validateLogin = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Login route validation error:', errors.array());
      return res.status(400).json({ success: false, error: errors.array().map(e => e.msg) });
    }
    next();
  },
];

authRoutes.post('/register', validateRegister, AuthController.register);
authRoutes.post('/login', validateLogin, AuthController.login);
authRoutes.get('/google', AuthController.googleAuth);
authRoutes.get('/google/callback', AuthController.googleCallback);
authRoutes.get('/facebook', AuthController.facebookAuth);
authRoutes.get('/facebook/callback', AuthController.facebookCallback);

const profileRoutes = express.Router();
profileRoutes.use((req, res, next) => {
  console.log('Profile route - Authorization header:', req.header('Authorization')); // Debug token
  auth(req, res, next);
});
profileRoutes.get('/', ProfileController.getProfile);
profileRoutes.put('/', ProfileController.updateProfile);
profileRoutes.post('/addresses', ProfileController.addAddress);
profileRoutes.get('/addresses', ProfileController.getAddresses);
profileRoutes.get('/admin', requireRole('admin'), (req, res) => res.json({ success: true, message: 'Admin access granted' }));

module.exports = { authRoutes, profileRoutes };