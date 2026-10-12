import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The synthetic 6 km race (Start, Refuge, Finish), run through the real WASM module.
export const fixture = fileURLToPath(new URL("../zig/testdata/route.gpx", import.meta.url));
export const fixtureText = readFileSync(fixture, "utf8");

// The tests never reach Mapbox: no tiles and no style, but the pins are still drawn on the
// map and can be dragged.
export const offline = (page) =>
  page.route(/^https:\/\/[^/]*mapbox\.com\//, (route) => route.abort());

export async function readDownload(download) {
  const chunks = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
