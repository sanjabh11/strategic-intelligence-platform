import path from "path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    exclude: [
      ...configDefaults.exclude,
      ".netlify/**",
      "tests/e2e/**",
      "supabase/functions/**/tests/deno.test.ts",
      "supabase/functions/_shared/live-data-providers.test.ts",
    ],
  },
})
