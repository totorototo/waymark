// End-to-end check of the real boundary: runs the BUILT worker (Zig compiled to WASM by
// Zigar) in Node with a minimal `self`, and drives the protocol the page uses:
// load → snap → pointAt → plan → export. `npm run build` first; then
//   node scripts/check-wasm.mjs path/to/race.gpx [out.gpx]
import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const [, , gpxPath, outPath] = process.argv;
assert(gpxPath, "usage: node scripts/check-wasm.mjs race.gpx [out.gpx]");

const assets = fileURLToPath(new URL("../dist/assets/", import.meta.url));
const chunk = (await readdir(assets)).find((name) => /^waymark\.worker-.*\.js$/.test(name));
assert(chunk, "no built worker: run `npm run build`");

const replies = new Map();
globalThis.self = globalThis;
globalThis.postMessage = (message) => replies.get(message.id)?.(message);
await import(assets + chunk);
assert.equal(typeof globalThis.onmessage, "function", "worker did not set onmessage");

let nextId = 0;
function call(type, payload, expectError = false) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    replies.set(id, (message) => {
      if (message.error && !expectError) reject(new Error(`${type}: ${message.error}`));
      else resolve(message);
    });
    globalThis.onmessage({ data: { id, type, payload } });
  });
}

const bytes = await readFile(gpxPath);
const gpx = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

const { result: geometry } = await call("loadTrack", { gpx });
assert(geometry.points instanceof Float64Array);
assert(geometry.points.length > 8 && geometry.points.length % 4 === 0);
assert(geometry.distance_m > 1000);
console.log(
  `loaded ${geometry.name}: ${(geometry.distance_m / 1000).toFixed(1)} km, ` +
    `${geometry.points.length / 4} points, ${geometry.waypoints.length} waypoints`,
);

// Click on a point of the track, slightly off it.
const mid = Math.floor(geometry.points.length / 8) * 4;
const click = { latitude: geometry.points[mid] + 0.00003, longitude: geometry.points[mid + 1] };
const { result: candidates } = await call("snap", { ...click, radius_m: 60 });
assert(candidates.length >= 1, "a click near the track finds a candidate");
const first = candidates[0];
assert(first.offset_m < 60);
console.log(
  `snap: ${candidates.length} candidate(s), first at km ${(first.distance_m / 1000).toFixed(2)}`,
);

const far = await call("snap", { latitude: 0, longitude: 0, radius_m: 60 });
assert.deepEqual(far.result, [], "a click far from the route finds none");

const bad = await call("snap", { ...click, radius_m: 0 }, true);
assert(bad.error, "radius 0 is refused");

// The distance the click landed at names the same place again (a checkpoint by km).
const { result: point } = await call("pointAt", { distance_m: first.distance_m });
assert.equal(point.distance_m, first.distance_m);
const apart_m =
  Math.hypot(
    point.latitude - first.latitude,
    (point.longitude - first.longitude) * Math.cos((first.latitude * Math.PI) / 180),
  ) * 111_320;
assert(apart_m < 20, `pointAt lands ${apart_m.toFixed(1)} m from the snapped point`);
const past = await call("pointAt", { distance_m: geometry.distance_m + 1 }, true);
assert.match(past.error, /distance invalid/i, "a distance past the finish is refused");
console.log(
  `pointAt: km ${(point.distance_m / 1000).toFixed(2)}, ${apart_m.toFixed(1)} m from snap`,
);

// The edited pins: the file's own, plus one more with a cutoff, in route order.
const pins = geometry.waypoints.map((w) => ({ ...w }));
const added = {
  latitude: first.latitude,
  longitude: first.longitude,
  elevation_m: first.elevation_m,
  name: "Waymark test & <check>",
  type_name: "TimeBarrier",
  epoch_s: 1_787_281_200 + 3600 * 10,
  stop_s: 300,
  description: null,
  comment: null,
  symbol: null,
  distance_m: first.distance_m,
};
const at = pins.findIndex((p) => p.distance_m > added.distance_m);
pins.splice(at === -1 ? pins.length : at, 0, added);

const { result: plan } = await call("plan", { pins, settings: {} });
// gpxz builds sections between pins: a single pin has none.
assert(
  pins.length < 2 ? plan.sections === null : Array.isArray(plan.sections),
  "plan has sections",
);
console.log(`plan: ${plan.sections?.length ?? 0} sections, ${plan.plan?.length ?? 0} plan entries`);

const { result: exported } = await call("exportGpx", { pins });
assert(exported instanceof Uint8Array && exported.length > bytes.length - 2000);
const text = Buffer.from(exported).toString("utf8");
assert(text.includes("Waymark test &amp; &lt;check&gt;"), "name is escaped once");
assert(text.includes(new Date(added.epoch_s * 1000).toISOString().replace(".000Z", "Z")));
assert((text.match(/<wpt /g) ?? []).length === pins.length);
console.log(`export: ${exported.length} bytes, ${pins.length} waypoints`);

// Reading the exported file back gives the same pins.
const re = await call("loadTrack", { gpx: exported.buffer.slice(0) });
assert.equal(re.result.waypoints.length, pins.length);
const back = re.result.waypoints.find((w) => w.name === added.name);
assert(back, "the added pin reads back, entities decoded");
assert.equal(back.epoch_s, added.epoch_s);
assert.equal(back.stop_s, added.stop_s);
assert.equal(re.result.points.length, geometry.points.length, "the track is untouched");
console.log("round trip OK");

if (outPath) await writeFile(outPath, exported);
process.exit(0);
