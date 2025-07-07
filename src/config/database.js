const { Sequelize } = require('sequelize');

let sequelize;
if (process.env.NODE_ENV === 'test') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  });
  // Synchronize database for tests
  sequelize
    .sync({ force: true })
    .then(() => console.log('Test database initialized'))
    .catch(err => console.error('Test database initialization failed:', err.message));
} else {
  const DB_DIALECT = process.env.DB_DIALECT || 'mysql';
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.DB_PORT || 3306;
  const DB_NAME = process.env.DB_NAME || 'printvista';
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASS = process.env.DB_PASS || '';
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  });
  // Synchronize database for non-test environments
  sequelize
    .sync({ alter: true })
    .then(() => console.log('Database initialized'))
    .catch(err => console.error('Database initialization failed:', err.message));
}

module.exports = sequelize;