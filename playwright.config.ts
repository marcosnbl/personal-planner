import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const baseURL = "http://127.0.0.1:3100";

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.ts",
  outputDir: ".features-gen",
});

export default defineConfig({
  testDir,
  reporter: [["list"], ["html", { open: "never" }]],
  workers: 2,
  use: {
    baseURL,
    timezoneId: "America/Argentina/Buenos_Aires",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@pwa/,
    },
    {
      name: "webkit-movil",
      use: { ...devices["iPhone 13"] },
      grepInvert: /@solo-escritorio|@pwa/,
    },
    {
      name: "chromium-pwa",
      use: { ...devices["Desktop Chrome"], serviceWorkers: "allow" },
      grep: /@pwa/,
    },
    {
      name: "webkit-pwa",
      use: { ...devices["iPhone 13"], serviceWorkers: "allow" },
      grep: /@pwa/,
    },
  ],
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
