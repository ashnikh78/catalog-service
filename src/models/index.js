const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = require('./Product')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const ProductVariant = require('./ProductVariant')(sequelize, DataTypes);
const ProductImage = require('./ProductImage')(sequelize, DataTypes);

// Associations
Category.hasMany(Category, { as: 'subcategories', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });
Category.hasMany(Product, { foreignKey: 'categoryId' });

Product.belongsTo(Category, { foreignKey: 'categoryId' });
Product.hasMany(ProductVariant, { foreignKey: 'productId' });
Product.hasMany(ProductImage, { foreignKey: 'productId' });

ProductVariant.belongsTo(Product, { foreignKey: 'productId' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

module.exports = {
  sequelize,
  Sequelize,
  Product,
  Category,
  ProductVariant,
  ProductImage,
  Op: Sequelize.Op, // ✅ required for Sequelize operators
};
