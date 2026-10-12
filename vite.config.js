import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// One config for the page and the worker. The WASM module is only imported by the worker,
// so only the worker bundle embeds it.
//
// ignoreBuildFile: zig/build.zig is the native test build; Zigar uses its own build.zig and
// picks up the dependencies from zig/build.zig.zon + zig/build.extra.zig.
const zigarOptions = {
  optimize: "ReleaseSmall",
  embedWASM: true,
  topLevelAwait: false,
  ignoreBuildFile: true,
};

export default defineConfig({
  plugins: [
    react(),
    zigar(zigarOptions),
    // Retrace's setup, but a new build waits for the person (registerType "prompt"): a reload
    // would drop the pins, which live only in memory until exported. See sw.js and main.jsx.
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      injectRegister: false,
      injectManifest: {
        // The worker chunk embeds the WASM module.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Waymark: checkpoints and cutoffs for a race GPX",
        short_name: "Waymark",
        description: "Pin checkpoints on a race route, set their cutoffs, export an extended GPX.",
        theme_color: "#3A3335",
        background_color: "#3A3335",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["sports", "utilities"],
        lang: "en",
        icons: [
          { src: "logo192.png", type: "image/png", sizes: "192x192", purpose: "any maskable" },
          { src: "logo512.png", type: "image/png", sizes: "512x512", purpose: "any maskable" },
        ],
      },
    }),
  ],
  worker: {
    format: "es",
    plugins: () => [zigar(zigarOptions)],
  },
  ssr: { noExternal: ["zigar-runtime"] },
  optimizeDeps: { exclude: ["zigar-runtime"] },
});
