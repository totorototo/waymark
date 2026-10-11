# waymark: project rules

Web app that edits a race director's GPX: pin checkpoints on a Mapbox map (snapped to the
track), set each one's name, type and cutoff, and export an extended GPX. Third app after
Terminus and Retrace. React 19 + styled-components + zustand, Vite 8, Vitest, Zig 0.17 via
Zigar, react-map-gl/Mapbox.

## All GPX reading and writing is gpxz

- No JavaScript reads or writes GPX. The page hands the file's bytes to the worker; gpxz
  parses it, matches waypoints to the track, plans, and writes the export. Need a new GPX
  capability? Add it to gpxz (`gpx_write.zig`, `xml_text.zig`), then bump the pin.
- Export keeps the file as it was and replaces its `<wpt>` elements only
  (`gpxz.waypoints_replace`). The waypoints must be in route order: gpxz matches them to the
  track in file order. The store keeps pins sorted by distance along the route.
- Cutoffs are typed on the race's clock (an IANA zone) and stored as UTC epoch seconds.

## Zig side (`zig/`)

- Don't vendor library code. gpxz is a dependency pinned in `build.zig.zon`.
- `waymark.zig` is a thin boundary: bytes/JSON in, JSON (or the exported file's bytes) out.
  Exports are camelCase (`routeGeometry`, `snapCandidates`, `summarizeEdit`, `exportGpx`);
  internal functions are snake_case. TIGER_STYLE as in gpxz: assertions, functions of at most
  70 lines, 100 columns, tests for everything, `zig fmt`.
- Zigar builds the WASM module with its own build.zig, using `build.extra.zig` for imports
  (`ignoreBuildFile: true`). `zig/build.zig` is only for `zig build test`.
- Field names are gpxz's, and are the JSON keys the UI reads.
- Zig is not on every PATH: Zigar needs `zig` to run `vite build`.

## JS side

- Only the worker imports `.zig` files. Unit tests mock them; vitest.config.js stubs `.zig`
  loads so Vitest never compiles Zig. The real boundary is `scripts/check-wasm.mjs`: it runs
  the built worker in Node (`npm run build` first). `e2e/` (Playwright, `npm run e2e`) runs
  the built app in Chromium, Mapbox blocked; agent tools through a stand-in
  `document.modelContext`.
- The map is Mapbox only (`VITE_MAPBOX_KEY`, see `.env.example`); there is no fallback map.
- Agent tools (WebMCP, `src/agent/webmcp.js`) are `load_gpx`, `review_plan`, `download_gpx`
  and the store's checkpoints-by-value actions (`src/gpx/checkpoints.js`), nothing more. A
  file may come in as its text only (the CSP keeps the page from fetching links), handed to
  gpxz like an opened one; unsaved edits are kept unless the agent says the person agreed.
  A file goes out only as `download_gpx`: the browser's
  download to the person's disk (`src/utils/download.js`, as the Export button), never the
  bytes back to the agent. It is `consequentialHint`, and refuses a plan `review_plan` does
  not call ready unless `force: true`. No tool returns the file's text.
- Design system: `src/theme/Theme.js` (from Terminus). Use the CSS custom properties.
  Component styles go in `*.style.js` next to the component.

## Data

- Never commit a director's file. `.gitignore` blocks `*.gpx` except the synthetic
  fixture in `zig/testdata/`.
