/** @type {import('@types/eslint').Linter.BaseConfig} */
module.exports = {
  root: true,
  extends: ["@remix-run/eslint-config"],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  globals: {
    // App Bridge injects a global `shopify` object in the embedded admin context
    shopify: "readonly",
  },
  overrides: [
    {
      // Vitest provides these as globals (vitest.config.js sets `globals: true`)
      files: ["tests/**/*.{js,jsx}", "**/*.{test,spec}.{js,jsx}", "vitest.config.js"],
      globals: {
        vi: "readonly",
        vitest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  ],
};
