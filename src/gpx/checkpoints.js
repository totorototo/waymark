// Operations on the pins for callers that are not a click: an import, an agent. Each takes
// plain input, checks it, and says what is wrong in words instead of throwing, so a caller
// can report a bad row or a bad tool call and carry on.
//
// Input uses gpxz's field names, as the pins do (see pins.js), plus two conveniences:
//   { distance_m | latitude + longitude,      where along the route
//     name, type_name, stop_s, description,
//     epoch_s | cutoff }                       cutoff: "2026-08-21T05:00" on the race's clock
// why one module for every caller: the click UI, an import and an agent then share the
// rules (route order, default names, the Start's time) instead of each re-deriving them.

import {
  defaultName,
  followStartTime,
  insertPin,
  pinFromCandidate,
  startTime,
  TYPE_LABELS,
  WAYPOINT_TYPES,
} from "./pins.js";
import { epochToZoned, zonedToEpoch } from "./time.js";

// What a type is called in a spreadsheet or by a person, lower case and without spaces: the
// gpxz name, its label, and "finish".
const TYPE_ALIASES = new Map([
  ...WAYPOINT_TYPES.map((type) => [type.toLowerCase(), type]),
  ...Object.entries(TYPE_LABELS).map(([type, label]) => [squash(label), type]),
  ["finish", "Arrival"],
  ["landmark", null],
  ["none", null],
]);

function squash(text) {
  return text.toLowerCase().replace(/[\s_-]+/g, "");
}

const has = (input, key) => input[key] !== undefined;

// "LifeBase", "life base", "Finish" → the gpxz type; null for a landmark; undefined if unknown.
export function typeFromText(text) {
  if (text === null) return null;
  if (typeof text !== "string") return undefined;
  return TYPE_ALIASES.get(squash(text));
}

// A cutoff as typed: epoch seconds, or text. Text with a zone (Z or +02:00) is an instant;
// without one it is on the race's clock. "2026-08-21 05:00" is read as "2026-08-21T05:00",
// as spreadsheets write it. Returns epoch seconds, null to clear, or undefined if unreadable.
export function cutoffFromInput(value, timeZone) {
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(" ", "T");
  if (/(Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const epochMs = Date.parse(text);
    return Number.isNaN(epochMs) ? undefined : Math.floor(epochMs / 1000);
  }
  return zonedToEpoch(text.slice(0, 16), timeZone) ?? undefined;
}

// Where `input` asks for a checkpoint: { distance_m } or { latitude, longitude }, null when
// it gives neither, or { error }.
export function placeFromInput(input) {
  const byDistance = has(input, "distance_m");
  const byCoordinates = has(input, "latitude") || has(input, "longitude");
  if (byDistance && byCoordinates) {
    return { error: "Give a distance or coordinates, not both." };
  }
  if (byDistance) {
    const { distance_m } = input;
    if (!(Number.isFinite(distance_m) && distance_m >= 0)) {
      return { error: `Distance ${distance_m} is not a distance along the route.` };
    }
    return { distance_m };
  }
  if (byCoordinates) {
    const { latitude, longitude } = input;
    const valid =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180;
    if (!valid) return { error: `${latitude}, ${longitude} is not a place on Earth.` };
    return { latitude, longitude };
  }
  return null;
}

// The pin fields `input` sets, checked: { fields } with only what it gives, or { errors }.
export function fieldsFromInput(input, { timeZone }) {
  const fields = {};
  const errors = [];
  if (has(input, "name")) {
    if (typeof input.name === "string") fields.name = input.name.trim();
    else errors.push("The name must be text.");
  }
  if (has(input, "type_name")) {
    const type_name = typeFromText(input.type_name);
    if (type_name === undefined) {
      errors.push(`Unknown type "${input.type_name}": use one of ${WAYPOINT_TYPES.join(", ")}.`);
    } else {
      fields.type_name = type_name;
    }
  }
  if (has(input, "epoch_s") && has(input, "cutoff")) {
    errors.push("Give epoch_s or cutoff, not both.");
  } else if (has(input, "epoch_s") || has(input, "cutoff")) {
    const value = has(input, "epoch_s") ? input.epoch_s : input.cutoff;
    const epoch_s = cutoffFromInput(value, timeZone);
    if (epoch_s === undefined) errors.push(`Unreadable cutoff "${value}".`);
    else fields.epoch_s = epoch_s;
  }
  if (has(input, "stop_s")) {
    const { stop_s } = input;
    if (stop_s === null || (Number.isInteger(stop_s) && stop_s >= 0)) fields.stop_s = stop_s;
    else errors.push("The stop must be a whole number of seconds.");
  }
  if (has(input, "description")) {
    if (input.description === null || typeof input.description === "string") {
      fields.description = input.description || null;
    } else {
      errors.push("The description must be text.");
    }
  }
  return errors.length > 0 ? { errors } : { fields };
}

// Returns the pins once the Start's time may have moved from `before`: see followStartTime.
function withStartTime(pins, before) {
  const after = startTime(pins);
  return after === before ? pins : followStartTime(pins, before, after);
}

// Returns { pins, pin }: a pin at `candidate` (a place on the track, as snapCandidates and
// pointAtDistance report it) with `fields`, at its place along the route. What `fields` does
// not set takes the click's defaults: the first pin is the Start, the others time barriers,
// named in turn, and a checkpoint starts from the Start's time.
export function checkpointAdd(pins, candidate, fields, id) {
  const type_name = has(fields, "type_name")
    ? fields.type_name
    : pins.length === 0
      ? "Start"
      : "TimeBarrier";
  const pin = {
    ...pinFromCandidate(candidate, id, { type_name, name: defaultName(type_name, pins) }),
    epoch_s: type_name === "Start" || type_name === null ? null : startTime(pins),
    ...fields,
  };
  if (!pin.name) pin.name = defaultName(type_name, pins);
  return { pins: withStartTime(insertPin(pins, pin), startTime(pins)), pin };
}

// Returns the pins with `fields` set on pin `id`, and moved to `candidate` if one is given.
// A new Start time also goes to the checkpoints that have none, or still have the old one.
export function checkpointUpdate(pins, id, fields, candidate = null) {
  const before = startTime(pins);
  const pin = pins.find((other) => other.id === id);
  let next = { ...pin, ...fields };
  if (candidate) {
    const { latitude, longitude, elevation_m, distance_m } = candidate;
    next = { ...next, latitude, longitude, elevation_m, distance_m };
  }
  const updated = candidate
    ? insertPin(
        pins.filter((other) => other.id !== id),
        next,
      )
    : pins.map((other) => (other.id === id ? next : other));
  return withStartTime(updated, before);
}

export function checkpointRemove(pins, id) {
  return pins.filter((pin) => pin.id !== id);
}

// The pins as a caller outside the page reads them: what a person would read off the list,
// with cutoffs on the race's clock.
export function checkpointsDescribe(pins, timeZone) {
  return pins.map((pin) => ({
    id: pin.id,
    name: pin.name,
    type_name: pin.type_name,
    distance_m: Math.round(pin.distance_m),
    cutoff: pin.epoch_s === null ? null : epochToZoned(pin.epoch_s, timeZone),
    stop_s: pin.stop_s,
    description: pin.description,
  }));
}
