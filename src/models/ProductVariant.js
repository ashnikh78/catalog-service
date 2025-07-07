module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

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
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize,
    modelName: 'ProductVariant',
    tableName: 'product_variants',
  });

  return ProductVariant;
};
