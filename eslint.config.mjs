import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint rules youild lik eto ignore
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-css-tags": "off",

      // 🔕 disable setState-in-effect warning
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Node scripts written as CommonJS (.cjs, run with `node`, e.g. scripts/find-load-time-dates.cjs): require() is how
  // they import, so the TypeScript rule against it does not apply to them.
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
