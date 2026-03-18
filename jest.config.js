module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  workerIdleMemoryLimit: '512MB',
  maxWorkers: 2,
};
