// WebMCP: the checkpoint operations offered as tools to an agent running in the browser, so
// a director can say "add the aid stations from this sheet" instead of clicking each one.
// https://developer.chrome.com/docs/ai/webmcp, https://webmachinelearning.github.io/webmcp/
//
// The tools are the store's checkpoints-by-value actions, unchanged: same checks, same route
// order, same errors. A tool never throws for a bad call; it answers { ok: false, error },
// which the agent reads and can correct.
// why no export tool: the file leaves the page only when the person clicks Export, so an
// agent can edit the pins but never hand a file to anyone. Loading one in is a tool: the
// file stays in the page, and gpxz reads it as it reads one the person opens.

import { WAYPOINT_TYPES } from "../gpx/pins.js";

const FIELDS = {
  name: { type: "string", description: "The checkpoint's name, as runners will read it." },
  type_name: {
    type: ["string", "null"],
    enum: [...WAYPOINT_TYPES, null],
    description:
      "Start, TimeBarrier (a cutoff), LifeBase (an aid station with a long stop), Arrival, " +
      "or null for a landmark that is not a checkpoint.",
  },
  cutoff: {
    type: ["string", "null"],
    description:
      'The cutoff on the race\'s clock, "YYYY-MM-DDTHH:mm" (see timeZone in ' +
      "list_checkpoints), or with a zone (Z, +02:00). null clears it.",
  },
  stop_s: {
    type: ["integer", "null"],
    minimum: 0,
    description: "The planned stop at this checkpoint, in seconds.",
  },
  description: { type: ["string", "null"], description: "A note for the runners." },
};

const PLACE = {
  distance_m: {
    type: "number",
    minimum: 0,
    description: "Where along the route, in metres from the start. Prefer this to coordinates.",
  },
  latitude: { type: "number", minimum: -90, maximum: 90 },
  longitude: { type: "number", minimum: -180, maximum: 180 },
};

const ID = {
  type: "string",
  description: "The checkpoint's id, from list_checkpoints.",
};

// A GPX bigger than this is not a race route (a 170 km trace at one point a second is ~20 MB).
export const GPX_BYTES_MAX = 50 * 1024 * 1024;

// The bytes of the GPX that `input` names, { name, buffer } or { error }: its text, or a URL
// the page fetches (the host must allow it: CORS).
// why no file picker: Chrome opens one only on a click by the person, and a tool call is not.
async function gpxFromInput({ gpx, url, file_name }) {
  if ((gpx === undefined) === (url === undefined)) {
    return { error: "Give the file's text (gpx) or a link to it (url), one of the two." };
  }
  if (gpx !== undefined) {
    if (typeof gpx !== "string" || gpx.trim() === "")
      return { error: "gpx must be the file's text." };
    const bytes = new TextEncoder().encode(gpx);
    if (bytes.length > GPX_BYTES_MAX) return { error: "The file is too big for a route." };
    return { name: file_name || "route.gpx", buffer: bytes.buffer };
  }
  let address;
  try {
    address = new URL(url, globalThis.location?.href);
  } catch {
    return { error: `"${url}" is not a link.` };
  }
  if (address.protocol !== "https:" && address.protocol !== "http:") {
    return { error: "Only http and https links can be loaded." };
  }
  try {
    const response = await fetch(address);
    if (!response.ok) return { error: `${address} answered ${response.status}.` };
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > GPX_BYTES_MAX) return { error: "The file is too big for a route." };
    const name = file_name || decodeURIComponent(address.pathname.split("/").pop()) || "route.gpx";
    return { name, buffer };
  } catch (err) {
    // A host that does not allow other sites to read its files fails here, without a status.
    return {
      error: `${address} could not be fetched (${err.message}): the host may not allow it.`,
    };
  }
}

// Opens a GPX as the person would, then lists what it holds. Refuses to drop unsaved edits
// unless told to.
async function loadGpx(store, input = {}) {
  const { status, dirty } = store.getState();
  if (status === "ready" && dirty && input.discard_unsaved !== true) {
    return {
      ok: false,
      error:
        "The open route has unsaved edits. Ask the person to export them first, or call again " +
        "with discard_unsaved: true if they agree to lose them.",
    };
  }
  const file = await gpxFromInput(input);
  if (file.error) return { ok: false, error: file.error };
  await store.getState().loadBuffer(file.name, file.buffer);
  const state = store.getState();
  if (state.status !== "ready") return { ok: false, error: `Not a usable GPX: ${state.error}` };
  return { ...state.listCheckpoints(), file_name: state.fileName };
}

// The tools, for a store made by createStore. Plain data with `execute` callbacks: what
// registerWebMcp hands the browser, and what the tests call.
export function checkpointTools(store) {
  const state = () => store.getState();
  return [
    {
      name: "load_gpx",
      title: "Open a GPX",
      description:
        "Opens a race's GPX in the editor, from its text or from a link, in place of the open " +
        "route, and lists its checkpoints. The person can also open one with the Open GPX " +
        "button. The file's existing waypoints become the checkpoints.",
      inputSchema: {
        type: "object",
        properties: {
          gpx: { type: "string", description: "The whole GPX file, as text." },
          url: {
            type: "string",
            description: "A link to the GPX. The host must allow the page to fetch it (CORS).",
          },
          file_name: {
            type: "string",
            description: "The name to show and to base the export's name on.",
          },
          discard_unsaved: {
            type: "boolean",
            description: "Drop the open route's unsaved edits. Only with the person's agreement.",
          },
        },
        oneOf: [{ required: ["gpx"] }, { required: ["url"] }],
      },
      // It replaces the route being edited; what it reads comes from the file.
      annotations: { consequentialHint: true, untrustedContentHint: true },
      execute: async (input) => loadGpx(store, input ?? {}),
    },
    {
      name: "list_checkpoints",
      title: "List checkpoints",
      description:
        "The checkpoints of the open route, in route order, with the route's length and the " +
        "race's time zone. Read this first: ids, distances and the clock come from here.",
      inputSchema: { type: "object", properties: {} },
      // The names and notes come from the director's file: text, not instructions.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => state().listCheckpoints(),
    },
    {
      name: "review_plan",
      title: "Review the plan",
      description:
        "Checks the checkpoints as a race plan before export: what is wrong or likely " +
        "forgotten (no Arrival, a cutoff before the previous one, a time barrier without a " +
        "cutoff), and per checkpoint the estimated passage at the set pace, the cutoff and " +
        "the margin. Call it when done editing; `ready` says whether to hand over to the person.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async () => state().reviewPlan(),
    },
    {
      name: "add_checkpoint",
      title: "Add a checkpoint",
      description:
        "Adds a checkpoint on the route, snapped to the track, by distance or by coordinates. " +
        "Coordinates are refused where the route passes more than once: give the distance.",
      inputSchema: {
        type: "object",
        properties: { ...PLACE, ...FIELDS },
        oneOf: [{ required: ["distance_m"] }, { required: ["latitude", "longitude"] }],
      },
      execute: async (input) => state().addCheckpoint(input ?? {}),
    },
    {
      name: "update_checkpoint",
      title: "Update a checkpoint",
      description:
        "Changes a checkpoint's fields; a distance or coordinates also move it along the route.",
      inputSchema: {
        type: "object",
        properties: { id: ID, ...PLACE, ...FIELDS },
        required: ["id"],
      },
      execute: async ({ id, ...input } = {}) => state().updateCheckpoint(id, input),
    },
    {
      name: "remove_checkpoint",
      title: "Remove a checkpoint",
      description: "Removes a checkpoint from the route.",
      inputSchema: { type: "object", properties: { id: ID }, required: ["id"] },
      execute: async ({ id } = {}) => state().removeCheckpoint(id),
    },
  ];
}

// Registers the tools with the browser's agent (`document.modelContext`, Chrome 149+), if
// there is one. Returns a function that unregisters them, by aborting the signal they were
// registered with; without WebMCP, both do nothing.
export function registerWebMcp(store, scope = globalThis) {
  const modelContext = scope.document?.modelContext;
  if (typeof modelContext?.registerTool !== "function") return () => {};

  const controller = new AbortController();
  for (const tool of checkpointTools(store)) {
    Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal })).catch((err) => {
      // Unregistered before Chrome finished registering (StrictMode mounts effects twice in
      // development): what was asked for, not a failure.
      if (controller.signal.aborted) return;
      console.warn(`WebMCP: ${tool.name} not registered: ${err.message}`);
    });
  }
  return () => controller.abort();
}
