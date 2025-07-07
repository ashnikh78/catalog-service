module.exports = (sequelize, DataTypes) => {
  const { Model } = require('sequelize');

  class Category extends Model {}

  Category.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true, len: [2, 100] } },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    parentId: { type: DataTypes.INTEGER, references: { model: 'categories', key: 'id' } },
    description: DataTypes.TEXT,
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
  });

  return Category;
};
