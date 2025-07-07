const request = require('supertest');
const express = require('express');
const { authRoutes, profileRoutes } = require('../src/routes/userRoutes');
const { sequelize } = require('../src/models/User');
require('dotenv').config({ path: '.env.test' }); // Load environment variables

// Setup a test app instance
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use('/profile', profileRoutes);
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  return app;
}

describe('User Service Integration', () => {
  let app;
  const testUser = {
    email: 'testuser@example.com',
    password: 'password123',
    name: 'Test User',
  };

  beforeAll(async () => {
    // Ensure test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('NODE_ENV must be set to "test"');
    }
    // Verify JWT_SECRET
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in .env.test');
    }
    app = createTestApp();
    // Setup test database
    sequelize.options.dialect = 'sqlite';
    sequelize.options.storage = ':memory:';
    sequelize.options.logging = false;
    await sequelize.sync({ force: true });
    console.log('Database initialized for testing');
  });

  beforeEach(async () => {
    // Clear all tables before each test
    for (const model of Object.values(sequelize.models)) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
    console.log('Database cleared before test');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('Database connection closed');
  });

  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Register response:', res.body); // Debug output
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  it('should not register duplicate user', async () => {
    // First registration
    const firstRes = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('First register response:', firstRes.body); // Debug output
    expect(firstRes.statusCode).toBe(201);

    // Second registration (should fail)
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Duplicate register response:', res.body); // Debug output
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Email already registered');
  });

  it('should login and return a JWT token', async () => {
    // Register user first
    const registerRes = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Register response:', registerRes.body); // Debug output
    expect(registerRes.statusCode).toBe(201);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    console.log('Login response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should not login with incorrect credentials', async () => {
    // Register user first
    const registerRes = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Register response:', registerRes.body); // Debug output
    expect(registerRes.statusCode).toBe(201);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'wrongpassword' });
    console.log('Login with wrong password response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should get user profile with valid token', async () => {
    // Register and login first
    const registerRes = await request(app)
      .post('/auth/register')
      .send(testUser);
    console.log('Register response:', registerRes.body); // Debug output
    expect(registerRes.statusCode).toBe(201);

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
  });

  it('should not get profile without token', async () => {
    const res = await request(app).get('/profile');
    console.log('No token profile response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No token provided');
  });

  it('should validate required fields during registration', async () => {
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