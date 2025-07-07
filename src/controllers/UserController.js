const { User, Address } = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// Validate JWT_SECRET
function validateJwtSecret() {
  const JWT_SECRET = process.env.JWT_SECRET?.trim(); // ✅ Read from env, not from function
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables. Please check .env.test file.');
    console.error('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      path: process.env.NODE_ENV === 'test' ? require('path').resolve(__dirname, '../.env.test') : '.env',
    });
    if (process.env.NODE_ENV === 'test') {
      throw new Error('JWT_SECRET is required for tests');
    }
    console.warn('JWT_SECRET missing, some features (e.g., JWT auth) may not work');
  }
  return JWT_SECRET;
}


const JWT_SECRET = validateJwtSecret();

// Request validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('customer', 'admin', 'designer', 'production').default('customer'),
});
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

class AuthController {
  static async register(req, res) {
    try {
      const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.log('Register validation error:', error.details);
        return res.status(400).json({ success: false, error: error.details.map(e => e.message) });
      }
      const { email, password, name, role } = value;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password, 12);
      const user = await User.create({ email, password: hash, name, role });
      console.log('User registered:', user.email);
      const userData = { email: user.email, name: user.name, role: user.role };
      return res.status(201).json({ success: true, data: userData });
    } catch (error) {
      console.error('Register error:', error.message);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  static async login(req, res) {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.log('Login validation error:', error.details);
        return res.status(400).json({ success: false, error: error.details.map(e => e.message) });
      }
      const { email, password } = value;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '1h',
      });
      console.log('Login successful, token generated for:', user.email);
      return res.status(200).json({ success: true, token });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  static googleAuth(req, res, next) {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }

  static googleCallback(req, res, next) {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) return res.redirect('/login?error=oauth');
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '1h',
      });
      res.redirect(`/auth/success?token=${token}`);
    })(req, res, next);
  }

  static facebookAuth(req, res, next) {
    passport.authenticate('facebook', { scope: ['email'] })(req, res, next);
  }

  static facebookCallback(req, res, next) {
    passport.authenticate('facebook', { session: false }, (err, user) => {
      if (err || !user) return res.redirect('/login?error=oauth');
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '1h',
      });
      res.redirect(`/auth/success?token=${token}`);
    })(req, res, next);
  }
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ where: { email: profile.emails[0].value } });
          if (!user) {
            user = await User.create({
              email: profile.emails[0].value,
              name: profile.displayName,
              password: '',
              role: 'customer',
              isVerified: true,
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET && process.env.FACEBOOK_CALLBACK_URL) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ['id', 'emails', 'name', 'displayName'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ where: { email: profile.emails[0].value } });
          if (!user) {
            user = await User.create({
              email: profile.emails[0].value,
              name: profile.displayName,
              password: '',
              role: 'customer',
              isVerified: true,
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

class ProfileController {
  static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'email', 'name', 'role'],
        include: [{ model: Address, as: 'addresses', required: false }],
      });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      console.log('Profile retrieved for user:', user.email);
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error('Get profile error:', error.message);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      await user.update(req.body, { fields: ['name', 'role'] });
      console.log('Profile updated for user:', user.email);
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error('Update profile error:', error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  static async addAddress(req, res) {
    try {
      const address = await Address.create({ ...req.body, userId: req.user.id });
      console.log('Address added for userId:', req.user.id);
      return res.status(201).json({ success: true, data: address });
    } catch (error) {
      console.error('Add address error:', error.message);
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getAddresses(req, res) {
    try {
      const addresses = await Address.findAll({ where: { userId: req.user.id } });
      console.log('Addresses retrieved for userId:', req.user.id);
      return res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      console.error('Get addresses error:', error.message);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}

function auth(req, res, next) {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log('Token verified for user ID:', decoded.id);
    next();
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

module.exports = { AuthController, ProfileController, auth, requireRole };