import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStore, editedFileName, PLACE_RADIUS_M, PLAN_DELAY_MS } from "./store.js";

// What the file holds is gpxz's business: the store only passes the bytes along.
const GPX = new TextEncoder().encode("<gpx/>").buffer;

const waypoint = (overrides = {}) => ({
  latitude: 42,
  longitude: 0,
  elevation_m: 1000,
  name: "Start",
  type_name: "Start",
  epoch_s: 1787281200,
  stop_s: null,
  description: null,
  comment: null,
  symbol: null,
  distance_m: 0,
  offset_m: 0,
  ...overrides,
});

const geometry = (waypoints = [waypoint()]) => ({
  name: "Test",
  distance_m: 10000,
  points: new Float64Array([42, 0, 1000, 0, 42.1, 0, 1100, 10000]),
  waypoints,
});

const candidate = (distance_m, overrides = {}) => ({
  latitude: 42 + distance_m / 100000,
  longitude: 0,
  elevation_m: 1100,
  distance_m,
  offset_m: 4,
  ...overrides,
});

function fakeClient(overrides = {}) {
  return {
    loadTrack: vi.fn(async () => geometry()),
    snap: vi.fn(async () => [candidate(5000)]),
    pointAt: vi.fn(async (distance_m) => candidate(distance_m, { offset_m: 0 })),
    plan: vi.fn(async () => ({ sections: [], stages: [], plan: [] })),
    exportGpx: vi.fn(async () => new Uint8Array([60, 103, 112, 120, 62])),
    ...overrides,
  };
}

describe("store", () => {
  let client;
  let useStore;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    client = fakeClient();
    useStore = createStore(() => client);
  });

  afterEach(() => vi.useRealTimers());

  const loaded = async () => {
    await useStore.getState().loadBuffer("race.gpx", GPX);
    client.plan.mockClear();
  };

  describe("loadText", () => {
    it("loads the track, turns its waypoints into pins and plans them", async () => {
      await useStore.getState().loadBuffer("race.gpx", GPX);
      const state = useStore.getState();

      expect(client.loadTrack).toHaveBeenCalledWith(GPX);
      expect(state.status).toBe("ready");
      expect(state.fileName).toBe("race.gpx");
      expect(state.pins).toHaveLength(1);
      expect(state.pins[0]).toMatchObject({ name: "Start", type_name: "Start", distance_m: 0 });
      expect(state.pins[0].id).toMatch(/^pin-/);
      expect(state.dirty).toBe(false);
      expect(client.plan).toHaveBeenCalledTimes(1);
      expect(state.planStatus).toBe("ready");
    });

    it("plans the pins, with the pace settings", async () => {
      await useStore.getState().loadBuffer("race.gpx", GPX);
      const [pins, settings] = client.plan.mock.calls[0];
      expect(pins).toEqual(useStore.getState().pins);
      expect(settings).toEqual(useStore.getState().settings);
    });

    it("reports a file the Zig side rejects", async () => {
      client.loadTrack.mockRejectedValueOnce(new Error("ElevationMissing"));
      await useStore.getState().loadBuffer("bad.gpx", "<gpx/>");
      expect(useStore.getState()).toMatchObject({ status: "error", error: "ElevationMissing" });
    });

    it("keeps the first file's results out when a second is loaded meanwhile", async () => {
      let release;
      client.loadTrack.mockImplementationOnce(
        () =>
          new Promise(
            (resolve) => (release = () => resolve(geometry([waypoint({ name: "Old" })]))),
          ),
      );
      client.loadTrack.mockResolvedValueOnce(geometry([waypoint({ name: "New" })]));

      const first = useStore.getState().loadBuffer("old.gpx", GPX);
      await useStore.getState().loadBuffer("new.gpx", GPX);
      release();
      await first;

      expect(useStore.getState().fileName).toBe("new.gpx");
      expect(useStore.getState().pins[0].name).toBe("New");
    });

    it("reads a File", async () => {
      await useStore.getState().loadFile({ name: "race.gpx", arrayBuffer: async () => GPX });
      expect(useStore.getState().fileName).toBe("race.gpx");
    });

    it("reports a File it cannot read", async () => {
      await useStore.getState().loadFile({
        name: "race.gpx",
        arrayBuffer: async () => {
          throw new Error("denied");
        },
      });
      expect(useStore.getState()).toMatchObject({ status: "error", error: "denied" });
    });
  });

  describe("mapClick", () => {
    it("adds a pin where a click lands, in route order, and selects it", async () => {
      await loaded();
      client.snap.mockResolvedValueOnce([candidate(5000)]);
      await useStore.getState().mapClick({ latitude: 42.05, longitude: 0, radius_m: 30 });
      const { pins, selectedId, dirty } = useStore.getState();

      expect(client.snap).toHaveBeenCalledWith(42.05, 0, 30);
      expect(pins.map((pin) => pin.distance_m)).toEqual([0, 5000]);
      expect(pins[1]).toMatchObject({
        type_name: "TimeBarrier",
        name: "Checkpoint 1",
        epoch_s: 1787281200, // the Start's time, to adjust
      });
      expect(selectedId).toBe(pins[1].id);
      expect(dirty).toBe(true);
    });

    it("makes the first pin of an empty file the Start", async () => {
      client.loadTrack.mockResolvedValueOnce(geometry([]));
      await useStore.getState().loadBuffer("bare.gpx", GPX);
      await useStore.getState().mapClick({ latitude: 42, longitude: 0, radius_m: 30 });
      expect(useStore.getState().pins[0]).toMatchObject({ type_name: "Start", name: "Start" });
    });

    it("says so when the click is off the route", async () => {
      await loaded();
      client.snap.mockResolvedValueOnce([]);
      await useStore.getState().mapClick({ latitude: 0, longitude: 0, radius_m: 30 });
      expect(useStore.getState().pins).toHaveLength(1);
      expect(useStore.getState().notice).toMatch(/off the route/);
    });

    it("waits for a choice between the passes of an out-and-back", async () => {
      await loaded();
      client.snap.mockResolvedValueOnce([candidate(3000), candidate(7000)]);
      await useStore.getState().mapClick({ latitude: 42.03, longitude: 0, radius_m: 30 });
      const { pending, pins } = useStore.getState();
      expect(pins).toHaveLength(1);
      expect(pending.candidates.map((c) => c.distance_m)).toEqual([3000, 7000]);

      useStore.getState().addPin(pending.candidates[1]);
      expect(useStore.getState().pending).toBeNull();
      expect(useStore.getState().pins.map((pin) => pin.distance_m)).toEqual([0, 7000]);
    });

    it("can drop a choice", async () => {
      await loaded();
      client.snap.mockResolvedValueOnce([candidate(3000), candidate(7000)]);
      await useStore.getState().mapClick({ latitude: 42.03, longitude: 0, radius_m: 30 });
      useStore.getState().cancelPending();
      expect(useStore.getState().pending).toBeNull();
    });

    it("reports what the worker says", async () => {
      await loaded();
      client.snap.mockRejectedValueOnce(new Error("RadiusInvalid"));
      await useStore.getState().mapClick({ latitude: 42, longitude: 0, radius_m: 0 });
      expect(useStore.getState().notice).toBe("RadiusInvalid");
    });

    it("does nothing before a file is loaded", async () => {
      await useStore.getState().mapClick({ latitude: 42, longitude: 0, radius_m: 30 });
      expect(client.snap).not.toHaveBeenCalled();
    });
  });

  describe("editing", () => {
    it("updates a pin and plans once for a burst of edits", async () => {
      await loaded();
      const [pin] = useStore.getState().pins;
      useStore.getState().updatePin(pin.id, { name: "V" });
      useStore.getState().updatePin(pin.id, { name: "Vi" });
      useStore.getState().updatePin(pin.id, { name: "Vielle-Aure" });
      expect(useStore.getState().planStatus).toBe("computing");
      expect(client.plan).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      expect(client.plan).toHaveBeenCalledTimes(1);
      expect(client.plan.mock.calls[0][0][0].name).toBe("Vielle-Aure");
      expect(useStore.getState().pins[0].name).toBe("Vielle-Aure");
      expect(useStore.getState().dirty).toBe(true);
    });

    it("prefills the checkpoints with the Start's time, and moves them with it", async () => {
      client.loadTrack.mockResolvedValueOnce(
        geometry([
          waypoint({ epoch_s: null }),
          waypoint({ name: "Col", type_name: "TimeBarrier", epoch_s: null, distance_m: 4000 }),
          waypoint({
            name: "Set",
            type_name: "TimeBarrier",
            epoch_s: 1787300000,
            distance_m: 6000,
          }),
          waypoint({ name: "Bridge", type_name: null, epoch_s: null, distance_m: 8000 }),
        ]),
      );
      await useStore.getState().loadBuffer("race.gpx", GPX);
      const times = () => useStore.getState().pins.map((pin) => pin.epoch_s);
      const startId = useStore.getState().pins[0].id;

      useStore.getState().updatePin(startId, { epoch_s: 1787281200 });
      expect(times()).toEqual([1787281200, 1787281200, 1787300000, null]);
      useStore.getState().updatePin(startId, { epoch_s: 1787284800 });
      expect(times()).toEqual([1787284800, 1787284800, 1787300000, null]);
      useStore.getState().updatePin(useStore.getState().pins[1].id, { epoch_s: 1787290000 });
      useStore.getState().updatePin(startId, { epoch_s: 1787281200 });
      expect(times()).toEqual([1787281200, 1787290000, 1787300000, null]);
    });

    it("removes a pin, and the selection with it", async () => {
      await loaded();
      const [pin] = useStore.getState().pins;
      useStore.getState().selectPin(pin.id);
      useStore.getState().removePin(pin.id);
      expect(useStore.getState().pins).toEqual([]);
      expect(useStore.getState().selectedId).toBeNull();
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      expect(client.plan.mock.calls[0][0]).toEqual([]);
    });

    it("clears every pin for a fresh start", async () => {
      await loaded();
      const [pin] = useStore.getState().pins;
      useStore.getState().selectPin(pin.id);
      client.plan.mockClear();
      await useStore.getState().clearPins();
      expect(useStore.getState().pins).toEqual([]);
      expect(useStore.getState().selectedId).toBeNull();
      expect(useStore.getState().dirty).toBe(true);
      expect(client.plan).toHaveBeenCalledWith([], expect.anything());
    });

    it("keeps another pin selected when one is removed", async () => {
      await loaded();
      await useStore.getState().mapClick({ latitude: 42.05, longitude: 0, radius_m: 30 });
      const [first, second] = useStore.getState().pins;
      useStore.getState().selectPin(second.id);
      useStore.getState().removePin(first.id);
      expect(useStore.getState().selectedId).toBe(second.id);
    });

    it("shows a plan the Zig side could not make", async () => {
      await loaded();
      client.plan.mockRejectedValueOnce(new Error("TimeInvalid"));
      useStore.getState().updatePin(useStore.getState().pins[0].id, { name: "x" });
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      expect(useStore.getState()).toMatchObject({
        plan: null,
        planError: "TimeInvalid",
        planStatus: "error",
      });
    });

    it("drops a plan that an edit has made stale", async () => {
      await loaded();
      let release;
      client.plan.mockImplementationOnce(
        () => new Promise((resolve) => (release = () => resolve({ sections: ["stale"] }))),
      );
      client.plan.mockResolvedValueOnce({ sections: ["fresh"] });
      const [pin] = useStore.getState().pins;

      useStore.getState().updatePin(pin.id, { name: "a" });
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      useStore.getState().updatePin(pin.id, { name: "b" });
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      release();
      await vi.advanceTimersByTimeAsync(0);

      expect(useStore.getState().plan.sections).toEqual(["fresh"]);
    });

    it("replans with another pace", async () => {
      await loaded();
      useStore.getState().setPace(420);
      useStore.getState().setPace(-1);
      useStore.getState().setPace(Number.NaN);
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      expect(client.plan).toHaveBeenCalledTimes(1);
      expect(client.plan.mock.calls[0][1].pace_base_s_per_km).toBe(420);
    });
  });

  describe("checkpoints by value", () => {
    beforeEach(() => useStore.getState().setTimeZone("Europe/Paris"));

    it("adds one at a distance, with its fields, and plans", async () => {
      await loaded();
      const result = await useStore.getState().addCheckpoint({
        distance_m: 4000,
        name: "Col",
        type_name: "life base",
        cutoff: "2026-08-21 09:30",
      });
      expect(client.pointAt).toHaveBeenCalledWith(4000);
      expect(result).toEqual({
        ok: true,
        pin: expect.objectContaining({
          name: "Col",
          type_name: "LifeBase",
          distance_m: 4000,
          cutoff: "2026-08-21T09:30",
        }),
      });
      const { pins, dirty } = useStore.getState();
      expect(pins.map((pin) => pin.name)).toEqual(["Start", "Col"]);
      expect(pins[1].id).toBe(result.pin.id);
      expect(dirty).toBe(true);
      await vi.advanceTimersByTimeAsync(PLAN_DELAY_MS);
      expect(client.plan).toHaveBeenCalledTimes(1);
    });

    it("adds one at coordinates that land on one pass of the track", async () => {
      await loaded();
      const result = await useStore.getState().addCheckpoint({ latitude: 42.05, longitude: 0 });
      expect(client.snap).toHaveBeenCalledWith(42.05, 0, PLACE_RADIUS_M);
      expect(result.ok).toBe(true);
      expect(result.pin.distance_m).toBe(5000);
    });

    it("refuses coordinates the route passes twice, or not at all", async () => {
      await loaded();
      client.snap.mockResolvedValueOnce([candidate(2000), candidate(8000)]);
      const twice = await useStore.getState().addCheckpoint({ latitude: 42, longitude: 0 });
      expect(twice).toEqual({
        ok: false,
        error: expect.stringMatching(/2 times \(km 2.00, 8.00\)/),
      });
      client.snap.mockResolvedValueOnce([]);
      const off = await useStore.getState().addCheckpoint({ latitude: 42, longitude: 0 });
      expect(off.error).toMatch(/not on the route/);
      expect(useStore.getState().pins).toHaveLength(1);
    });

    it("refuses a distance past the finish without asking the worker", async () => {
      await loaded();
      const result = await useStore.getState().addCheckpoint({ distance_m: 10001 });
      expect(result).toEqual({ ok: false, error: "km 10.00 is past the finish (km 10.00)." });
      expect(client.pointAt).not.toHaveBeenCalled();
    });

    it("says what is wrong with the input, and changes nothing", async () => {
      await loaded();
      const store = useStore.getState();
      expect((await store.addCheckpoint({ name: "Col" })).error).toMatch(/Say where/);
      expect((await store.addCheckpoint({ distance_m: 5, type_name: "x" })).error).toMatch(
        /Unknown type/,
      );
      expect((await store.addCheckpoint(null)).error).toMatch(/an object/);
      expect(useStore.getState().pins).toHaveLength(1);
      expect(useStore.getState().dirty).toBe(false);
    });

    it("refuses before a file is loaded, and reports the worker's error", async () => {
      expect((await useStore.getState().addCheckpoint({ distance_m: 5 })).error).toMatch(/No GPX/);
      await loaded();
      client.pointAt.mockRejectedValueOnce(new Error("DistanceInvalid"));
      const result = await useStore.getState().addCheckpoint({ distance_m: 5 });
      expect(result).toEqual({ ok: false, error: "DistanceInvalid" });
    });

    it("drops an answer for a file that is no longer open", async () => {
      await loaded();
      let answer;
      client.pointAt.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
      const adding = useStore.getState().addCheckpoint({ distance_m: 5 });
      await useStore.getState().loadBuffer("other.gpx", GPX);
      answer(candidate(5));
      expect((await adding).error).toMatch(/Another file/);
      expect(useStore.getState().pins).toHaveLength(1);
    });

    it("updates the fields of one, and moves it", async () => {
      await loaded();
      const { pin } = await useStore.getState().addCheckpoint({ distance_m: 4000 });
      const renamed = await useStore.getState().updateCheckpoint(pin.id, { name: "Col" });
      expect(renamed).toEqual({ ok: true, pin: expect.objectContaining({ name: "Col" }) });
      expect(client.pointAt).toHaveBeenCalledTimes(1);

      const moved = await useStore.getState().updateCheckpoint(pin.id, { distance_m: 6000 });
      expect(moved.pin).toMatchObject({ id: pin.id, name: "Col", distance_m: 6000 });
      expect(await useStore.getState().updateCheckpoint("pin-99", {})).toEqual({
        ok: false,
        error: 'No checkpoint "pin-99".',
      });
    });

    it("reviews the plan of the pins as they are now, not as last planned", async () => {
      expect((await useStore.getState().reviewPlan()).ok).toBe(false);
      await loaded();
      await useStore.getState().addCheckpoint({ distance_m: 4000, name: "Col" });
      // The edit's plan is still waiting for its delay: the review plans it at once.
      const review = await useStore.getState().reviewPlan();
      expect(client.plan).toHaveBeenCalledTimes(1);
      expect(client.plan.mock.calls[0][0].map((pin) => pin.name)).toEqual(["Start", "Col"]);
      expect(review).toMatchObject({ ok: true, ready: true, timeZone: "Europe/Paris" });
      expect(review.issues.map((issue) => issue.message)).toContain("No Arrival.");
    });

    it("removes one, and lists them on the race's clock", async () => {
      expect(useStore.getState().listCheckpoints()).toEqual({
        ok: false,
        error: expect.stringMatching(/^No GPX loaded: open one with load_gpx/),
      });
      await loaded();
      const listed = useStore.getState().listCheckpoints();
      expect(listed).toEqual({
        ok: true,
        route_distance_m: 10000,
        timeZone: "Europe/Paris",
        checkpoints: [expect.objectContaining({ name: "Start", cutoff: "2026-08-21T05:00" })],
      });
      const { id } = listed.checkpoints[0];
      expect(useStore.getState().removeCheckpoint(id)).toEqual({ ok: true });
      expect(useStore.getState().removeCheckpoint(id).ok).toBe(false);
      expect(useStore.getState().listCheckpoints().checkpoints).toEqual([]);
    });
  });

  describe("moving and undoing", () => {
    const twoPins = async () => {
      await loaded();
      await useStore.getState().mapClick({ latitude: 42.05, longitude: 0, radius_m: 30 });
      return useStore.getState().pins;
    };

    it("moves a dragged pin onto the track, keeping its fields", async () => {
      const [, pin] = await twoPins();
      useStore.getState().updatePin(pin.id, { name: "Col" });
      client.snap.mockResolvedValueOnce([candidate(6000)]);
      await useStore.getState().movePin(pin.id, { latitude: 42.06, longitude: 0, radius_m: 30 });
      const moved = useStore.getState().pins[1];
      expect(moved).toMatchObject({ id: pin.id, name: "Col", distance_m: 6000 });
      expect(useStore.getState().undo.label).toBe("Moved Col");
    });

    it("takes the pass nearest where the pin was", async () => {
      const [, pin] = await twoPins();
      client.snap.mockResolvedValueOnce([candidate(5500), candidate(9000)]);
      await useStore.getState().movePin(pin.id, { latitude: 42.05, longitude: 0, radius_m: 30 });
      expect(useStore.getState().pins[1].distance_m).toBe(5500);
    });

    it("leaves a pin dropped off the route where it was", async () => {
      const [, pin] = await twoPins();
      client.snap.mockResolvedValueOnce([]);
      await useStore.getState().movePin(pin.id, { latitude: 0, longitude: 0, radius_m: 30 });
      expect(useStore.getState().pins[1].distance_m).toBe(5000);
      expect(useStore.getState().notice).toMatch(/off the route/);
      expect(useStore.getState().undo).toBeNull();
    });

    it("undoes a removal, with the selection", async () => {
      const [, pin] = await twoPins();
      useStore.getState().removePin(pin.id);
      expect(useStore.getState().undo.label).toBe("Removed Checkpoint 1");
      useStore.getState().undoLast();
      const { pins, selectedId, undo } = useStore.getState();
      expect(pins.map((other) => other.id)).toContain(pin.id);
      expect(selectedId).toBe(pin.id);
      expect(undo).toBeNull();
    });

    it("undoes removing every pin", async () => {
      await twoPins();
      await useStore.getState().clearPins();
      expect(useStore.getState().undo.label).toBe("Removed 2 pins");
      useStore.getState().undoLast();
      expect(useStore.getState().pins).toHaveLength(2);
    });

    it("adds a pin at a distance, selected, to be timed next", async () => {
      await loaded();
      const result = await useStore.getState().addAtDistance(4000);
      expect(result.ok).toBe(true);
      const { pins, selectedId, addedId } = useStore.getState();
      expect(pins.map((pin) => pin.distance_m)).toEqual([0, 4000]);
      expect(selectedId).toBe(result.pin.id);
      expect(addedId).toBe(result.pin.id);
      useStore.getState().selectPin(pins[0].id);
      expect(useStore.getState().addedId).toBeNull();
    });

    it("says why a distance cannot take a pin", async () => {
      await loaded();
      const result = await useStore.getState().addAtDistance(20000);
      expect(result).toEqual({ ok: false, error: expect.stringMatching(/past the finish/) });
      expect(useStore.getState().pins).toHaveLength(1);
    });

    it("drops the undo at the next change, so a later edit is never undone", async () => {
      const [first, second] = await twoPins();
      useStore.getState().removePin(second.id);
      useStore.getState().updatePin(first.id, { name: "Depart" });
      expect(useStore.getState().undo).toBeNull();
    });
  });

  describe("openFile", () => {
    const file = { name: "other.gpx", arrayBuffer: async () => GPX };

    it("opens a file at once when nothing is unsaved", async () => {
      await loaded();
      await useStore.getState().openFile(file);
      expect(useStore.getState().fileName).toBe("other.gpx");
    });

    it("waits for a confirmation before replacing unsaved edits", async () => {
      await loaded();
      useStore.getState().updatePin(useStore.getState().pins[0].id, { name: "Depart" });
      await useStore.getState().openFile(file);
      expect(useStore.getState().fileName).toBe("race.gpx");
      expect(useStore.getState().pendingFile).toBe(file);

      useStore.getState().cancelOpen();
      expect(useStore.getState().pendingFile).toBeNull();
      expect(useStore.getState().pins[0].name).toBe("Depart");

      await useStore.getState().openFile(file);
      await useStore.getState().confirmOpen();
      expect(useStore.getState().fileName).toBe("other.gpx");
      expect(useStore.getState().dirty).toBe(false);
    });
  });

  describe("export", () => {
    it("exports the pins, in route order, as the worker's bytes", async () => {
      await loaded();
      await useStore.getState().mapClick({ latitude: 42.05, longitude: 0, radius_m: 30 });
      const file = await useStore.getState().exportFile();

      expect(client.exportGpx).toHaveBeenCalledTimes(1);
      const pins = client.exportGpx.mock.calls[0][0];
      expect(pins.map((pin) => pin.distance_m)).toEqual([0, 5000]);
      expect(file.bytes).toEqual(new Uint8Array([60, 103, 112, 120, 62]));
      expect(file.name).toBe("race-edited.gpx");
    });

    it("clears the unsaved mark only when asked to", async () => {
      await loaded();
      useStore.getState().updatePin(useStore.getState().pins[0].id, { name: "x" });
      await useStore.getState().exportFile();
      expect(useStore.getState().dirty).toBe(true);
      await useStore.getState().exportFile({ markSaved: true });
      expect(useStore.getState().dirty).toBe(false);
    });

    it("keeps the unsaved mark for an edit made while exporting", async () => {
      await loaded();
      const exporting = useStore.getState().exportFile({ markSaved: true });
      useStore.getState().updatePin(useStore.getState().pins[0].id, { name: "x" });
      await exporting;
      expect(useStore.getState().dirty).toBe(true);
    });

    it("keeps the unsaved mark when Zig refuses the pins", async () => {
      await loaded();
      useStore.getState().updatePin(useStore.getState().pins[0].id, { name: "x" });
      client.exportGpx.mockRejectedValueOnce(new Error("CoordinateInvalid"));
      await expect(useStore.getState().exportFile({ markSaved: true })).rejects.toThrow(
        "CoordinateInvalid",
      );
      expect(useStore.getState().dirty).toBe(true);
    });
  });

  describe("editedFileName", () => {
    it("never names the download as the director's file", () => {
      expect(editedFileName("grp-160-2026.gpx")).toBe("grp-160-2026-edited.gpx");
      expect(editedFileName("Race.GPX")).toBe("Race-edited.gpx");
      expect(editedFileName("route")).toBe("route-edited.gpx");
      expect(editedFileName(null)).toBe("route-edited.gpx");
    });
  });

  describe("preferences", () => {
    it("remembers the theme", () => {
      const before = useStore.getState().theme;
      useStore.getState().toggleTheme();
      const after = useStore.getState().theme;
      expect(after).not.toBe(before);
      expect(localStorage.getItem("waymark-theme")).toBe(after);
      expect(createStore(() => client).getState().theme).toBe(after);
    });

    it("remembers the race's time zone, and refuses one that does not exist", () => {
      useStore.getState().setTimeZone("Europe/Paris");
      useStore.getState().setTimeZone("Mars/Olympus_Mons");
      expect(useStore.getState().timeZone).toBe("Europe/Paris");
      expect(createStore(() => client).getState().timeZone).toBe("Europe/Paris");
    });

    it("starts from a saved zone that no longer exists as the browser's", () => {
      localStorage.setItem("waymark-timezone", "Mars/Olympus_Mons");
      expect(createStore(() => client).getState().timeZone).not.toBe("Mars/Olympus_Mons");
    });
  });
});
