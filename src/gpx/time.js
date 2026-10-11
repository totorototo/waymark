// Cutoffs live in the file as UTC (`2026-08-21T03:00:00Z`, as in the director's files), but a
// person thinks of them on the race's clock. These convert between the two for one IANA time
// zone, with Intl only (no date library).

const FORMATTERS = new Map();

function formatterFor(timeZone) {
  let formatter = FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

function partsAt(epochMs, timeZone) {
  const parts = formatterFor(timeZone).formatToParts(new Date(epochMs));
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

// How far the zone's clock is ahead of UTC at that instant, in ms.
function offsetMs(epochMs, timeZone) {
  const { year, month, day, hour, minute, second } = partsAt(epochMs, timeZone);
  const clockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return clockAsUtc - Math.floor(epochMs / 1000) * 1000;
}

const pad = (number, width = 2) => String(number).padStart(width, "0");

export function isValidTimeZone(timeZone) {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 3600 * 1000;

// "2026-08-21T05:00" on the Paris clock → 1787281200 (epoch seconds), or null when the text
// isn't a local date and time.
// why two offsets: a clock time maps to an instant through the zone's offset, which itself
// depends on the instant. A day either side of the time gives the two offsets that can
// apply across a daylight-saving change; the one that holds when applied is the answer. A
// time the change repeats (02:30 when 03:00 falls back to 02:00) has two, and the first is
// taken. A time it skips (02:30 when 02:00 jumps to 03:00) has none, and lands an hour
// later, as a clock would show it.
export function zonedToEpoch(local, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local ?? "");
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  if (Number.isNaN(asUtc)) return null;
  // Date.UTC rolls 02-30 over to 03-02: such a date was not what the person typed.
  const check = new Date(asUtc);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  const offsetBefore = offsetMs(asUtc - DAY_MS, timeZone);
  const offsetAfter = offsetMs(asUtc + DAY_MS, timeZone);
  const holds = [...new Set([offsetBefore, offsetAfter])]
    .map((offset) => ({ offset, epochMs: asUtc - offset }))
    .filter(({ offset, epochMs }) => offsetMs(epochMs, timeZone) === offset)
    .map(({ epochMs }) => epochMs);
  const epochMs = holds.length > 0 ? Math.min(...holds) : asUtc - offsetBefore;
  return Math.floor(epochMs / 1000);
}

// 1787281200 → "2026-08-21T05:00" on the Paris clock: what <input type="datetime-local"> takes.
export function epochToZoned(epochSeconds, timeZone) {
  if (!Number.isFinite(epochSeconds)) return "";
  const { year, month, day, hour, minute } = partsAt(epochSeconds * 1000, timeZone);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

// 1787281200 → "2026-08-21T03:00:00Z": the form the GPX files use.
export function epochToUtc(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) return "";
  return new Date(epochSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// The zones the browser knows, for a picker; a short list when it can't say.
export function timeZones() {
  if (typeof Intl.supportedValuesOf === "function") return Intl.supportedValuesOf("timeZone");
  return ["UTC", "Europe/Paris", "Europe/London", "America/New_York", "America/Denver"];
}

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
