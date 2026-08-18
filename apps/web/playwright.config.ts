import { defineConfig, devices } from "@playwright/test";

const API_PORT = 4100;
const WEB_PORT = 5174;
const BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node ../server/dist/src/index.js",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/erp_test?schema=public",
        PORT: String(API_PORT),
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        COOKIE_SECURE: "false",
        CORS_ORIGINS: BASE_URL,
        TRUST_PROXY: "0",
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        VITE_API_TARGET: `http://localhost:${API_PORT}`,
      },
    },
  ],
});