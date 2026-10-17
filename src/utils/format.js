// How the panels write distances, durations, paces and clock times.

export function formatKm(meters) {
  if (!Number.isFinite(meters)) return "–";
  return `${(meters / 1000).toFixed(1)} km`;
}

// 5400 → "1h30"; 600 → "10 min"; negative durations keep their sign ("-1h30").
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "–";
  const sign = seconds < 0 ? "-" : "";
  const minutes = Math.round(Math.abs(seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${sign}${rest} min`;
  return `${sign}${hours}h${String(rest).padStart(2, "0")}`;
}

// 500 s/km → "8:20 /km".
export function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "–";
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")} /km`;
}

// "8:20" or "8" → 500 s/km; null when it is not a pace.
export function parsePace(text) {
  const match = /^\s*(\d{1,2})(?::([0-5]\d))?\s*$/.exec(text ?? "");
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2] ?? 0);
  return seconds > 0 ? seconds : null;
}

// An instant as "Fri 21 Aug 05:00" on the zone's clock.
export function formatClock(epochSeconds, timeZone) {
  if (!Number.isFinite(epochSeconds)) return "–";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(epochSeconds * 1000))
    .replace(",", "");
}

// An instant as "08:38" when it falls on the same day as `referenceEpoch` on the zone's clock,
// else "Sun 05:00": a race plan reads in hours, with the weekday only once it rolls over.
export function formatShortClock(epochSeconds, timeZone, referenceEpoch) {
  if (!Number.isFinite(epochSeconds)) return "–";
  const day = (epoch) =>
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(epoch * 1000));
  const sameDay = Number.isFinite(referenceEpoch) && day(epochSeconds) === day(referenceEpoch);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: sameDay ? undefined : "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(epochSeconds * 1000))
    .replace(",", "");
}

// The metres a screen pixel covers at this latitude and zoom (Web Mercator, 512 px tiles as
// Mapbox GL uses).
export function metersPerPixel(latitude, zoom) {
  return (78271.517 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

// How far from the route a click still counts as on it: about 16 px of map, within the
// snap radius gpxz accepts.
export const CLICK_RADIUS_PX = 16;
export const RADIUS_M_MIN = 5;
export const RADIUS_M_MAX = 5000;
export function clickRadius(latitude, zoom) {
  const meters = metersPerPixel(latitude, zoom) * CLICK_RADIUS_PX;
  return Math.min(RADIUS_M_MAX, Math.max(RADIUS_M_MIN, meters));
}

// A margin to a cutoff as the suite's checkpoint row writes it: 3840 → "1h04", 420 → "0h07",
// -1440 → "−0h24" (a minus sign, not a hyphen). Past 99h, "99h+": a plan that far off is a
// wrong date, and the badge already says Over.
export function formatMargin(seconds) {
  if (!Number.isFinite(seconds)) return "–";
  const minutes = Math.round(Math.abs(seconds) / 60);
  const hours = Math.floor(minutes / 60);
  const sign = seconds < 0 && minutes > 0 ? "−" : "";
  if (hours > 99) return `${sign}99h+`;
  return `${sign}${hours}h${String(minutes % 60).padStart(2, "0")}`;
}
