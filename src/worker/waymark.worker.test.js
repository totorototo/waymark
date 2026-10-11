import { beforeEach, describe, expect, it, vi } from "vitest";

// The real module is compiled by Zigar at build time: unit tests stand in for it and leave
// the real round trip to the build check (scripts/check-wasm.mjs).
vi.mock("../../zig/waymark.zig", () => {
  const slice = (value) => ({ string: JSON.stringify(value) });
  return {
    __zigar: { init: vi.fn(async () => {}) },
    routeGeometry: vi.fn(async () =>
      slice({ distance_m: 10, points: [1, 2, 3, 4], waypoints: [] }),
    ),
    snapCandidates: vi.fn(async () => slice([{ latitude: 1, longitude: 2, distance_m: 3 }])),
    pointAtDistance: vi.fn(async () => slice({ latitude: 1, longitude: 2, distance_m: 1500 })),
    summarizeEdit: vi.fn(async () => slice({ sections: [] })),
    exportGpx: vi.fn(async () => ({ typedArray: new Uint8Array([60, 103, 112, 120, 62]) })),
  };
});

const zig = await import("../../zig/waymark.zig");
const { handleMessage } = await import("./waymark.worker.js");

const bytes = () => new Uint8Array([1, 2, 3]).buffer;
const pin = (overrides = {}) => ({
  id: "pin-1",
  latitude: 42,
  longitude: 0,
  name: "Start",
  type_name: "Start",
  epoch_s: 100,
  distance_m: 0,
  ...overrides,
});
const decodePins = (call) => JSON.parse(new TextDecoder().decode(call[1]));

describe("handleMessage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await handleMessage({ id: 0, type: "loadTrack", payload: { gpx: bytes() } });
    vi.clearAllMocks();
  });

  it("loads the track and hands the points back as a typed array", async () => {
    const { id, result } = await handleMessage({
      id: 7,
      type: "loadTrack",
      payload: { gpx: bytes() },
    });
    expect(id).toBe(7);
    expect(result.points).toBeInstanceOf(Float64Array);
    expect([...result.points]).toEqual([1, 2, 3, 4]);
    expect(result.distance_m).toBe(10);
  });

  it("snaps a click on the track it loaded", async () => {
    const { result } = await handleMessage({
      id: 2,
      type: "snap",
      payload: { latitude: 42, longitude: 0, radius_m: 25 },
    });
    expect(result).toEqual([{ latitude: 1, longitude: 2, distance_m: 3 }]);
    expect(zig.snapCandidates).toHaveBeenCalledWith(expect.any(Uint8Array), 42, 0, 25);
  });

  it("finds the place a distance names on the track it loaded", async () => {
    const { result } = await handleMessage({
      id: 3,
      type: "pointAt",
      payload: { distance_m: 1500 },
    });
    expect(result).toEqual({ latitude: 1, longitude: 2, distance_m: 1500 });
    expect(zig.pointAtDistance).toHaveBeenCalledWith(expect.any(Uint8Array), 1500);
  });

  it("plans the loaded file with the pins as Zig reads them, without the page's ids", async () => {
    const { result } = await handleMessage({
      id: 3,
      type: "plan",
      payload: {
        pins: [pin(), pin({ id: "pin-2", name: "B", distance_m: 5 })],
        settings: { a: 1 },
      },
    });
    expect(result).toEqual({ sections: [] });
    const call = zig.summarizeEdit.mock.calls[0];
    expect(call[0]).toBeInstanceOf(Uint8Array);
    expect(call[2]).toEqual({ a: 1 });
    const pins = decodePins(call);
    expect(pins.map((p) => p.name)).toEqual(["Start", "B"]);
    expect(pins[0]).not.toHaveProperty("id");
    expect(pins[0]).toMatchObject({ latitude: 42, epoch_s: 100, distance_m: 0 });
  });

  it("plans with no settings as with an empty set", async () => {
    await handleMessage({ id: 3, type: "plan", payload: { pins: [] } });
    expect(zig.summarizeEdit.mock.calls[0][2]).toEqual({});
  });

  it("exports the pins as a copy of the bytes", async () => {
    const { result } = await handleMessage({
      id: 4,
      type: "exportGpx",
      payload: { pins: [pin()] },
    });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(result)).toBe("<gpx>");
    expect(decodePins(zig.exportGpx.mock.calls[0])).toHaveLength(1);
  });

  it("reports a Zig error by its name", async () => {
    zig.routeGeometry.mockRejectedValueOnce(new Error("ElevationMissing"));
    const response = await handleMessage({ id: 4, type: "loadTrack", payload: { gpx: bytes() } });
    expect(response).toEqual({ id: 4, error: "ElevationMissing" });
  });

  it("reports a pin the Zig side refuses", async () => {
    zig.exportGpx.mockRejectedValueOnce(new Error("PinsNotInRouteOrder"));
    const response = await handleMessage({ id: 5, type: "exportGpx", payload: { pins: [pin()] } });
    expect(response).toEqual({ id: 5, error: "PinsNotInRouteOrder" });
  });

  it("refuses an unknown request", async () => {
    expect(await handleMessage({ id: 5, type: "nope" })).toEqual({
      id: 5,
      error: "Unknown request: nope",
    });
  });
});
