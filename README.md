# waymark

Edit a race director's GPX in the browser. Open the file, click the route to drop pins (they
snap to the track), or add them at a distance in km. Drag a pin along the route to move it.
Name each one, give it a type (Start, Time barrier, Life base, Arrival), a cutoff time and a
stop duration, and export an extended GPX in the format Terminus and
[Regimen](https://github.com/totorototo/regimen) read.

- Reading, snapping, planning and writing are all done by [gpxz](https://github.com/totorototo/gpxz),
  compiled to WASM with Zigar and run in a web worker.
- The file stays in your browser: nothing is uploaded (the CSP lets the page reach Mapbox only).
- The export keeps the director's file byte for byte, and replaces its waypoints only.
- Cutoffs are entered on the race's clock (the time zone, above the pins) and saved as UTC.
- The map opens flat, with a 3D button for the terrain; km labels and chevrons mark the
  distance and the way the race runs. Fullscreen keeps the pins beside the map.
- A pin's row shows what goes in the file: its number, name, type and km, and the cutoff.
  Its issues (no cutoff, a cutoff before the previous one) show on the row.
- The plan panel opens on one line, the estimated finish and the tightest margin (or the
  cutoffs missed) for a runner's pace. Two folds under it: Checkpoints (arrival, cutoff and
  spare at departure, a missed cutoff marked) and Sections (distance, D+, the time allowed
  and the slowest pace that makes it).
- On a phone the map sits in the page's flow: a swipe scrolls the page, two fingers move the
  map. Fullscreen splits the screen, the map above and the pins below.
- Installable as a PWA. A new build doesn't take over on its own (the pins live only in
  memory): the masthead offers it once nothing is unsaved. Mapbox tiles aren't cached.
- Colours come from the Trail Suite tokens
  ([`@totorototo/trail-tokens`](https://github.com/totorototo/trail-tokens)) shared with
  Terminus and Retrace; the map uses the suite's fixed map inks in both themes.
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

Netlify, from `main` (`.github/workflows/deploy.yml`). Secrets: `VITE_MAPBOX_KEY` (restrict
it to the site's URL in Mapbox: it ships in the bundle), `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.

## License

MIT, see `LICENSE`.
