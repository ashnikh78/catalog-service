const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const productRoutes = require('../src/routes/productRoutes');
const path = require('path');
const { Product, Category, ProductVariant, ProductImage, sequelize } = require('../../src/models/Product');
require('dotenv').config({ path: '.env.test' }); // Load environment variables

// Setup Express app
const app = express();
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/api/products', productRoutes);

// Add health check endpoint for testing
app.get('/health', (req, res) => res.json({ status: 'ok' }));

describe('Catalog Service Integration', () => {
  const testCategory = {
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test category description',
    isActive: true,
  };

  const testProduct = {
    name: 'Test Product',
    description: 'Test product description',
    shortDescription: 'Short description',
    categoryId: null, // Will be set after category creation
    basePrice: 99.99,
    isCustomizable: true,
    weight: 1.5,
    dimensions: { length: 10, width: 8, height: 6 },
    tags: ['electronics', 'gadgets'],
    metadata: { color: 'black', material: 'plastic' },
  };

  beforeAll(async () => {
    // Ensure test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('NODE_ENV must be set to "test"');
    }

    // Setup test database
    sequelize.options.dialect = 'sqlite';
    sequelize.options.storage = ':memory:';
    sequelize.options.logging = false;
    await sequelize.sync({ force: true });
    console.log('Database initialized for testing');
  });

  beforeEach(async () => {
    // Clear all tables before each test
    for (const model of [ProductImage, ProductVariant, Product, Category]) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }

    // Create test category
    const category = await Category.create(testCategory);
    testProduct.categoryId = category.id;

    // Create test product
    const productRes = await request(app)
      .post('/api/products')
      .send(testProduct);
    console.log('Test product creation response:', productRes.body); // Debug output
    expect(productRes.statusCode).toBe(201); // Ensure product creation succeeds
    console.log('Database cleared, test category and product created for test');
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

  it('should create a new product', async () => {
    // Clear database to test fresh product creation
    for (const model of [ProductImage, ProductVariant, Product, Category]) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
    const category = await Category.create(testCategory);

    const newProduct = { ...testProduct, categoryId: category.id };
    const res = await request(app)
      .post('/api/products')
      .send(newProduct);
    console.log('Create product response:', res.body); // Debug output
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(newProduct.name);
    expect(res.body.data.slug).toBe('test-product');
    expect(res.body.data.basePrice).toBe('99.99');
    expect(res.body.data.Category.name).toBe(testCategory.name);
    expect(res.body.message).toBe('Product created successfully');
  });

  it('should not create product with missing required fields', async () => {
    const invalidProduct = {
      description: 'Missing required fields',
    };
    const res = await request(app)
      .post('/api/products')
      .send(invalidProduct);
    console.log('Invalid product creation response:', res.body); // Debug output
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Name, category, and base price are required');
  });

  it('should retrieve a product by ID', async () => {
    // Create a new product to ensure fresh data
    const category = await Category.create(testCategory);
    const productRes = await request(app)
      .post('/api/products')
      .send({ ...testProduct, categoryId: category.id });
    const productId = productRes.body.data.id;

    const res = await request(app).get(`/api/products/${productId}`);
    console.log('Get product response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(productId);
    expect(res.body.data.name).toBe(testProduct.name);
    expect(res.body.data.basePrice).toBe('99.99');
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/999');
    console.log('Non-existent product response:', res.body); // Debug output
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Product not found');
  });

  it('should retrieve paginated products', async () => {
    const res = await request(app)
      .get('/api/products')
      .query({ page: 1, limit: 10 });
    console.log('Paginated products response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1); // From beforeEach
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalPages: 1,
      totalItems: 1,
    });
    expect(res.body.data[0].name).toBe(testProduct.name);
  });

  it('should update a product', async () => {
    // Create a new product to ensure fresh data
    const category = await Category.create(testCategory);
    const productRes = await request(app)
      .post('/api/products')
      .send({ ...testProduct, categoryId: category.id });
    const productId = productRes.body.data.id;

    const updateData = {
      name: 'Updated Product',
      basePrice: 129.99,
      description: 'Updated description',
    };
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send(updateData);
    console.log('Update product response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(updateData.name);
    expect(res.body.data.slug).toBe('updated-product');
    expect(res.body.data.basePrice).toBe('129.99');
    expect(res.body.message).toBe('Product updated successfully');
  });

  it('should soft delete a product', async () => {
    // Create a new product to ensure fresh data
    const category = await Category.create(testCategory);
    const productRes = await request(app)
      .post('/api/products')
      .send({ ...testProduct, categoryId: category.id });
    const productId = productRes.body.data.id;

    const res = await request(app).delete(`/api/products/${productId}`);
    console.log('Delete product response:', res.body); // Debug output
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Product deleted successfully');

    // Verify soft delete
    const getRes = await request(app).get(`/api/products/${productId}`);
    expect(getRes.statusCode).toBe(404);
    expect(getRes.body.success).toBe(false);
    expect(getRes.body.error).toBe('Product not found');
  });
});

module.exports = app;