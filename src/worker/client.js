// Promise wrapper around the worker: one pending request per id.

export function createWorkerClientFor(worker) {
  let nextId = 0;
  const pending = new Map();

  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id);
    if (!request) return;
    pending.delete(data.id);
    if (data.error) request.reject(new Error(data.error));
    else request.resolve(data.result);
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || "Worker failed");
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  function request(type, payload = {}, transfer = []) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload }, transfer);
    });
  }

  // The file's buffer is transferred: the caller's copy is detached (empty) afterwards.
  return {
    loadTrack: (gpx) => request("loadTrack", { gpx }, [gpx]),
    snap: (latitude, longitude, radius_m) => request("snap", { latitude, longitude, radius_m }),
    pointAt: (distance_m) => request("pointAt", { distance_m }),
    plan: (pins, settings) => request("plan", { pins, settings }),
    exportGpx: (pins) => request("exportGpx", { pins }),
    terminate: () => worker.terminate(),
  };
}

export function createWorkerClient() {
  const worker = new Worker(new URL("./waymark.worker.js", import.meta.url), {
    type: "module",
  });
  return createWorkerClientFor(worker);
}
