import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintPluginImport from "eslint-plugin-import";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script", // Changed from "module" to "script" since your file isn't a module
      globals: {
        ...globals.browser,
        Logger: "writable", // Added Logger as writable since it's defined in your code
        Fuse: "readonly",
        // Papa: "readonly", // Added Papa for CSV parsing
        TDV: "readonly", // Added TDV for tour functionality
        searchContainer: "readonly",
        _isMobileView: "readonly",
        getSchemaVersion: "readonly",
        highlightMatches: "readonly",
        prepareFuse: "readonly",
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
    },
    extends: [js.configs.recommended, prettier],
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-empty": "warn",
      "no-dupe-class-members": "error",
      "no-case-declarations": "error",
      "no-redeclare": "error", // This will catch your duplicate _triggerElement
      "prettier/prettier": "error",
      // Disable import rules since this isn't a module
      "import/no-default-export": "off",
      "import/no-named-as-default": "off",
      "import/named": "off",
      "import/namespace": "off",
      "import/default": "off",
      "import/export": "off",
      "import/first": "off",
      "import/exports-last": "off",
      "import/no-duplicates": "off",
      "import/no-mutable-exports": "off",
      "import/no-unresolved": "off",
    },
  },
]);
