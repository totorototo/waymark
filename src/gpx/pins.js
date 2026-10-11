// The waypoints being edited ("pins"), as the store keeps them.
//
// A pin is a waypoint of the file plus an id and where it sits along the route:
//   { id, latitude, longitude, elevation_m, name, type_name, epoch_s, stop_s,
//     description, comment, symbol, distance_m }
// Field names are gpxz's (see zig/waymark.zig), so a waypoint it reports is a pin as it is.
//
// The pins are kept in route order, because gpxz matches the waypoints to the track in file
// order, each after the previous one: the order of the file is part of its meaning.

// The `<type>` values gpxz builds sections and stages from. "" is a waypoint with no type: it
// is a landmark, not a checkpoint, and no section ends there.
export const WAYPOINT_TYPES = ["Start", "TimeBarrier", "LifeBase", "Arrival"];

export const TYPE_LABELS = {
  Start: "Start",
  TimeBarrier: "Time barrier",
  LifeBase: "Life base",
  Arrival: "Arrival",
};

export function pinFromWaypoint(waypoint, id) {
  return {
    id,
    latitude: waypoint.latitude,
    longitude: waypoint.longitude,
    elevation_m: waypoint.elevation_m ?? null,
    name: waypoint.name ?? "",
    type_name: waypoint.type_name ?? null,
    epoch_s: waypoint.epoch_s ?? null,
    stop_s: waypoint.stop_s ?? null,
    description: waypoint.description ?? null,
    comment: waypoint.comment ?? null,
    symbol: waypoint.symbol ?? null,
    distance_m: waypoint.distance_m,
  };
}

// A candidate is a place on the track that a click landed on (zig/waymark.zig `snapCandidates`).
export function pinFromCandidate(candidate, id, { type_name = "TimeBarrier", name = "" } = {}) {
  return {
    id,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    elevation_m: candidate.elevation_m,
    name,
    type_name,
    epoch_s: null,
    stop_s: null,
    description: null,
    comment: null,
    symbol: null,
    distance_m: candidate.distance_m,
  };
}

// Returns the pins with `pin` added at its place along the route: after any pin at the same
// distance, so two pins on one spot (a col, then the same col on the way back) keep the order
// they were added in.
export function insertPin(pins, pin) {
  const index = pins.findIndex((other) => other.distance_m > pin.distance_m);
  if (index === -1) return [...pins, pin];
  return [...pins.slice(0, index), pin, ...pins.slice(index)];
}

// The checkpoints (typed, not the Start) that take the Start's time as a first cutoff.
const takesStartTime = (pin) => pin.type_name !== null && pin.type_name !== "Start";

// Returns the pins once the Start's time goes from `before` to `after`: each checkpoint with
// no cutoff, or one still at the old Start time (prefilled, not yet set), takes the new one.
// why: the race day and the hour are typed once; on each checkpoint only the time changes.
export function followStartTime(pins, before, after) {
  return pins.map((pin) =>
    takesStartTime(pin) && (pin.epoch_s === null || pin.epoch_s === before)
      ? { ...pin, epoch_s: after }
      : pin,
  );
}

// The Start's time, or null when there is no Start or it has no time.
export function startTime(pins) {
  return pins.find((pin) => pin.type_name === "Start")?.epoch_s ?? null;
}

// A short default name for a pin the person hasn't named: "Start", "Finish", or the next
// free "Checkpoint N".
export function defaultName(type_name, pins) {
  if (type_name === "Start") return "Start";
  if (type_name === "Arrival") return "Finish";
  const taken = new Set(pins.map((pin) => pin.name));
  const prefix = type_name === "LifeBase" ? "Life base" : "Checkpoint";
  for (let number = 1; number <= pins.length + 1; number += 1) {
    const name = `${prefix} ${number}`;
    if (!taken.has(name)) return name;
  }
  return prefix;
}

// What is wrong, or likely wrong, with the pins as a race plan. The export never refuses:
// the director's file may be half way done, and gpxz tolerates what it can. Each issue is
// { level: "error" | "warning", pinId: string | null, message }.
// "error" is for what no plan can mean (a cutoff before the previous one); "warning" for
// what gpxz needs to build a plan, or what is probably forgotten.
export function validatePins(pins) {
  const issues = [];
  const add = (level, pinId, message) => issues.push({ level, pinId, message });

  if (pins.length === 0) {
    add("warning", null, "No checkpoints yet: click the route to add the first.");
    return issues;
  }

  const starts = pins.filter((pin) => pin.type_name === "Start");
  const arrivals = pins.filter((pin) => pin.type_name === "Arrival");
  if (starts.length === 0) add("warning", null, "No Start: gpxz needs one to date the plan.");
  if (starts.length > 1) add("warning", starts[1].id, "More than one Start.");
  if (arrivals.length === 0) add("warning", null, "No Arrival.");
  if (arrivals.length > 1) add("warning", arrivals[1].id, "More than one Arrival.");
  if (starts.length > 0 && pins[0].type_name !== "Start") {
    add("warning", pins[0].id, "The first pin along the route is not the Start.");
  }
  if (arrivals.length > 0 && pins[pins.length - 1].type_name !== "Arrival") {
    add("warning", pins[pins.length - 1].id, "The last pin along the route is not the Arrival.");
  }

  const start = startTime(pins);
  let previous = null;
  for (const pin of pins) {
    const label = pin.name || "Unnamed pin";
    if (!pin.name.trim()) add("warning", pin.id, "A pin has no name.");
    if (pin.type_name === "Start" && pin.epoch_s === null) {
      add("warning", pin.id, `${label}: the Start has no time.`);
    }
    if (pin.type_name === "TimeBarrier" && pin.epoch_s === null) {
      add("warning", pin.id, `${label}: a time barrier has no cutoff.`);
    }
    if (start !== null && takesStartTime(pin) && pin.epoch_s === start) {
      add("warning", pin.id, `${label}: the cutoff is still the Start's time.`);
    }
    if (pin.epoch_s !== null) {
      if (previous && pin.epoch_s < previous.epoch_s) {
        add(
          "error",
          pin.id,
          `${label}: the cutoff is before ${previous.name || "the previous"}'s.`,
        );
      }
      previous = pin;
    }
  }
  return issues;
}
