/**
 * @type {import('jest').Config}
 * Jest configuration for browser-automation project.
 */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    // Use ts-jest for .ts files only
    "^.+\\.ts$": [
      "ts-jest",
      {
        babelConfig: {
          presets: [
            [
              "@babel/preset-env",
              {
                targets: { node: "current" }
              }
            ],
            "@babel/preset-typescript"
          ]
        },
        useESM: true
      }
    ],
    // Use babel-jest for .tsx, .jsx, .js, .mjs, .cjs files
    "^.+\\.(tsx|jsx|js|mjs|cjs)$": "babel-jest"
  },
  transformIgnorePatterns: ["/node_modules/(?!(@react|react|react-dom|react-router-dom)/)"],
  modulePathIgnorePatterns: ["<rootDir>/packages"]
};
