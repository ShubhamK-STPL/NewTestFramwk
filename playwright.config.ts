import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  use: {
    headless: process.env.HEADLESS === 'true',
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
  },

  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
