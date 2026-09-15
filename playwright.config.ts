import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure" },
  webServer: {
    command: "node --import tsx scripts/reset-e2e.ts && npm run db:migrate && npm run db:seed:dev && npm run dev -- --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107/login",
    timeout: 120_000,
    reuseExistingServer: false,
    env: { DATABASE_URL: "file:../tmp/e2e-database.sqlite", PMB_DATA_DIR: "tmp/e2e-data", NEXT_DIST_DIR: ".next-e2e" },
  },
});
