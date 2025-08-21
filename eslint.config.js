const js = require("@eslint/js");

module.exports = [
  {
    ...js.configs.recommended,
    files: ["nuki/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      // Add or override rules as needed
    },
  },
];
