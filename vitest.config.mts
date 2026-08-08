import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the `@/*` alias in tsconfig.json. Without it every component
    // import in a test fails to resolve, which looks like a broken component
    // rather than a missing test config.
    // `import.meta.dirname`, not `__dirname`: this file is ESM (.mts), where
    // the CommonJS global does not exist and Vite warns that it will stop
    // shimming it.
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // jsdom, not node: these are React components that render DOM and read
    // `document`. The node environment fails them all with `document is not
    // defined`, which says nothing about the component.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // .next holds a compiled copy of every page; without this exclusion the
    // runner collects generated duplicates of the real tests.
    exclude: ["node_modules/**", ".next/**"],
  },
});
