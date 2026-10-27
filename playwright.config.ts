import { defineConfig, devices } from '@playwright/test';

// En local, un Chromium déjà installé peut servir (CHROMIUM_PATH=/usr/bin/brave) ;
// en intégration continue, Playwright utilise son propre Chromium.
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    locale: 'fr-FR',
    screenshot: 'only-on-failure',
    // A fake camera (moving test pattern) for the body photos taken in the app.
    permissions: ['camera'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
      ...(executablePath ? { executablePath } : {}),
    },
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
