import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1, // sequential — tests share server ports
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm --workspace=server run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 10_000,
    },
    {
      command: 'npm --workspace=client run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 10_000,
    },
  ],
});
