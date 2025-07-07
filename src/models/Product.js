// Product, Category, ProductVariant, ProductImage Sequelize models and associations
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../config/database');

// Category Model
class Category extends Model {}
Category.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [2, 100] } },
  slug: { type: DataTypes.STRING, unique: true, allowNull: false },
  parentId: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
  description: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'Category', tableName: 'categories' });

// Product Model
class Product extends Model {}
Product.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [2, 255] } },
  slug: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: DataTypes.TEXT,
  shortDescription: DataTypes.STRING(500),
  categoryId: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
  basePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
  isCustomizable: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  weight: DataTypes.DECIMAL(5, 2),
  dimensions: DataTypes.JSON,
  tags: DataTypes.JSON,
  metadata: DataTypes.JSON
}, { sequelize, modelName: 'Product', tableName: 'products' });

// Product Variant Model
class ProductVariant extends Model {}
ProductVariant.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
  sku: { type: DataTypes.STRING, unique: true, allowNull: false },
  name: DataTypes.STRING,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  costPrice: DataTypes.DECIMAL(10, 2),
  inventoryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  attributes: DataTypes.JSON,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { sequelize, modelName: 'ProductVariant', tableName: 'product_variants' });

// Product Images Model
class ProductImage extends Model {}
ProductImage.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productId: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
  imageUrl: { type: DataTypes.STRING, allowNull: false },
  altText: DataTypes.STRING,
  isPrimary: { type: DataTypes.BOOLEAN, defaultValue: false },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { sequelize, modelName: 'ProductImage', tableName: 'product_images' });

// Associations
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });
Product.hasMany(ProductVariant, { foreignKey: 'productId' });
Product.hasMany(ProductImage, { foreignKey: 'productId' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

module.exports = { Product, Category, ProductVariant, ProductImage, sequelize };
