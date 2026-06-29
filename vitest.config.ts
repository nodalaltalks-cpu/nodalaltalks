import { defineConfig } from "vitest/config";
import path from "node:path";

// The core layer is pure TypeScript with no DOM dependency, so the default
// "node" environment is correct and fast. Path aliases mirror tsconfig.json.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@infra": path.resolve(__dirname, "./src/infrastructure"),
    },
  },
});
