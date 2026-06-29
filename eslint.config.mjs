import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/payment/testnet-payment-flow-v2.tsx"],
    rules: {
      // Detail loading yields before updating state; the rule follows the helper
      // call as synchronous even though its first state update is after an await.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next and keep generated outputs
  // outside the source lint boundary.
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "storybook-static/**",
    "playwright-report/**",
    "test-results/**",
    ".tmp/**",
    "tmp/**",
    ".cache/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
