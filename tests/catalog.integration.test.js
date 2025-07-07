const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const productRoutes = require('../src/routes/productRoutes');
const { sequelize, Product, Category, ProductVariant, ProductImage } = require('../src/models/Product');
require('dotenv').config({ path: '.env.test' });

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

describe('Catalog Service Integration Tests', () => {
  let testCategory;
  let testProduct;

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
    await ProductImage.destroy({ where: {}, truncate: true, force: true });
    await ProductVariant.destroy({ where: {}, truncate: true, force: true });
    await Product.destroy({ where: {}, truncate: true, force: true });
    await Category.destroy({ where: {}, truncate: true, force: true });

    // Create test category
    testCategory = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      description: 'Test category description',
      isActive: true,
    });

    console.log('Database cleared and test category created');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('Database connection closed');
  });

  describe('Product CRUD Operations', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      console.log('Health check response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should create a new product', async () => {
      const productData = {
        name: 'Test Product',
        description: 'Test product description',
        shortDescription: 'Short description',
        categoryId: testCategory.id,
        basePrice: 99.99,
        isCustomizable: true,
        weight: 1.5,
        dimensions: { length: 10, width: 8, height: 6 },
        tags: ['electronics', 'gadgets'],
        metadata: { color: 'black', material: 'plastic' },
      };

      const res = await request(app)
        .post('/api/products')
        .send(productData);

      console.log('Create product response:', res.body);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('test-product');
      expect(res.body.data.basePrice).toBe('99.99');
      expect(res.body.data.Category.name).toBe('Test Category');
      expect(res.body.message).toBe('Product created successfully');

      testProduct = res.body.data;
    });

    it('should create product with variants', async () => {
      const productData = {
        name: 'Product with Variants',
        categoryId: testCategory.id,
        basePrice: 129.99,
        variants: [
          {
            name: 'Small',
            price: 119.99,
            costPrice: 80.00,
            inventoryCount: 10,
            attributes: { size: 'S', color: 'red' },
          },
          {
            name: 'Large',
            price: 149.99,
            costPrice: 100.00,
            inventoryCount: 5,
            attributes: { size: 'L', color: 'blue' },
          },
        ],
      };

      const res = await request(app)
        .post('/api/products')
        .send(productData);

      console.log('Create product with variants response:', res.body);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('product-with-variants');
      expect(res.body.data.basePrice).toBe('129.99');
      expect(res.body.data.ProductVariants).toHaveLength(2);
      expect(res.body.data.ProductVariants[0].name).toBe('Small');
      expect(res.body.data.ProductVariants[0].price).toBe('119.99');
      expect(res.body.data.ProductVariants[0].inventoryCount).toBe(10);
      expect(res.body.data.ProductVariants[1].name).toBe('Large');
      expect(res.body.data.ProductVariants[1].price).toBe('149.99');
      expect(res.body.data.ProductVariants[1].inventoryCount).toBe(5);
      expect(res.body.message).toBe('Product created successfully');

      testProduct = res.body.data;
    });

    it('should create product with images', async () => {
      const productData = {
        name: 'Product with Images',
        categoryId: testCategory.id,
        basePrice: 149.99,
        images: [
          { imageUrl: 'https://example.com/image1.jpg', isPrimary: true },
          { imageUrl: 'https://example.com/image2.jpg', isPrimary: false },
        ],
      };

      const res = await request(app)
        .post('/api/products')
        .send(productData);

      console.log('Create product with images response:', res.body);
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('product-with-images');
      expect(res.body.data.basePrice).toBe('149.99');
      expect(res.body.data.ProductImages).toHaveLength(2);
      expect(res.body.data.ProductImages[0].imageUrl).toBe('https://example.com/image1.jpg');
      expect(res.body.data.ProductImages[0].isPrimary).toBe(true);
      expect(res.body.data.ProductImages[1].imageUrl).toBe('https://example.com/image2.jpg');
      expect(res.body.data.ProductImages[1].isPrimary).toBe(false);
      expect(res.body.message).toBe('Product created successfully');

      testProduct = res.body.data;
    });

    it('should fail to create product with missing required fields', async () => {
      const invalidProductData = {
        description: 'Missing required fields',
      };

      const res = await request(app)
        .post('/api/products')
        .send(invalidProductData);

      console.log('Create product with missing fields response:', res.body);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Name, category, and base price are required');
    });

    it('should retrieve a product by ID', async () => {
      // First create a product
      const productData = {
        name: 'Test Product',
        categoryId: testCategory.id,
        basePrice: 99.99,
      };

      const createRes = await request(app)
        .post('/api/products')
        .send(productData);

      const productId = createRes.body.data.id;

      const res = await request(app).get(`/api/products/${productId}`);

      console.log('Get product by ID response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(productId);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.basePrice).toBe('99.99');
      expect(res.body.data.Category.name).toBe(testCategory.name);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/999');

      console.log('Get non-existent product response:', res.body);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Product not found');
    });

    it('should retrieve paginated products', async () => {
      // Create multiple products
      await Promise.all([
        Product.create({
          name: 'Product 1',
          slug: 'product-1',
          categoryId: testCategory.id,
          basePrice: 99.99,
          isActive: true,
        }),
        Product.create({
          name: 'Product 2',
          slug: 'product-2',
          categoryId: testCategory.id,
          basePrice: 149.99,
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      console.log('Get paginated products response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalItems: 2,
      });
      expect(res.body.data[0].name).toMatch(/Product [1-2]/);
      expect(res.body.data[1].name).toMatch(/Product [1-2]/);
    });

    it('should filter products by category', async () => {
      // Create another category
      const otherCategory = await Category.create({
        name: 'Other Category',
        slug: 'other-category',
        description: 'Other category description',
        isActive: true,
      });

      await Promise.all([
        Product.create({
          name: 'Product 1',
          slug: 'product-1',
          categoryId: testCategory.id,
          basePrice: 99.99,
          isActive: true,
        }),
        Product.create({
          name: 'Product 2',
          slug: 'product-2',
          categoryId: otherCategory.id,
          basePrice: 149.99,
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ categoryId: testCategory.id });

      console.log('Filter products by category response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].Category.id).toBe(testCategory.id);
      expect(res.body.data[0].name).toBe('Product 1');
    });

    it('should filter products by search term', async () => {
      await Promise.all([
        Product.create({
          name: 'Test Product',
          slug: 'test-product',
          description: 'This is a test product',
          categoryId: testCategory.id,
          basePrice: 99.99,
          isActive: true,
        }),
        Product.create({
          name: 'Other Product',
          slug: 'other-product',
          description: 'This is another product',
          categoryId: testCategory.id,
          basePrice: 149.99,
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ search: 'test' });

      console.log('Filter products by search term response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Product');
    });

    it('should filter products by price range', async () => {
      await Promise.all([
        Product.create({
          name: 'Product 1',
          slug: 'product-1',
          categoryId: testCategory.id,
          basePrice: 50.00,
          isActive: true,
        }),
        Product.create({
          name: 'Product 2',
          slug: 'product-2',
          categoryId: testCategory.id,
          basePrice: 150.00,
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ minPrice: 100, maxPrice: 200 });

      console.log('Filter products by price range response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Product 2');
    });

    it('should filter products by tags', async () => {
      await Promise.all([
        Product.create({
          name: 'Product 1',
          slug: 'product-1',
          categoryId: testCategory.id,
          basePrice: 99.99,
          tags: ['electronics', 'gadgets'],
          isActive: true,
        }),
        Product.create({
          name: 'Product 2',
          slug: 'product-2',
          categoryId: testCategory.id,
          basePrice: 149.99,
          tags: ['clothing'],
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ tags: 'electronics,gadgets' });

      console.log('Filter products by tags response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Product 1');
    });

    it('should sort products by name', async () => {
      await Promise.all([
        Product.create({
          name: 'Zebra Product',
          slug: 'zebra-product',
          categoryId: testCategory.id,
          basePrice: 99.99,
          isActive: true,
        }),
        Product.create({
          name: 'Apple Product',
          slug: 'apple-product',
          categoryId: testCategory.id,
          basePrice: 149.99,
          isActive: true,
        }),
      ]);

      const res = await request(app)
        .get('/api/products')
        .query({ sortBy: 'name', sortOrder: 'ASC' });

      console.log('Sort products by name response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Apple Product');
      expect(res.body.data[1].name).toBe('Zebra Product');
    });

    it('should update a product', async () => {
      // First create a product
      const createRes = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          categoryId: testCategory.id,
          basePrice: 99.99,
        });

      const productId = createRes.body.data.id;

      const updateData = {
        name: 'Updated Product',
        basePrice: 129.99,
        description: 'Updated description',
      };

      const res = await request(app)
        .put(`/api/products/${productId}`)
        .send(updateData);

      console.log('Update product response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.slug).toBe('updated-product');
      expect(res.body.data.basePrice).toBe('129.99');
      expect(res.body.data.description).toBe(updateData.description);
      expect(res.body.message).toBe('Product updated successfully');
    });

    it('should return 404 when updating non-existent product', async () => {
      const updateData = {
        name: 'Updated Product',
        basePrice: 129.99,
      };

      const res = await request(app)
        .put('/api/products/999')
        .send(updateData);

      console.log('Update non-existent product response:', res.body);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Product not found');
    });

    it('should soft delete a product', async () => {
      // First create a product
      const createRes = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          categoryId: testCategory.id,
          basePrice: 99.99,
        });

      const productId = createRes.body.data.id;

      const res = await request(app).delete(`/api/products/${productId}`);

      console.log('Delete product response:', res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Product deleted successfully');

      // Verify product is soft deleted
      const getRes = await request(app).get(`/api/products/${productId}`);
      expect(getRes.statusCode).toBe(404);
      expect(getRes.body.success).toBe(false);
      expect(getRes.body.error).toBe('Product not found');
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app).delete('/api/products/999');

      console.log('Delete non-existent product response:', res.body);
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Product not found');
    });
  });
});