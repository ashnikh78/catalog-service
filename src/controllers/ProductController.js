// src/controllers/ProductController.js
const { Product, Category, ProductVariant, ProductImage, sequelize, Op } = require('../models'); // ✅ Assumes models/index.js exports Op

class ProductService {
  static async createProduct(productData) {
    const transaction = await sequelize.transaction();
    try {
      if (!productData.name || !productData.categoryId || !productData.basePrice) {
        throw new Error('Name, category, and base price are required');
      }

      const slug = this.generateSlug(productData.name);

      const product = await Product.create({ ...productData, slug }, { transaction });

      if (Array.isArray(productData.variants)) {
        for (const variantData of productData.variants) {
          if (!variantData.name || !variantData.price) {
            throw new Error('Each variant must have a name and price');
          }
          await ProductVariant.create({
            ...variantData,
            productId: product.id,
            sku: variantData.sku || this.generateSKU(product.id),
          }, { transaction });
        }
      }

      if (Array.isArray(productData.images)) {
        for (const imageData of productData.images) {
          if (!imageData.imageUrl) {
            throw new Error('Each image must have a valid imageUrl');
          }
          await ProductImage.create({ ...imageData, productId: product.id }, { transaction });
        }
      }

      await transaction.commit();
      return await this.getProductById(product.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async getProductById(id) {
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'] },
        { model: ProductVariant, where: { isActive: true }, required: false },
        { model: ProductImage, order: [['sortOrder', 'ASC']] }
      ]
    });

    if (!product) throw new Error('Product not found');
    return product;
  }

  static async getProducts(filters = {}, pagination = {}) {
    const {
      categoryId, search, priceRange,
      isCustomizable, tags, sortBy = 'createdAt', sortOrder = 'DESC',
    } = filters;

    const { page = 1, limit = 20 } = pagination;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };

    if (categoryId) whereClause.categoryId = categoryId;

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (priceRange && priceRange.min != null && priceRange.max != null) {
      whereClause.basePrice = { [Op.between]: [priceRange.min, priceRange.max] };
    }

    if (typeof isCustomizable === 'boolean') {
      whereClause.isCustomizable = isCustomizable;
    }

    if (tags && tags.length > 0) {
      whereClause.tags = { [Op.contains]: tags };
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ['id', 'name', 'slug'] },
        { model: ProductVariant, where: { isActive: true }, required: false, limit: 1 },
        { model: ProductImage, where: { isPrimary: true }, required: false },
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      distinct: true,
    });

    return {
      products: rows,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
      },
    };
  }

  static async updateProduct(id, updateData) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found');

    if (updateData.name && updateData.name !== product.name) {
      updateData.slug = this.generateSlug(updateData.name);
    }

    await product.update(updateData);
    return await this.getProductById(id);
  }

  static async deleteProduct(id) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error('Product not found');

    await product.update({ isActive: false });
    return { message: 'Product deleted successfully' };
  }

  static generateSlug(name) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!slug || slug.replace(/-/g, '').length === 0) {
      throw new Error('Invalid slug generated');
    }

    return slug;
  }

  static generateSKU(productId) {
    return `PRD-${productId}-${Date.now()}`;
  }
}

class ProductController {
  static async createProduct(req, res) {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async getProduct(req, res) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  static async getProducts(req, res) {
    try {
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

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
      };

      const result = await ProductService.getProducts(filters, pagination);
      res.json({ success: true, data: result.products, pagination: result.pagination });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateProduct(req, res) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);
      res.json({ success: true, data: product, message: 'Product updated successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  static async deleteProduct(req, res) {
    try {
      const result = await ProductService.deleteProduct(req.params.id);
      res.json({ success: true, message: result.message });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  static __getProductService() {
    return ProductService;
  }
}

module.exports = ProductController;
