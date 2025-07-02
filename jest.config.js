const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    }
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/index.ts',
  ],  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    }
  },
};
