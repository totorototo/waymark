import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import {
  checkpointAdd,
  checkpointRemove,
  checkpointsDescribe,
  checkpointUpdate,
  fieldsFromInput,
  placeFromInput,
} from "../gpx/checkpoints.js";
import { pinFromWaypoint } from "../gpx/pins.js";
import { planReview } from "../gpx/review.js";
import { browserTimeZone, isValidTimeZone, pinsWithOffsets } from "../gpx/time.js";
import { createWorkerClient } from "../worker/client.js";

// The pace model's settings (gpxz's defaults). They only drive the estimates shown beside the
// cutoffs; the exported file does not carry them.
export const DEFAULT_SETTINGS = {
  pace_base_s_per_km: 500,
  fatigue_coefficient: 0.002,
  life_base_stop_s: 3600,
};

// How long an edit waits for the next before the plan is recomputed: typing a name should
// not parse a 3 MB file per key.
export const PLAN_DELAY_MS = 300;

// How far from the track a checkpoint given by coordinates may be: a spreadsheet's
// coordinates are often rounded, or taken at the aid station's tent, off the trail.
export const PLACE_RADIUS_M = 150;

// What a checkpoint action answers before a file is open: what to do, not only what is wrong.
const NO_GPX = "No GPX loaded: open one with load_gpx, or ask the person to use Open GPX.";

// The two preferences a reload keeps; the file and the pins must not survive one.
const STORAGE_KEY = "waymark-storage";
const persisted = ({ theme, timeZone }) => ({ theme, timeZone });

// localStorage, quiet when blocked or full (private mode, a sandbox): the preference is then
// not remembered, and the next visit starts from the default.
const storage = createJSONStorage(() => ({
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Not remembered.
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
}));

// The saved preferences over the defaults, each only if still valid: a zone the browser no
// longer knows starts from the browser's.
function mergePersisted(saved, current) {
  const merged = { ...current };
  if (saved?.theme === "dark" || saved?.theme === "light") merged.theme = saved.theme;
  if (typeof saved?.timeZone === "string" && isValidTimeZone(saved.timeZone)) {
    merged.timeZone = saved.timeZone;
  }
  return merged;
}

// The system's variant, as Terminus starts from, until the user picks one.
function systemTheme() {
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// "race.gpx" → "race-edited.gpx": the download never overwrites the director's file.
export function editedFileName(fileName) {
  const base = (fileName ?? "route.gpx").replace(/\.gpx$/i, "");
  return `${base}-edited.gpx`;
}

// What undoLast puts back.
const snapshot = (state, label) => ({ label, pins: state.pins, selectedId: state.selectedId });

export const createStore = (getClient = createWorkerClient) => {
  let client = null;
  const worker = () => (client ??= getClient());
  // A new file drops whatever is still computing for the old one: bumped there, checked
  // before each write.
  let generation = 0;
  let planTimer = null;
  let planRun = 0;
  let nextPinId = 1;
  const pinId = () => `pin-${nextPinId++}`;

  const creator = (set, get) => {
    // The plan of the file the pins would make, written unless a newer edit or file has made
    // it stale.
    async function computePlan() {
      const { geometry, pins, settings, timeZone } = get();
      if (geometry === null) return;
      const mine = generation;
      const run = ++planRun;
      set({ planStatus: "computing" });
      try {
        // why: gpxz puts the night slowdown on the start's local clock, so the plan, like
        // the file, takes the race's offsets.
        const plan = await worker().plan(pinsWithOffsets(pins, timeZone), settings);
        if (mine !== generation || run !== planRun) return;
        set({ plan, planError: null, planStatus: "ready" });
      } catch (err) {
        if (mine !== generation || run !== planRun) return;
        set({ plan: null, planError: err.message, planStatus: "error" });
      }
    }

    function schedulePlan({ immediate = false } = {}) {
      clearTimeout(planTimer);
      if (immediate) return computePlan();
      set({ planStatus: "computing" });
      planTimer = setTimeout(computePlan, PLAN_DELAY_MS);
      return undefined;
    }

    // The place on the track `place` names: { candidate } or { error }. Coordinates must land
    // on one pass of the track; where the route passes twice, only a distance can tell which.
    async function resolvePlace(place) {
      if ("distance_m" in place) {
        const { distance_m } = get().geometry;
        if (place.distance_m > distance_m) {
          const km = (value) => (value / 1000).toFixed(2);
          return { error: `km ${km(place.distance_m)} is past the finish (km ${km(distance_m)}).` };
        }
        return { candidate: await worker().pointAt(place.distance_m) };
      }
      const candidates = await worker().snap(place.latitude, place.longitude, PLACE_RADIUS_M);
      if (candidates.length === 0) {
        return { error: `${place.latitude}, ${place.longitude} is not on the route.` };
      }
      if (candidates.length > 1) {
        const kms = candidates.map((candidate) => (candidate.distance_m / 1000).toFixed(2));
        return {
          error: `The route passes there ${candidates.length} times (km ${kms.join(", ")}): give the distance instead.`,
        };
      }
      return { candidate: candidates[0] };
    }

    // Checks `input`, resolves its place, and applies `apply(pins, fields, candidate)`, which
    // returns { pins, pin }. The pins it applies to are read after the worker answers: an
    // edit made meanwhile is kept, not overwritten.
    async function change(input, { placeRequired }, apply, id = null) {
      if (get().status !== "ready") return { ok: false, error: NO_GPX };
      if (input === null || typeof input !== "object") {
        return { ok: false, error: "A checkpoint is an object." };
      }
      const checked = fieldsFromInput(input, { timeZone: get().timeZone });
      if (checked.errors) return { ok: false, error: checked.errors.join(" ") };
      const place = placeFromInput(input);
      if (place?.error) return { ok: false, error: place.error };
      if (place === null && placeRequired) {
        return { ok: false, error: "Say where: distance_m, or latitude and longitude." };
      }

      const mine = generation;
      let candidate = null;
      if (place !== null) {
        try {
          const resolved = await resolvePlace(place);
          if (resolved.error) return { ok: false, error: resolved.error };
          candidate = resolved.candidate;
        } catch (err) {
          return { ok: false, error: err.message };
        }
      }
      if (mine !== generation) return { ok: false, error: "Another file was opened." };
      if (id !== null && !get().pins.some((pin) => pin.id === id)) {
        return { ok: false, error: `No checkpoint "${id}".` };
      }

      const { pins, pin } = apply(get().pins, checked.fields, candidate);
      set({ pins, dirty: true, pending: null, undo: null });
      schedulePlan();
      const changed = pin ?? pins.find((other) => other.id === id);
      return { ok: true, pin: checkpointsDescribe([changed], get().timeZone)[0] };
    }

    return {
      theme: systemTheme(),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      // The race's clock: cutoffs are typed in it and saved as UTC.
      timeZone: browserTimeZone(),
      setTimeZone: (timeZone) => {
        if (!isValidTimeZone(timeZone)) return;
        set({ timeZone });
        // The night moves with the clock: the plan's times do too.
        schedulePlan();
      },

      status: "idle", // "idle" | "loading" | "ready" | "error"
      error: null,
      fileName: null,
      geometry: null,

      pins: [],
      selectedId: null,
      // The pin the person just added, whose cutoff time the panel focuses.
      addedId: null,
      // A click that landed on several passes of the track, waiting for the person to pick.
      pending: null,
      // A line for what the last click or export did not do.
      notice: null,
      dirty: false,
      // The last removal or move, until the next change to the pins: { label, pins, selectedId }.
      // why: one level, dropped by any other change: restoring a snapshot after later edits
      // would silently undo those too.
      undo: null,
      // A file the person opened over unsaved edits, waiting for them to confirm.
      pendingFile: null,

      settings: DEFAULT_SETTINGS,
      plan: null,
      planError: null,
      planStatus: "idle", // "idle" | "computing" | "ready" | "error"

      async loadBuffer(fileName, buffer) {
        const mine = ++generation;
        clearTimeout(planTimer);
        set({
          status: "loading",
          error: null,
          notice: null,
          pending: null,
          selectedId: null,
          undo: null,
          pendingFile: null,
          plan: null,
          planError: null,
          planStatus: "idle",
        });
        try {
          const geometry = await worker().loadTrack(buffer);
          if (mine !== generation) return;
          const pins = geometry.waypoints.map((waypoint) => pinFromWaypoint(waypoint, pinId()));
          set({
            status: "ready",
            fileName,
            geometry,
            pins,
            dirty: false,
          });
          await schedulePlan({ immediate: true });
        } catch (err) {
          if (mine !== generation) return;
          set({ status: "error", error: err.message });
        }
      },

      async loadFile(file) {
        try {
          await get().loadBuffer(file.name, await file.arrayBuffer());
        } catch (err) {
          set({ status: "error", error: err.message });
        }
      },

      // A file the person opened: loaded now, or once they confirm, when it would replace
      // unsaved edits.
      openFile(file) {
        const { status, dirty } = get();
        if (status === "ready" && dirty) {
          set({ pendingFile: file });
          return undefined;
        }
        return get().loadFile(file);
      },

      confirmOpen() {
        const file = get().pendingFile;
        if (!file) return undefined;
        set({ pendingFile: null });
        return get().loadFile(file);
      },

      cancelOpen: () => set({ pendingFile: null }),

      selectPin: (selectedId) => set({ selectedId, addedId: null, pending: null }),

      // A click on the map, `radius_m` wide: the track points it lands on. One is a pin; several
      // (an out-and-back passes the same place twice) wait for the person to choose.
      async mapClick({ latitude, longitude, radius_m }) {
        if (get().status !== "ready") return;
        const mine = generation;
        try {
          const candidates = await worker().snap(latitude, longitude, radius_m);
          if (mine !== generation) return;
          if (candidates.length === 0) {
            set({ notice: "That is off the route: click on the line.", pending: null });
          } else if (candidates.length === 1) {
            get().addPin(candidates[0]);
          } else {
            set({ pending: { latitude, longitude, candidates }, notice: null });
          }
        } catch (err) {
          if (mine === generation) set({ notice: err.message });
        }
      },

      cancelPending: () => set({ pending: null }),

      addPin(candidate) {
        const { pins, pin } = checkpointAdd(get().pins, candidate, {}, pinId());
        set({
          pins,
          selectedId: pin.id,
          addedId: pin.id,
          pending: null,
          notice: null,
          dirty: true,
          undo: null,
        });
        schedulePlan();
      },

      // A pin typed in as a distance along the route, selected as a click's would be.
      async addAtDistance(distance_m) {
        const result = await get().addCheckpoint({ distance_m });
        if (result.ok) set({ selectedId: result.pin.id, addedId: result.pin.id });
        return result;
      },

      updatePin(id, patch) {
        set((state) => ({
          pins: checkpointUpdate(state.pins, id, patch),
          dirty: true,
          undo: null,
        }));
        schedulePlan();
      },

      removePin(id) {
        set((state) => {
          const pin = state.pins.find((other) => other.id === id);
          return {
            pins: checkpointRemove(state.pins, id),
            selectedId: state.selectedId === id ? null : state.selectedId,
            dirty: true,
            undo: snapshot(state, `Removed ${pin?.name || "Unnamed pin"}`),
          };
        });
        schedulePlan();
      },

      // A pin dragged on the map to `latitude, longitude`, snapped back onto the track within
      // `radius_m`. Where the route passes there more than once, the pass nearest the pin's
      // place along the route: a drag is a nudge, not a jump to the other side of the loop.
      async movePin(id, { latitude, longitude, radius_m }) {
        if (get().status !== "ready") return;
        const mine = generation;
        try {
          const candidates = await worker().snap(latitude, longitude, radius_m);
          if (mine !== generation) return;
          const pin = get().pins.find((other) => other.id === id);
          if (!pin) return;
          if (candidates.length === 0) {
            set({ notice: "Dropped off the route: the pin stays where it was." });
            return;
          }
          const away = (candidate) => Math.abs(candidate.distance_m - pin.distance_m);
          const nearest = candidates.reduce((best, other) =>
            away(other) < away(best) ? other : best,
          );
          set((state) => ({
            pins: checkpointUpdate(state.pins, id, {}, nearest),
            selectedId: id,
            pending: null,
            notice: null,
            dirty: true,
            undo: snapshot(state, `Moved ${pin.name || "Unnamed pin"}`),
          }));
          schedulePlan();
        } catch (err) {
          if (mine === generation) set({ notice: err.message });
        }
      },

      // Puts back the pins as they were before the last removal or move.
      undoLast() {
        const { undo } = get();
        if (!undo) return;
        set({
          pins: undo.pins,
          selectedId: undo.selectedId,
          pending: null,
          notice: null,
          dirty: true,
          undo: null,
        });
        schedulePlan();
      },

      // ── Checkpoints by value (an import, an agent), not by click ─────────────────────────
      // Each takes plain input (see gpx/checkpoints.js) and resolves to { ok: true, pin } or
      // { ok: false, error }: a bad row or tool call is reported, never thrown.

      listCheckpoints() {
        const { pins, timeZone, geometry, status } = get();
        // An empty list would read as a route without checkpoints, not as no route at all.
        if (status !== "ready") return { ok: false, error: NO_GPX };
        return {
          ok: true,
          route_distance_m: Math.round(geometry.distance_m),
          timeZone,
          checkpoints: checkpointsDescribe(pins, timeZone),
        };
      },

      // The pins and the plan of exactly these pins: an edit still waiting for its plan is
      // planned now, not reviewed against the plan before it.
      async reviewPlan() {
        if (get().status !== "ready") return { ok: false, error: NO_GPX };
        await schedulePlan({ immediate: true });
        return planReview(get());
      },

      async addCheckpoint(input) {
        return change(input, { placeRequired: true }, (pins, fields, candidate) =>
          checkpointAdd(pins, candidate, fields, pinId()),
        );
      },

      async updateCheckpoint(id, input) {
        if (!get().pins.some((pin) => pin.id === id)) {
          return { ok: false, error: `No checkpoint "${id}".` };
        }
        return change(
          input,
          { placeRequired: false },
          (pins, fields, candidate) => ({
            pins: checkpointUpdate(pins, id, fields, candidate),
            pin: null,
          }),
          id,
        );
      },

      removeCheckpoint(id) {
        if (!get().pins.some((pin) => pin.id === id)) {
          return { ok: false, error: `No checkpoint "${id}".` };
        }
        get().removePin(id);
        return { ok: true };
      },

      // A fresh start on a file whose waypoints are not ours (last year's barriers): the export
      // writes the pins in place of every <wpt>, so no pins is the file without waypoints.
      clearPins() {
        const count = get().pins.length;
        set((state) => ({
          pins: [],
          selectedId: null,
          pending: null,
          notice: null,
          dirty: true,
          undo: snapshot(state, count === 1 ? "Removed the pin" : `Removed ${count} pins`),
        }));
        return schedulePlan({ immediate: true });
      },

      setPace(pace_base_s_per_km) {
        if (!(pace_base_s_per_km > 0)) return;
        set((state) => ({ settings: { ...state.settings, pace_base_s_per_km } }));
        schedulePlan();
      },

      // The edited file: the loaded one with its waypoints replaced by the pins, written by
      // gpxz. Throws what Zig refuses (a pin outside the world, pins out of route order).
      // `markSaved` clears the unsaved mark, if no edit came in meanwhile: only for a save
      // the person clicked. A download the page starts on its own may be blocked unseen.
      async exportFile({ markSaved = false } = {}) {
        const { pins, timeZone } = get();
        // Each time with its offset, so the file says what clock the race runs on.
        const bytes = await worker().exportGpx(pinsWithOffsets(pins, timeZone));
        if (markSaved && get().pins === pins) set({ dirty: false });
        return { name: editedFileName(get().fileName), bytes };
      },
    };
  };

  // why: persist + devtools as Terminus. partialize keeps the file and the pins out of
  // storage; devtools is on in development only (Vitest runs as MODE "test").
  return create(
    devtools(
      persist(creator, {
        name: STORAGE_KEY,
        storage,
        partialize: persisted,
        merge: mergePersisted,
      }),
      { name: "Waymark Store", enabled: import.meta.env.MODE === "development" },
    ),
  );
};

const useStore = createStore();

export default useStore;
