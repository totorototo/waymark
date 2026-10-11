// Waymark web worker: owns the Zig/WASM module and keeps parsing and writing off the main
// thread. Every GPX byte is read and written by gpxz, through zig/waymark.zig.
//
// Protocol: the page posts { id, type, payload } and gets back { id, result } or
// { id, error }. The file arrives once, transferred (loadTrack), and stays here: a click or
// an edit only sends what changed. The Zig side takes the pins as JSON and returns JSON, or
// the exported file's bytes (see zig/waymark.zig for why); the page receives plain objects.

import {
  __zigar,
  exportGpx,
  pointAtDistance,
  routeGeometry,
  snapCandidates,
  summarizeEdit,
} from "../../zig/waymark.zig";

let ready = null;

function init() {
  ready ??= __zigar.init();
  return ready;
}

// A []u8 comes back from Zigar as a slice object; `.string` decodes it as UTF-8.
const decode = (slice) => JSON.parse(slice.string);

// The file as it was loaded.
// why: kept here, not posted with every click: the track does not change when pins do, and
// a click only needs it to find the nearest point.
const track = { bytes: null };

function loadedTrack() {
  if (!track.bytes) throw new Error("No GPX loaded");
  return track.bytes;
}

// The pins as Zig reads them: an array of waypoints, in route order. The id is the page's.
const encodePins = (pins) => {
  const waypoints = pins.map((pin) => {
    const waypoint = { ...pin };
    delete waypoint.id;
    return waypoint;
  });
  return new TextEncoder().encode(JSON.stringify(waypoints));
};

export const handlers = {
  async loadTrack({ gpx }) {
    track.bytes = new Uint8Array(gpx);
    const geometry = decode(await routeGeometry(track.bytes));
    // Flat numbers, four per point: a typed array crosses back without a copy per element.
    return { ...geometry, points: Float64Array.from(geometry.points) };
  },
  async snap({ latitude, longitude, radius_m }) {
    return decode(await snapCandidates(loadedTrack(), latitude, longitude, radius_m));
  },
  // The place `distance_m` along the route: a checkpoint given by distance (an import).
  async pointAt({ distance_m }) {
    return decode(await pointAtDistance(loadedTrack(), distance_m));
  },
  // The plan of the loaded file with its waypoints replaced by the pins.
  async plan({ pins, settings }) {
    return decode(await summarizeEdit(loadedTrack(), encodePins(pins), settings ?? {}));
  },
  // The loaded file with its waypoints replaced by the pins, as bytes. A []u8 comes back as a
  // view over WASM memory: copied out, since that memory is reused by the next call.
  async exportGpx({ pins }) {
    const slice = await exportGpx(loadedTrack(), encodePins(pins));
    return Uint8Array.from(slice.typedArray);
  },
};

export async function handleMessage({ id, type, payload }) {
  const handler = handlers[type];
  if (!handler) return { id, error: `Unknown request: ${type}` };
  try {
    await init();
    return { id, result: await handler(payload ?? {}) };
  } catch (err) {
    // Zig errors surface as JS errors named after the error set member (e.g. TimeInvalid).
    return { id, error: err?.message ?? String(err) };
  }
}

self.onmessage = async (event) => {
  const response = await handleMessage(event.data);
  // The exported file's buffer moves instead of being copied.
  const transfer = response.result instanceof Uint8Array ? [response.result.buffer] : [];
  self.postMessage(response, transfer);
};
