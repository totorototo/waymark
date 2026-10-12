# waymark

Edit a race director's GPX in the browser. Open the file, click the route to drop pins (they
snap to the track), or add them at a distance in km. Drag a pin along the route to move it.
Name each one, give it a type (Start, Time barrier, Life base, Arrival), a cutoff time and a
stop duration, and export an extended GPX in the format Terminus reads.

- Reading, snapping, planning and writing are all done by [gpxz](https://github.com/totorototo/gpxz),
  compiled to WASM with Zigar and run in a web worker.
- The export keeps the director's file byte for byte, and replaces its waypoints only.
- Cutoffs are entered on the race's clock (choose the time zone) and saved as UTC.
- Each pin's issues (no cutoff, a cutoff before the previous one) show on its row.
- The plan panel shows the estimated arrival against each cutoff for a runner's pace, and,
  folded, per section the distance, D+, the time allowed and the slowest pace that makes it.
- A removal or a move can be undone (Undo, or Cmd/Ctrl+Z), and the page asks before unsaved
  edits are lost to a reload or another file.

## Agent tools (WebMCP)

In a browser with WebMCP (Chrome 149+), an agent in the browser can load a GPX (as text: the
page fetches no links), list, add, update and remove checkpoints, review the plan, and
download the edited file. The file goes to your downloads, never back to the agent. The
download is refused while the review reports errors, unless you ask for it anyway.

## Run

Needs Node 20+, Zig 0.17.0 on the PATH, and a Mapbox token.

```sh
cp .env.example .env   # set VITE_MAPBOX_KEY
npm ci
npm run dev
```

## Test

```sh
npm run test:zig                              # waymark.zig against the fixture
npm run test:run                              # unit tests (Zig mocked)
npm run build
node scripts/check-wasm.mjs zig/testdata/route.gpx   # the real WASM boundary
npm run e2e                                   # Playwright: builds, then the app in Chromium
```

## Deploy

Pushes to `main` run the checks and the Playwright tests, then deploy `dist/` to Netlify
(`.github/workflows/deploy.yml`); pull requests run the checks only. Repo secrets:
`VITE_MAPBOX_KEY` (restrict it to the site's URL in Mapbox), `NETLIFY_AUTH_TOKEN`,
`NETLIFY_SITE_ID`.
