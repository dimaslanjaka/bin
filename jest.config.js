/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js)", "**/*.(test|spec).+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx|mjs|cjs)$": "ts-jest"
  },
  collectCoverageFrom: ["src/**/*.{ts,js}", "!src/**/*.d.ts", "!src/**/*.test.{ts,js}", "!src/**/*.spec.{ts,js}"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "node"],
  setupFilesAfterEnv: [],
  testTimeout: 10000
};
