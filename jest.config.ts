export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { useESM: true },
    ],
  },
  moduleNameMapper: {
    "^(..\/.*)\\.js$": "$1",
  },
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/prisma-mock.ts"],
};
