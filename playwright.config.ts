import 'dotenv/config';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    baseURL: process.env.APP_URL || 'http://127.0.0.1:3000',
    headless: true,
    actionTimeout: 15000,
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev',
    url: `${process.env.APP_URL || 'http://127.0.0.1:3000'}/login`,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
