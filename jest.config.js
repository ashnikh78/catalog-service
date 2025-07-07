const path = require('path');

module.exports = {
  // Use Node.js environment
  testEnvironment: 'node',

  // Match test files in tests/ directory (align with package.json)
  testMatch: [
    '**/tests/**/*.(test|spec).js'
  ],

  // Automatically clear mocks between every test
  clearMocks: true,

  // Coverage configuration (aligned with package.json)
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/config/*.js'
  ],
  coverageDirectory: 'coverage',

  // Resolve modules from these directories
  moduleDirectories: ['node_modules', path.join(__dirname, 'src')],

  // Aliases for cleaner import paths
  moduleNameMapper: {
    '^@controllers(.*)$': '<rootDir>/src/controllers$1',
    '^@models(.*)$': '<rootDir>/src/models$1',
    '^@services(.*)$': '<rootDir>/src/services$1',
    '^@utils(.*)$': '<rootDir>/src/utils$1'
  },

  // Setup file after env is set up (aligned with package.json)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Babel transformer for ES Modules or JSX
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },

  // Verbose output for better test feedback
  verbose: true,

  // JUnit reporter configuration for CI (aligned with jest-junit in package.json)
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        usePathForSuiteName: true
      }
    ]
  ]
};