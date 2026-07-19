import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Minimal Vitest config: resolve the project's `@/` import alias (mirrors
// tsconfig `paths`) and run the unit tests in a Node environment. Prisma and
// other external boundaries are mocked per-test, so no database is required.
export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
