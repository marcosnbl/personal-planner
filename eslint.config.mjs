import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".features-gen/**",
      "playwright-report/**",
      "test-results/**",
      "_bmad/**",
      "_bmad-output/**",
      ".agents/**",
    ],
  },
];

export default config;
