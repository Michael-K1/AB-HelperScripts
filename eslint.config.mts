import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import sonarjs from "eslint-plugin-sonarjs";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores(["**/build/", "**/test/", "**/*.cjs"]), {
    extends: fixupConfigRules(compat.extends(
        // "plugin:sonarjs/recommended",
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    )),

    plugins: {
        "@typescript-eslint": fixupPluginRules(typescriptEslint),
        sonarjs: fixupPluginRules(sonarjs),
    },

    languageOptions: {
        parser: tsParser,
    },

    settings: {
        "import/resolver": {
            typescript: true,
            node: true,
        },
    },

    rules: {
        "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
        "import/no-deprecated": ["error"],
        "import/newline-after-import": ["error", {
            count: 1,
        }],

        "import/order": ["error", {
            groups: [
                "type",
                "builtin",
                "external",
                "internal",
                "parent",
                "sibling",
                "index",
                "object",
            ],
        }],

        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/prefer-for-of": "warn",
        "sonarjs/cognitive-complexity": "warn",
        "sonarjs/no-nested-template-literals": "off",
        "@typescript-eslint/no-explicit-any": "warn",
        "sonarjs/no-duplicate-string": "warn",
        "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
        "sonarjs/no-collapsible-if": "warn",
    },
}]);