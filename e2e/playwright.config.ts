import { defineConfig } from '@playwright/test'

// The tests talk to an app that is already running (docker compose up). They do not start it themselves.
// E2E_BASE_URL: where the frontend is. The Docker setup serves it on port 3000, the Vite dev server on 5173.
export default defineConfig({
  testDir: './tests',
  // The journey test is one user doing many things in order, and all tests share one backend and one demo
  // account, so the files run one after another
  workers: 1,
  fullyParallel: false,
  // A real AI model can take minutes for one answer
  timeout: 300_000,
  expect: { timeout: 15_000 },
  // On CI a failed file is tried once more: the 3D and animation checks depend on timing
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The full Chromium (not the stripped "headless shell"), with software WebGL switched on, so the 3D scenes
    // also run on machines without a graphics card, such as the CI runner
    channel: 'chromium',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
})
