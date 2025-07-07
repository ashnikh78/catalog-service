// jest.config.js

const path = require('path');

module.exports = {
  testEnvironment: 'node',

  // Match all .test.js or .spec.js files inside tests/ or src/ directories
  testMatch: ['**/tests/**/*.(test|spec).js', '**/src/**/*.(test|spec).js'],

  // Automatically clear mocks between every test
  clearMocks: true,

  // Remove coverage-related configs
  // collectCoverage: true,
  // collectCoverageFrom: [
  //   'src/**/*.{js,ts}',
  //   '!src/**/index.js',
  //   '!**/*.test.js',
  //   '!**/*.spec.js',
  // ],
  // coverageDirectory: 'coverage',

  // Resolve modules from these directories
  moduleDirectories: ['node_modules', path.join(__dirname, 'src')],

  // Aliases for cleaner import paths (optional, only if used in code)
  moduleNameMapper: {
    '^@controllers(.*)$': '<rootDir>/src/controllers$1',
    '^@models(.*)$': '<rootDir>/src/models$1',
    '^@services(.*)$': '<rootDir>/src/services$1',
    '^@utils(.*)$': '<rootDir>/src/utils$1',
  },

  // Optional setup file after env is set up (only if `jest.setup.js` exists)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Babel transformer (if using ES Modules or JSX)
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },

  // Verbose output for better test feedback
  verbose: true,
};
