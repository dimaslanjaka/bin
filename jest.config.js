/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/test"],
  testMatch: ["**/__tests__/**/*.+(ts|tsx|js|mjs|cjs)", "**/*.(test|spec).+(ts|tsx|js|mjs|cjs)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx|mjs|cjs)$": "babel-jest"
  },
  collectCoverageFrom: [
    "src/**/*.{ts,js,mjs,cjs}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,js,mjs,cjs}",
    "!src/**/*.spec.{ts,js,mjs,cjs}"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "node"],
  setupFilesAfterEnv: [],
  testTimeout: 10000,
  detectOpenHandles: true
};
