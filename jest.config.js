const { defaults } = require("jest-config");

/** @type {import('jest').Config} */
module.exports = {
  ...defaults,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { useESM: true }],
    "^.+\\.(js|jsx|mjs)$": ["babel-jest", { configFile: "./babel.config.js" }],
    "^.+\\.cjs$": ["babel-jest", { configFile: "./babel.config.js" }]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "node"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js|jsx|mjs|cjs)", "**/*.(test|spec).+(ts|tsx|js|jsx|mjs|cjs)"],
  transformIgnorePatterns: ["/node_modules/(?!(your-esm-package)/)"],
  collectCoverageFrom: [
    "src/**/*.{ts,js,mjs,cjs}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,js,mjs,cjs}",
    "!src/**/*.spec.{ts,js,mjs,cjs}"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  detectOpenHandles: true
};
