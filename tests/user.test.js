const request = require('supertest');
const path = require('path');
const app = require('./setupTestApp');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') }); // Load environment variables

describe('User Service API', () => {
  let token;
  const testUser = {
    email: 'testuser@example.com',
    password: 'StrongPass123!',
    name: 'Test User',
    role: 'customer',
  };

  beforeAll(async () => {
    // Log environment variables for debugging
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'Undefined');
    // Ensure test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('NODE_ENV must be set to "test"');
    }
    // Verify JWT_SECRET
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in .env.test');
    }
    // Verify app is running
    const healthRes = await request(app).get('/health');
    if (healthRes.statusCode !== 200) {
      throw new Error('Health check failed: App is not running correctly');
    }
    console.log('Test environment initialized');
  });

  beforeEach(async () => {
    // Clear database and register user before each test
    const { sequelize } = require('../src/models/User');
    try {
      for (const model of Object.values(sequelize.models)) {
        await model.destroy({ where: {}, truncate: true, force: true });
      }
      const registerRes = await request(app).post('/auth/register').send(testUser);
      console.log('Test user registration response:', registerRes.body); // Debug output
      if (registerRes.statusCode !== 201) {
        throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
      }
      console.log('Database cleared and test user registered for test');
    } catch (error) {
      console.error('BeforeEach error:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    const { sequelize } = require('../src/models/User');
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
    const { sequelize } = require('../src/models/User');
    await Promise.all(
      Object.values(sequelize.models).map(model =>
        model.destroy({ where: {}, truncate: true, force: true })
      )
    );
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

  it('should login with correct credentials', async () => {
    // User already registered in beforeEach
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    console.log('Login response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    token = res.body.token; // Store token for subsequent tests
  });

  it('should not login with wrong password', async () => {
    // User already registered in beforeEach
    const res = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: 'WrongPass!' });
    console.log('Login with wrong password response:', res.body); // Debug output
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should get profile with valid token', async () => {
    // User already registered in beforeEach, perform login
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    console.log('Login response:', loginRes.body); // Debug output
    expect(loginRes.statusCode).toBe(200);
    token = loginRes.body.token;
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
    const { sequelize } = require('../src/models/User');
    await Promise.all(
      Object.values(sequelize.models).map(model =>
        model.destroy({ where: {}, truncate: true, force: true })
      )
    );
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