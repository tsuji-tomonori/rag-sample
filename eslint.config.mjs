import path from "node:path"
import { fileURLToPath } from "node:url"
import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url))

export default tseslint.config(
  { ignores: [".workspace/**", ".venv/**", "**/node_modules/**", "**/dist/**", "**/cdk.out/**", "docs/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs", "tools/*.mjs", "infra/scripts/*.mjs"]
        },
        tsconfigRootDir
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  { files: ["**/*.{test,spec}.ts", "tools/*.mjs"], rules: { "@typescript-eslint/no-floating-promises": "off" } }
)
