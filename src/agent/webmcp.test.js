import { describe, expect, it, vi } from "vitest";

import { createStore } from "../store/store.js";
import { checkpointTools, GPX_BYTES_MAX, registerWebMcp } from "./webmcp.js";

const GPX = new TextEncoder().encode("<gpx/>").buffer;

const candidate = (distance_m) => ({
  latitude: 42 + distance_m / 100000,
  longitude: 0,
  elevation_m: 1000,
  distance_m,
  offset_m: 0,
});

// A store over a fake worker, with an open 10 km route and no pins.
async function openStore() {
  const client = {
    loadTrack: vi.fn(async () => ({ name: "Test", distance_m: 10000, points: [], waypoints: [] })),
    snap: vi.fn(async () => [candidate(5000)]),
    pointAt: vi.fn(async (distance_m) => candidate(distance_m)),
    plan: vi.fn(async () => ({ sections: [], stages: [], plan: [] })),
    exportGpx: vi.fn(),
  };
  const store = createStore(() => client);
  store.getState().setTimeZone("Europe/Paris");
  await store.getState().loadBuffer("race.gpx", GPX);
  return { store, client };
}

const byName = (tools) => Object.fromEntries(tools.map((tool) => [tool.name, tool]));

describe("checkpointTools", () => {
  it("offers valid names, a description and a schema for each tool, and no tool that returns the file", () => {
    const tools = checkpointTools(createStore(() => ({})));
    expect(tools.map((tool) => tool.name)).toEqual([
      "load_gpx",
      "list_checkpoints",
      "review_plan",
      "add_checkpoint",
      "update_checkpoint",
      "remove_checkpoint",
      "download_gpx",
    ]);
    for (const tool of tools) {
      expect(tool.name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.inputSchema.type).toBe("object");
      expect(typeof tool.execute).toBe("function");
    }
    expect(byName(tools).list_checkpoints.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
  });

  it("adds, lists, updates and removes checkpoints through the store", async () => {
    const { store, client } = await openStore();
    const tools = byName(checkpointTools(store));

    const start = await tools.add_checkpoint.execute({
      distance_m: 0,
      name: "Start",
      type_name: "Start",
      cutoff: "2026-08-21T05:00",
    });
    const col = await tools.add_checkpoint.execute({ distance_m: 4000, name: "Col" });
    expect(start.ok && col.ok).toBe(true);
    expect(client.pointAt).toHaveBeenCalledWith(4000);

    const listed = await tools.list_checkpoints.execute({});
    expect(listed.route_distance_m).toBe(10000);
    expect(listed.checkpoints.map((checkpoint) => checkpoint.name)).toEqual(["Start", "Col"]);
    // The checkpoint starts from the Start's time, as a click would.
    expect(listed.checkpoints[1].cutoff).toBe("2026-08-21T05:00");

    const updated = await tools.update_checkpoint.execute({
      id: col.pin.id,
      cutoff: "2026-08-21 09:30",
      type_name: "LifeBase",
    });
    expect(updated.pin).toMatchObject({ cutoff: "2026-08-21T09:30", type_name: "LifeBase" });

    expect(await tools.remove_checkpoint.execute({ id: col.pin.id })).toEqual({ ok: true });
    expect(store.getState().pins).toHaveLength(1);
  });

  it("answers a bad call with an error the agent can read", async () => {
    const { store } = await openStore();
    const tools = byName(checkpointTools(store));
    expect((await tools.add_checkpoint.execute({ name: "Col" })).error).toMatch(/Say where/);
    expect((await tools.add_checkpoint.execute(undefined)).error).toMatch(/Say where/);
    expect((await tools.update_checkpoint.execute({ id: "nope" })).error).toMatch(/No checkpoint/);
    expect((await tools.remove_checkpoint.execute()).ok).toBe(false);
    expect(JSON.parse(JSON.stringify(await tools.list_checkpoints.execute()))).toBeTruthy();
  });
});

describe("load_gpx", () => {
  const gpx = '<gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>';

  // A store whose worker reads any bytes as a 10 km route with one waypoint, or fails.
  function storeOver(loadTrack) {
    const client = {
      loadTrack: vi.fn(
        loadTrack ??
          (async () => ({
            name: "GRP",
            distance_m: 10000,
            points: [],
            waypoints: [
              { latitude: 42, longitude: 0, name: "Start", type_name: "Start", distance_m: 0 },
            ],
          })),
      ),
      plan: vi.fn(async () => ({ sections: [], stages: [], plan: [] })),
      pointAt: vi.fn(async (distance_m) => candidate(distance_m)),
    };
    return { store: createStore(() => client), client };
  }
  const loadTool = (store) => byName(checkpointTools(store)).load_gpx;

  it("is marked consequential, and its output as from the file", () => {
    const { store } = storeOver();
    expect(loadTool(store).annotations).toEqual({
      consequentialHint: true,
      untrustedContentHint: true,
    });
  });

  it("opens the file's text and lists its checkpoints", async () => {
    const { store, client } = storeOver();
    const result = await loadTool(store).execute({ gpx, file_name: "grp-160.gpx" });
    expect(new TextDecoder().decode(client.loadTrack.mock.calls[0][0])).toBe(gpx);
    expect(result).toMatchObject({
      ok: true,
      file_name: "grp-160.gpx",
      route_distance_m: 10000,
      checkpoints: [expect.objectContaining({ name: "Start" })],
    });
  });

  it("fetches a link, named after the file", async () => {
    const { store } = storeOver();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(gpx, { status: 200 }));
    const result = await loadTool(store).execute({
      url: "https://example.com/races/grp%20160.gpx",
    });
    expect(fetchSpy.mock.calls[0][0].href).toBe("https://example.com/races/grp%20160.gpx");
    expect(result).toMatchObject({ ok: true, file_name: "grp 160.gpx" });
    fetchSpy.mockRestore();
  });

  it("says why a link could not be loaded", async () => {
    const { store } = storeOver();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 404 }));
    expect((await loadTool(store).execute({ url: "https://example.com/a.gpx" })).error).toMatch(
      /answered 404/,
    );
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect((await loadTool(store).execute({ url: "https://example.com/a.gpx" })).error).toMatch(
      /may not allow it/,
    );
    expect((await loadTool(store).execute({ url: "file:///etc/hosts" })).error).toMatch(
      /Only http/,
    );
    fetchSpy.mockRestore();
  });

  it("wants the text or a link, one of the two, and not too big", async () => {
    const { store, client } = storeOver();
    const tool = loadTool(store);
    expect((await tool.execute({})).error).toMatch(/one of the two/);
    expect((await tool.execute({ gpx, url: "https://example.com/a.gpx" })).error).toMatch(
      /one of the two/,
    );
    expect((await tool.execute({ gpx: "  " })).error).toMatch(/file's text/);
    expect((await tool.execute({ gpx: "x".repeat(GPX_BYTES_MAX + 1) })).error).toMatch(/too big/);
    expect(client.loadTrack).not.toHaveBeenCalled();
  });

  it("reports what gpxz refuses", async () => {
    const { store } = storeOver(async () => {
      throw new Error("Elevation missing");
    });
    expect(await loadTool(store).execute({ gpx })).toEqual({
      ok: false,
      error: "Not a usable GPX: Elevation missing",
    });
  });

  it("keeps unsaved edits unless told to drop them", async () => {
    const { store, client } = storeOver();
    await loadTool(store).execute({ gpx });
    await store.getState().addCheckpoint({ distance_m: 5000 });
    const refused = await loadTool(store).execute({ gpx });
    expect(refused.error).toMatch(/unsaved edits/);
    expect(store.getState().pins).toHaveLength(2);

    const replaced = await loadTool(store).execute({ gpx, discard_unsaved: true });
    expect(replaced.ok).toBe(true);
    expect(store.getState().pins).toHaveLength(1);
    expect(client.loadTrack).toHaveBeenCalledTimes(2);
  });
});

describe("download_gpx", () => {
  const bytes = new TextEncoder().encode("<gpx>edited</gpx>");
  const arrival = { type_name: "Arrival", distance_m: 10000 };

  async function withExport() {
    const { store, client } = await openStore();
    client.exportGpx.mockResolvedValue(bytes);
    const save = vi.fn();
    const tool = byName(checkpointTools(store, { save })).download_gpx;
    return { store, client, save, tool };
  }

  it("is consequential, and never hands the file's text to the agent", async () => {
    const { store, tool } = await withExport();
    expect(tool.annotations).toEqual({ consequentialHint: true });
    await store.getState().addCheckpoint({ distance_m: 0, type_name: "Start" });
    await store.getState().addCheckpoint(arrival);
    const result = await tool.execute({});
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain("<gpx>");
    expect(Object.keys(result).sort()).toEqual(["bytes", "file_name", "ok"]);
  });

  it("downloads the edited file once the plan is ready, and keeps the edits unsaved", async () => {
    const { store, client, save, tool } = await withExport();
    await store.getState().addCheckpoint({ distance_m: 0, type_name: "Start" });
    await store.getState().addCheckpoint(arrival);
    expect(store.getState().dirty).toBe(true);
    const result = await tool.execute({});
    expect(result).toEqual({ ok: true, file_name: "race-edited.gpx", bytes: bytes.byteLength });
    expect(save).toHaveBeenCalledWith("race-edited.gpx", bytes);
    expect(client.exportGpx).toHaveBeenCalledTimes(1);
    // The browser may have blocked it: load_gpx must still ask before replacing the edits.
    expect(store.getState().dirty).toBe(true);
  });

  it("refuses when the checkpoints change during the review", async () => {
    const { store, save, tool } = await withExport();
    await store.getState().addCheckpoint({ distance_m: 0, type_name: "Start" });
    await store.getState().addCheckpoint(arrival);
    const downloading = tool.execute({});
    const [start] = store.getState().pins;
    store.getState().updatePin(start.id, { name: "Moved on" });
    const result = await downloading;
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/changed during the review/),
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("refuses a plan that is not ready, unless forced", async () => {
    const { store, client, save, tool } = await withExport();
    await store.getState().addCheckpoint({ distance_m: 5000 });
    // gpxz cannot plan these pins: an error-level issue, so not ready.
    client.plan.mockRejectedValue(new Error("pins out of order"));
    const refused = await tool.execute({});
    expect(refused.ok).toBe(false);
    expect(refused.error).toMatch(/not ready/);
    expect(refused.review.issues.map((issue) => issue.message)).toContain(
      "No plan: pins out of order",
    );
    expect(save).not.toHaveBeenCalled();
    expect(client.exportGpx).not.toHaveBeenCalled();

    const forced = await tool.execute({ force: true });
    expect(forced.ok).toBe(true);
    expect(save).toHaveBeenCalledWith("race-edited.gpx", bytes);
  });

  it("answers an error, not a throw, with no route or when Zig refuses the export", async () => {
    const noRoute = byName(
      checkpointTools(
        createStore(() => ({})),
        { save: vi.fn() },
      ),
    ).download_gpx;
    expect((await noRoute.execute({})).error).toMatch(/No GPX is open/);

    const { store, client, save, tool } = await withExport();
    client.exportGpx.mockRejectedValue(new Error("pin outside the world"));
    await store.getState().addCheckpoint({ distance_m: 5000 });
    const result = await tool.execute({ force: true });
    expect(result).toEqual({ ok: false, error: "pin outside the world" });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("registerWebMcp", () => {
  const store = createStore(() => ({}));

  it("does nothing where the browser has no model context", () => {
    expect(() => registerWebMcp(store, {})()).not.toThrow();
    expect(() => registerWebMcp(store, { document: {} })()).not.toThrow();
    const navigator = { modelContext: { registerTool: vi.fn() } };
    registerWebMcp(store, { document: {}, navigator });
    expect(navigator.modelContext.registerTool).not.toHaveBeenCalled();
  });

  it("registers every tool on document.modelContext, and unregisters them by aborting", () => {
    const registerTool = vi.fn(async () => undefined);
    const unregister = registerWebMcp(store, { document: { modelContext: { registerTool } } });
    expect(registerTool).toHaveBeenCalledTimes(7);
    const { signal } = registerTool.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    unregister();
    expect(signal.aborted).toBe(true);
  });

  it("stays quiet when unregistered before the browser finished registering", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registerTool = vi.fn(
      (_tool, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("signal is aborted"))),
        ),
    );
    registerWebMcp(store, { document: { modelContext: { registerTool } } })();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns, and registers the rest, when the browser refuses a tool", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registerTool = vi
      .fn()
      .mockRejectedValueOnce(new Error("InvalidStateError"))
      .mockResolvedValue(undefined);
    registerWebMcp(store, { document: { modelContext: { registerTool } } });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringMatching(/load_gpx/)));
    expect(registerTool).toHaveBeenCalledTimes(7);
    warn.mockRestore();
  });
});
