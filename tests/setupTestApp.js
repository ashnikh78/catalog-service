const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const userRoutes = require('../src/routes/userRoutes');
const { sequelize } = require('../src/models/User');
require('dotenv').config({ path: '.env.test' }); // Load environment variables

// Setup Express app
const app = express();
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/auth', userRoutes.authRoutes);
app.use('/profile', userRoutes.profileRoutes);

// Add health check endpoint for testing
app.get('/health', (req, res) => res.json({ status: 'ok' }));

describe('User Service Integration', () => {
  const testUser = {
    email: 'testuser@example.com',
    password: 'StrongPass123!',
    name: 'Test User',
    role: 'customer',
  };

  beforeAll(async () => {
    // Ensure test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('NODE_ENV must be set to "test"');
    }
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in .env.test');
    }
    // Database is synced in database.js, no need to configure here
    console.log('Test environment initialized');
  });

  beforeEach(async () => {
    // Clear all tables and register user before each test
    for (const model of Object.values(sequelize.models)) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
    const registerRes = await request(app).post('/auth/register').send(testUser);
    console.log('Test user registration response:', registerRes.body); // Debug output
    expect(registerRes.statusCode).toBe(201); // Ensure registration succeeds
    console.log('Database cleared and test user registered for test');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('Database connection closed');
  });

  it('should return health status', async () => {
    const res = await request(app).get('/health');
    console.log('Health check response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should register a new user', async () => {
    // Clear database to test fresh registration
    for (const model of Object.values(sequelize.models)) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Register response:', res.body); // Debug output
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should not register duplicate user', async () => {
    // User already registered in beforeEach
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Duplicate register response:', res.body); // Debug output
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Email already registered');
  });

  it('should login and return a JWT token', async () => {
    // User already registered in beforeEach
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    console.log('Login response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should not login with incorrect credentials', async () => {
    // User already registered in beforeEach
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });
    console.log('Login with wrong password response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should get user profile with valid token', async () => {
    // User already registered in beforeEach, perform login
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    console.log('Login response:', loginRes.body); // Debug output
    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.body.token;
    console.log('Token:', token); // Debug output

    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);
    console.log('Profile response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should not get profile with invalid token', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', 'Bearer invalidtoken');
    console.log('Invalid token profile response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid token');
  });

  it('should not get profile without token', async () => {
    const res = await request(app).get('/profile');
    console.log('No token profile response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
  });

  it('should validate required fields during registration', async () => {
    // Clear database to test invalid registration
    for (const model of Object.values(sequelize.models)) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
    const invalidUser = {
      email: 'invalid-email',
      password: '123', // too short
      name: 'A', // too short
    };
    const res = await request(app)
      .post('/auth/register')
      .send(invalidUser);
    console.log('Invalid register response:', res.body); // Debug output
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should validate required fields during login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com' }); // missing password
    console.log('Invalid login response:', res.body); // Debug output
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

module.exports = app;