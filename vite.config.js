import react from "@vitejs/plugin-react";
import zigar from "rollup-plugin-zigar";
import { defineConfig } from "vite";

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
  plugins: [react(), zigar(zigarOptions)],
  worker: {
    format: "es",
    plugins: () => [zigar(zigarOptions)],
  },
  ssr: { noExternal: ["zigar-runtime"] },
  optimizeDeps: { exclude: ["zigar-runtime"] },
});
