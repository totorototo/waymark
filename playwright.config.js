import { defineConfig, devices } from "@playwright/test";

// Port 4183, not Vite's 4173: Retrace and Terminus preview there, and a local run would
// reuse their server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // In CI, annotations on the run plus an HTML report the workflow uploads.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4183",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    // In CI the build job has already built dist/ (with Zig): only serve it, as Terminus.
    command: process.env.CI
      ? "npm run preview -- --port 4183 --strictPort"
      : "npm run build && npm run preview -- --port 4183 --strictPort",
    url: "http://localhost:4183",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Lets a machine with a preinstalled Chromium skip `playwright install`.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
});
