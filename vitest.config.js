import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit tests stay off the WASM path: the worker's Zig imports are mocked, and the Zig code
// has its own tests (`npm run test:zig`). The real round trip is covered by Playwright.
// Stands in for Zigar: a .zig import loads as an empty module, which each test replaces
// with vi.mock. Keeps `vitest` from compiling Zig.
const zigStub = {
  name: "zig-stub",
  enforce: "pre",
  load: (id) => (id.endsWith(".zig") ? "export {};" : null),
};

export default defineConfig({
  plugins: [zigStub, react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    include: ["src/**/*.test.{js,jsx}"],
    // Never reach Mapbox from unit tests (jsdom has no WebGL), whatever a local .env holds.
    env: { VITE_MAPBOX_KEY: "" },
    // As Terminus's: the page code, less tests, styles and entry points.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx}"],
      exclude: [
        "src/**/*.test.{js,jsx}",
        "src/**/*.style.{js,jsx}",
        "src/**/*.fixture.js",
        "src/main.jsx",
        "src/sw.js",
      ],
      // Terminus's thresholds.
      thresholds: {
        lines: 75,
        functions: 65,
        branches: 65,
        statements: 75,
      },
    },
  },
});
