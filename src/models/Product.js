module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

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
    metadata: DataTypes.JSON,
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
  });

  return Product;
};
