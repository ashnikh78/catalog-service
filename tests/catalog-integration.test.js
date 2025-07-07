const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const productRoutes = require('../src/routes/productRoutes');
const path = require('path');
const { Product, Category, ProductVariant, ProductImage, sequelize } = require(path.resolve(__dirname, '../src/models'));

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
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('NODE_ENV must be set to "test"');
    }

    sequelize.options.dialect = 'sqlite';
    sequelize.options.storage = ':memory:';
    sequelize.options.logging = false;
    await sequelize.sync({ force: true });
    console.log('Database initialized for testing');
  });

  beforeEach(async () => {
    await ProductImage.destroy({ where: {}, truncate: true, force: true });
    await ProductVariant.destroy({ where: {}, truncate: true, force: true });
    await Product.destroy({ where: {}, truncate: true, force: true });
    await Category.destroy({ where: {}, truncate: true, force: true });

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

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('test-product');
      expect(res.body.data.basePrice).toBe(99.99);
      expect(res.body.data.Category.name).toBe('Test Category');
      expect(res.body.message).toBe('Product created successfully');

      testProduct = res.body.data;
    });

    it('should fail to create a product with special characters only in name', async () => {
      const productData = {
        name: '!@#$%^&*',
        categoryId: testCategory.id,
        basePrice: 89.99,
      };

      const res = await request(app).post('/api/products').send(productData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid slug generated');
    });

    it('should create product with variants', async () => {
      const productData = {
        name: 'Product with Variants',
        categoryId: testCategory.id,
        basePrice: 129.99,
        variants: [
          { name: 'Small', price: 119.99, costPrice: 80.0, inventoryCount: 10, attributes: { size: 'S', color: 'red' } },
          { name: 'Large', price: 149.99, costPrice: 100.0, inventoryCount: 5, attributes: { size: 'L', color: 'blue' } },
        ],
      };

      const res = await request(app).post('/api/products').send(productData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('product-with-variants');
      expect(res.body.data.basePrice).toBe(129.99);
      expect(res.body.data.ProductVariants).toHaveLength(2);
      expect(res.body.data.ProductVariants[0].name).toBe('Small');
      expect(res.body.data.ProductVariants[0].price).toBe(119.99);
      expect(res.body.data.ProductVariants[1].name).toBe('Large');
      expect(res.body.data.ProductVariants[1].price).toBe(149.99);
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

      const res = await request(app).post('/api/products').send(productData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(productData.name);
      expect(res.body.data.slug).toBe('product-with-images');
      expect(res.body.data.basePrice).toBe(149.99);
      expect(res.body.data.ProductImages).toHaveLength(2);
      expect(res.body.data.ProductImages[0].imageUrl).toBe('https://example.com/image1.jpg');
      expect(res.body.data.ProductImages[0].isPrimary).toBe(true);
      expect(res.body.data.ProductImages[1].imageUrl).toBe('https://example.com/image2.jpg');
      expect(res.body.data.ProductImages[1].isPrimary).toBe(false);
      expect(res.body.message).toBe('Product created successfully');

      testProduct = res.body.data;
    });

    it('should fail to create product with missing required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ description: 'Missing required fields' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Name, category, and base price are required');
    });
  });
});
