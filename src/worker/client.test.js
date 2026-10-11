import { describe, expect, it, vi } from "vitest";

import { createWorkerClientFor } from "./client.js";

function fakeWorker() {
  const worker = { posted: [], terminate: vi.fn() };
  worker.postMessage = (message, transfer) => worker.posted.push({ message, transfer });
  return worker;
}

describe("createWorkerClientFor", () => {
  it("resolves a request with its own result", async () => {
    const worker = fakeWorker();
    const client = createWorkerClientFor(worker);
    const first = client.snap(1, 2, 30);
    const second = client.snap(3, 4, 30);
    const [one, two] = worker.posted.map(({ message }) => message);
    expect(one).toEqual({
      id: 0,
      type: "snap",
      payload: { latitude: 1, longitude: 2, radius_m: 30 },
    });

    worker.onmessage({ data: { id: two.id, result: "second" } });
    worker.onmessage({ data: { id: one.id, result: "first" } });
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
  });

  it("rejects with the worker's error", async () => {
    const worker = fakeWorker();
    const client = createWorkerClientFor(worker);
    const request = client.snap(1, 2, 30);
    worker.onmessage({ data: { id: 0, error: "ElevationMissing" } });
    await expect(request).rejects.toThrow("ElevationMissing");
  });

  it("transfers the file's buffer on load, and only then", () => {
    const worker = fakeWorker();
    const client = createWorkerClientFor(worker);
    const buffer = new ArrayBuffer(8);
    client.loadTrack(buffer);
    client.plan([{ id: "pin-1" }], { pace_base_s_per_km: 500 });
    client.exportGpx([{ id: "pin-1" }]);
    expect(worker.posted[0].transfer).toEqual([buffer]);
    expect(worker.posted[1].message.payload).toEqual({
      pins: [{ id: "pin-1" }],
      settings: { pace_base_s_per_km: 500 },
    });
    expect(worker.posted[1].transfer).toEqual([]);
    expect(worker.posted[2].message).toMatchObject({ type: "exportGpx" });
  });

  it("ignores an answer to nothing", () => {
    const worker = fakeWorker();
    createWorkerClientFor(worker);
    expect(() => worker.onmessage({ data: { id: 99, result: 1 } })).not.toThrow();
  });

  it("rejects every pending request when the worker fails", async () => {
    const worker = fakeWorker();
    const client = createWorkerClientFor(worker);
    const first = client.snap(1, 2, 30);
    const second = client.snap(3, 4, 30);
    worker.onerror({ message: "boom" });
    await expect(first).rejects.toThrow("boom");
    await expect(second).rejects.toThrow("boom");
  });

  it("terminates the worker", () => {
    const worker = fakeWorker();
    createWorkerClientFor(worker).terminate();
    expect(worker.terminate).toHaveBeenCalled();
  });
});
