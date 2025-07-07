module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.integration.test.js'],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coveragePathIgnorePatterns: [
    '/tests/',
    '/node_modules/'
  ]
};