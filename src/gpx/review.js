// The plan as a reader outside the page gets it: what the Plan panel shows, in words and
// numbers, so an agent can check its work before handing the export to the person.

import { validatePins } from "./pins.js";
import { epochToZoned } from "./time.js";

// How fast a section has to be run to make its cutoff, in s/km; null with no cutoff.
export function slowestPace(section) {
  if (!(section.duration_s_cutoff > 0) || !(section.distance_m > 0)) return null;
  return section.duration_s_cutoff / (section.distance_m / 1000);
}

const minutes = (seconds) => (Number.isFinite(seconds) ? Math.round(seconds / 60) : null);
const zoned = (epoch_s, timeZone) =>
  Number.isFinite(epoch_s) ? epochToZoned(epoch_s, timeZone) : null;

// The review of `pins` and the plan gpxz built from them (null if it could not, with
// `planError`). `ready` is false while anything stops the file from meaning a race plan:
// an error-level issue, or no plan at all. Warnings are reported but do not block, as in
// the panel: the export never refuses.
export function planReview({ pins, plan, planError, settings, timeZone }) {
  const names = new Map(pins.map((pin) => [pin.id, pin.name]));
  const issues = validatePins(pins).map(({ level, pinId, message }) => ({
    level,
    checkpoint: pinId ? names.get(pinId) || null : null,
    message,
  }));

  const entries = plan?.plan ?? [];
  // A cutoff the estimate misses is the panel's red row: at this pace, the runner is late.
  for (const entry of entries) {
    if (entry.margin_s !== null && entry.margin_s < 0) {
      issues.push({
        level: "warning",
        checkpoint: entry.name,
        message: `${entry.name}: at this pace, the runner leaves ${-minutes(entry.margin_s)} min after the cutoff.`,
      });
    }
  }
  if (planError)
    issues.push({ level: "error", checkpoint: null, message: `No plan: ${planError}` });

  const ready = plan !== null && !issues.some((issue) => issue.level === "error");
  return {
    ok: true,
    ready,
    timeZone,
    pace_s_per_km: settings.pace_base_s_per_km,
    issues,
    checkpoints: entries.map((entry) => ({
      name: entry.name,
      type_name: entry.type_name,
      distance_m: Math.round(entry.distance_m),
      estimated: zoned(entry.epoch_s_arrival, timeZone),
      cutoff: zoned(entry.epoch_s_cutoff, timeZone),
      margin_min: minutes(entry.margin_s),
    })),
    sections: (plan?.sections ?? []).map((section) => ({
      from: section.location_start,
      to: section.location_end,
      distance_m: Math.round(section.distance_m),
      elevation_gain_m: Math.round(section.elevation_gain_m),
      allowed_min: minutes(section.duration_s_cutoff),
      pace_to_make_it_s_per_km: slowestPace(section) && Math.round(slowestPace(section)),
    })),
    next: ready
      ? "Ready: ask the person to check the plan and click Export GPX. No tool exports."
      : "Not ready: fix the errors above (update_checkpoint), then review again.",
  };
}
