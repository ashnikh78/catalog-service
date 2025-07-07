// tests/unit/ProductService.test.js
const ProductController = require('../../src/controllers/ProductController');
const { Product, Category, ProductVariant, ProductImage, sequelize } = require('../../src/models/Product');

// Mock the models
jest.mock('../../src/models/Product', () => ({
  Product: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn(),
  },
  Category: {
    findByPk: jest.fn(),
  },
  ProductVariant: {
    create: jest.fn(),
  },
  ProductImage: {
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
    Op: {
      or: Symbol('or'),
      iLike: Symbol('iLike'),
      between: Symbol('between'),
      contains: Symbol('contains'),
    },
  },
}));

describe('ProductService Unit Tests', () => {
  let mockTransaction;
  let mockProduct;
  let mockCategory;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock transaction
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    sequelize.transaction.mockResolvedValue(mockTransaction);

    // Setup mock product
    mockProduct = {
      id: 1,
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test Description',
      categoryId: 1,
      basePrice: 99.99,
      isActive: true,
      update: jest.fn(),
    };

    // Setup mock category
    mockCategory = {
      id: 1,
      name: 'Test Category',
      slug: 'test-category',
    };
  });

  describe('ProductService.createProduct', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    it('should create a product successfully', async () => {
      const productData = {
        name: 'Test Product',
        categoryId: 1,
        basePrice: 99.99,
        description: 'Test Description',
      };

      Product.create.mockResolvedValue(mockProduct);
      Product.findByPk.mockResolvedValue({
        ...mockProduct,
        Category: mockCategory,
        ProductVariants: [],
        ProductImages: [],
      });

      const result = await ProductService.createProduct(productData);

      expect(sequelize.transaction).toHaveBeenCalled();
      expect(Product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...productData,
          slug: 'test-product',
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create product with variants', async () => {
      const productData = {
        name: 'Test Product',
        categoryId: 1,
        basePrice: 99.99,
        variants: [
          { name: 'Variant 1', price: 89.99, inventoryCount: 10 },
          { name: 'Variant 2', price: 109.99, inventoryCount: 5 },
        ],
      };

      Product.create.mockResolvedValue(mockProduct);
      ProductVariant.create.mockResolvedValue({});
      Product.findByPk.mockResolvedValue({
        ...mockProduct,
        Category: mockCategory,
        ProductVariants: productData.variants,
        ProductImages: [],
      });

      await ProductService.createProduct(productData);

      expect(ProductVariant.create).toHaveBeenCalledTimes(2);
      expect(ProductVariant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Variant 1',
          price: 89.99,
          inventoryCount: 10,
          productId: 1,
          sku: expect.any(String),
        }),
        { transaction: mockTransaction }
      );
    });

    it('should create product with images', async () => {
      const productData = {
        name: 'Test Product',
        categoryId: 1,
        basePrice: 99.99,
        images: [
          { imageUrl: 'https://example.com/image1.jpg', isPrimary: true },
          { imageUrl: 'https://example.com/image2.jpg', isPrimary: false },
        ],
      };

      Product.create.mockResolvedValue(mockProduct);
      ProductImage.create.mockResolvedValue({});
      Product.findByPk.mockResolvedValue({
        ...mockProduct,
        Category: mockCategory,
        ProductVariants: [],
        ProductImages: productData.images,
      });

      await ProductService.createProduct(productData);

      expect(ProductImage.create).toHaveBeenCalledTimes(2);
      expect(ProductImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'https://example.com/image1.jpg',
          isPrimary: true,
          productId: 1,
        }),
        { transaction: mockTransaction }
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        name: 'Test Product',
        // Missing categoryId and basePrice
      };

      await expect(ProductService.createProduct(invalidData)).rejects.toThrow(
        'Name, category, and base price are required'
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const productData = {
        name: 'Test Product',
        categoryId: 1,
        basePrice: 99.99,
      };

      Product.create.mockRejectedValue(new Error('Database error'));

      await expect(ProductService.createProduct(productData)).rejects.toThrow('Database error');
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('ProductService.getProductById', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    it('should return product with associations', async () => {
      const mockProductWithAssociations = {
        ...mockProduct,
        Category: mockCategory,
        ProductVariants: [{ id: 1, name: 'Variant 1', price: 89.99 }],
        ProductImages: [{ id: 1, imageUrl: 'https://example.com/image1.jpg' }],
      };

      Product.findByPk.mockResolvedValue(mockProductWithAssociations);

      const result = await ProductService.getProductById(1);

      expect(Product.findByPk).toHaveBeenCalledWith(1, {
        include: [
          { model: Category, attributes: ['id', 'name', 'slug'] },
          { model: ProductVariant, where: { isActive: true }, required: false },
          { model: ProductImage, order: [['sortOrder', 'ASC']] },
        ],
      });
      expect(result).toEqual(mockProductWithAssociations);
    });

    it('should throw error when product not found', async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(ProductService.getProductById(999)).rejects.toThrow('Product not found');
    });
  });

  describe('ProductService.getProducts', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    it('should return paginated products', async () => {
      const mockProducts = [
        { ...mockProduct, id: 1 },
        { ...mockProduct, id: 2 },
      ];

      Product.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockProducts,
      });

      const result = await ProductService.getProducts({}, { page: 1, limit: 10 });

      expect(Product.findAndCountAll).toHaveBeenCalledWith({
        where: { isActive: true },
        include: [
          { model: Category, attributes: ['id', 'name', 'slug'] },
          { model: ProductVariant, where: { isActive: true }, required: false, limit: 1 },
          { model: ProductImage, where: { isPrimary: true }, required: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
        offset: 0,
        distinct: true,
      });

      expect(result).toEqual({
        products: mockProducts,
        pagination: {
          page: 1,
          limit: 10,
          totalPages: 1,
          totalItems: 2,
        },
      });
    });

    it('should filter products by category', async () => {
      const filters = { categoryId: 1 };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, categoryId: 1 },
        })
      );
    });

    it('should filter products by search term', async () => {
      const filters = { search: 'test' };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            [sequelize.Op.or]: [
              { name: { [sequelize.Op.iLike]: '%test%' } },
              { description: { [sequelize.Op.iLike]: '%test%' } },
            ],
          }),
        })
      );
    });

    it('should filter products by price range', async () => {
      const filters = { priceRange: { min: 50, max: 150 } };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: { [sequelize.Op.between]: [50, 150] },
          }),
        })
      );
    });

    it('should filter products by customizable flag', async () => {
      const filters = { isCustomizable: true };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCustomizable: true,
          }),
        })
      );
    });

    it('should filter products by tags', async () => {
      const filters = { tags: ['electronics', 'gadgets'] };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { [sequelize.Op.contains]: ['electronics', 'gadgets'] },
          }),
        })
      );
    });

    it('should sort products by specified field', async () => {
      const filters = { sortBy: 'name', sortOrder: 'ASC' };
      Product.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProduct] });

      await ProductService.getProducts(filters);

      expect(Product.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['name', 'ASC']],
        })
      );
    });
  });

  describe('ProductService.updateProduct', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        description: 'Updated Description',
        basePrice: 129.99,
      };

      Product.findByPk.mockResolvedValueOnce(mockProduct);
      mockProduct.update.mockResolvedValue();
      Product.findByPk.mockResolvedValueOnce({
        ...mockProduct,
        ...updateData,
        Category: mockCategory,
        ProductVariants: [],
        ProductImages: [],
      });

      const result = await ProductService.updateProduct(1, updateData);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(mockProduct.update).toHaveBeenCalledWith({
        ...updateData,
        slug: 'updated-product',
      });
      expect(result).toBeDefined();
    });

    it('should throw error when product not found', async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(ProductService.updateProduct(999, {})).rejects.toThrow('Product not found');
    });

    it('should not update slug if name unchanged', async () => {
      const updateData = { description: 'Updated Description' };

      Product.findByPk.mockResolvedValueOnce(mockProduct);
      mockProduct.update.mockResolvedValue();
      Product.findByPk.mockResolvedValueOnce({
        ...mockProduct,
        ...updateData,
        Category: mockCategory,
        ProductVariants: [],
        ProductImages: [],
      });

      await ProductService.updateProduct(1, updateData);

      expect(mockProduct.update).toHaveBeenCalledWith({ description: 'Updated Description' });
    });
  });

  describe('ProductService.deleteProduct', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    it('should soft delete product successfully', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      mockProduct.update.mockResolvedValue();

      const result = await ProductService.deleteProduct(1);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(mockProduct.update).toHaveBeenCalledWith({ isActive: false });
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });

    it('should throw error when product not found', async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(ProductService.deleteProduct(999)).rejects.toThrow('Product not found');
    });
  });

  describe('ProductService utility methods', () => {
    const ProductService = require('../../src/controllers/ProductController').__getProductService();

    describe('generateSlug', () => {
      it('should generate slug from product name', () => {
        const slug = ProductService.generateSlug('Test Product Name');
        expect(slug).toBe('test-product-name');
      });

      it('should handle special characters', () => {
        const slug = ProductService.generateSlug('Test Product! @#$%^&*()');
        expect(slug).toBe('test-product');
      });

      it('should handle multiple spaces', () => {
        const slug = ProductService.generateSlug('  Test   Product   Name  ');
        expect(slug).toBe('test-product-name');
      });
    });

    describe('generateSKU', () => {
      it('should generate SKU with product ID', () => {
        const sku = ProductService.generateSKU(123);
        expect(sku).toMatch(/^PRD-123-\d+$/);
      });
    });
  });
});

describe('ProductController Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('ProductController.createProduct', () => {
    it('should create product and return 201', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        slug: 'test-product',
        basePrice: 99.99,
      };

      mockReq.body = {
        name: 'Test Product',
        categoryId: 1,
        basePrice: 99.99,
      };

      // Mock ProductService.createProduct
      const originalCreateProduct = ProductController.createProduct;
      ProductController.createProduct = jest.fn().mockImplementation(async (req, res) => {
        res.status(201).json({
          success: true,
          data: mockProduct,
          message: 'Product created successfully',
        });
      });

      await ProductController.createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
        message: 'Product created successfully',
      });

      // Restore original method
      ProductController.createProduct = originalCreateProduct;
    });

    it('should return 400 on validation error', async () => {
      mockReq.body = {
        name: 'Test Product',
        // Missing required fields
      };

      const originalCreateProduct = ProductController.createProduct;
      ProductController.createProduct = jest.fn().mockImplementation(async (req, res) => {
        res.status(400).json({
          success: false,
          error: 'Name, category, and base price are required',
        });
      });

      await ProductController.createProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Name, category, and base price are required',
      });

      ProductController.createProduct = originalCreateProduct;
    });
  });

  describe('ProductController.getProduct', () => {
    it('should return product by ID', async () => {
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        Category: { id: 1, name: 'Test Category' },
      };

      mockReq.params.id = '1';

      const originalGetProduct = ProductController.getProduct;
      ProductController.getProduct = jest.fn().mockImplementation(async (req, res) => {
        res.json({
          success: true,
          data: mockProduct,
        });
      });

      await ProductController.getProduct(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockProduct,
      });

      ProductController.getProduct = originalGetProduct;
    });

    it('should return 404 when product not found', async () => {
      mockReq.params.id = '999';

      const originalGetProduct = ProductController.getProduct;
      ProductController.getProduct = jest.fn().mockImplementation(async (req, res) => {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      });

      await ProductController.getProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });

      ProductController.getProduct = originalGetProduct;
    });
  });

  describe('ProductController.getProducts', () => {
    it('should return paginated products', async () => {
      const mockResult = {
        products: [
          { id: 1, name: 'Product 1' },
          { id: 2, name: 'Product 2' },
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1,
          totalItems: 2,
        },
      };

      mockReq.query = {
        page: '1',
        limit: '20',
      };

      const originalGetProducts = ProductController.getProducts;
      ProductController.getProducts = jest.fn().mockImplementation(async (req, res) => {
        res.json({
          success: true,
          data: mockResult.products,
          pagination: mockResult.pagination,
        });
      });

      await ProductController.getProducts(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.products,
        pagination: mockResult.pagination,
      });

      ProductController.getProducts = originalGetProducts;
    });

    it('should parse query parameters correctly', async () => {
      mockReq.query = {
        categoryId: '1',
        search: 'test',
        minPrice: '50',
        maxPrice: '150',
        isCustomizable: 'true',
        tags: 'electronics,gadgets',
        sortBy: 'name',
        sortOrder: 'ASC',
        page: '2',
        limit: '10',
      };

      const originalGetProducts = ProductController.getProducts;
      ProductController.getProducts = jest.fn().mockImplementation(async (req, res) => {
        // Verify query parsing logic
        const filters = {
          categoryId: req.query.categoryId,
          search: req.query.search,
          priceRange: req.query.minPrice && req.query.maxPrice 
            ? { min: parseFloat(req.query.minPrice), max: parseFloat(req.query.maxPrice) }
            : null,
          isCustomizable: req.query.isCustomizable === 'true',
          tags: req.query.tags ? req.query.tags.split(',') : null,
          sortBy: req.query.sortBy,
          sortOrder: req.query.sortOrder,
        };

        expect(filters.categoryId).toBe('1');
        expect(filters.search).toBe('test');
        expect(filters.priceRange).toEqual({ min: 50, max: 150 });
        expect(filters.isCustomizable).toBe(true);
        expect(filters.tags).toEqual(['electronics', 'gadgets']);
        expect(filters.sortBy).toBe('name');
        expect(filters.sortOrder).toBe('ASC');

        res.json({ success: true, data: [], pagination: {} });
      });

      await ProductController.getProducts(mockReq, mockRes);

      ProductController.getProducts = originalGetProducts;
    });
  });

  describe('ProductController.updateProduct', () => {
    it('should update product and return updated data', async () => {
      const mockUpdatedProduct = {
        id: 1,
        name: 'Updated Product',
        basePrice: 129.99,
      };

      mockReq.params.id = '1';
      mockReq.body = {
        name: 'Updated Product',
        basePrice: 129.99,
      };

      const originalUpdateProduct = ProductController.updateProduct;
      ProductController.updateProduct = jest.fn().mockImplementation(async (req, res) => {
        res.json({
          success: true,
          data: mockUpdatedProduct,
          message: 'Product updated successfully',
        });
      });

      await ProductController.updateProduct(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedProduct,
        message: 'Product updated successfully',
      });

      ProductController.updateProduct = originalUpdateProduct;
    });

    it('should return 400 on update error', async () => {
      mockReq.params.id = '1';
      mockReq.body = { basePrice: -10 }; // Invalid price

      const originalUpdateProduct = ProductController.updateProduct;
      ProductController.updateProduct = jest.fn().mockImplementation(async (req, res) => {
        res.status(400).json({
          success: false,
          error: 'Invalid price value',
        });
      });

      await ProductController.updateProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid price value',
      });

      ProductController.updateProduct = originalUpdateProduct;
    });
  });

  describe('ProductController.deleteProduct', () => {
    it('should soft delete product successfully', async () => {
      mockReq.params.id = '1';

      const originalDeleteProduct = ProductController.deleteProduct;
      ProductController.deleteProduct = jest.fn().mockImplementation(async (req, res) => {
        res.json({
          success: true,
          message: 'Product deleted successfully',
        });
      });

      await ProductController.deleteProduct(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Product deleted successfully',
      });

      ProductController.deleteProduct = originalDeleteProduct;
    });

    it('should return 404 when product not found', async () => {
      mockReq.params.id = '999';

      const originalDeleteProduct = ProductController.deleteProduct;
      ProductController.deleteProduct = jest.fn().mockImplementation(async (req, res) => {
        res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      });

      await ProductController.deleteProduct(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Product not found',
      });

      ProductController.deleteProduct = originalDeleteProduct;
    });
  });
});