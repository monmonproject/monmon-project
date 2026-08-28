module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!models/**',
    '!migrations/**',
    '!seeders/**',
    '!config/**',
    '!bin/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global: { statements: 85, branches: 80, functions: 85, lines: 85 },
    './services/entitlementService.js': {
      statements: 100, branches: 100, functions: 100, lines: 100,
    },
    './middlewares/': {
      statements: 90, branches: 85, functions: 90, lines: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 15000,
  maxWorkers: 1,
};