import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./tests/setup-env.ts"],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    testTimeout: 20_000,
  },
});
