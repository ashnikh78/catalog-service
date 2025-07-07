module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class ProductImage extends Model {}

  ProductImage.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, references: { model: 'products', key: 'id' } },
    imageUrl: { type: DataTypes.STRING, allowNull: false },
    altText: DataTypes.STRING,
    isPrimary: { type: DataTypes.BOOLEAN, defaultValue: false },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'ProductImage',
    tableName: 'product_images',
  });

  return ProductImage;
};
