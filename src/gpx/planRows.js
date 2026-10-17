// The plan, row by row: which plan entry belongs to which pin, and the badge its margin earns.

// gpxz plans one entry per typed pin, in route order (every typed waypoint bounds a section).
// While a new plan is computing the last one is stale. With as many entries as typed pins,
// the plan was built from the same pins, edited or not: pair them by position, so renaming a
// pin while typing keeps its figures. Otherwise a pin was added or removed since: pair an
// entry only when its name and type match, looking ahead past entries whose pin has gone; a
// pin the plan does not know yet gets no figures.
export function planEntriesByPin(pins, plan) {
  const entries = plan?.plan ?? [];
  const typed = pins.filter((pin) => pin.type_name);
  const byPin = new Map();
  if (typed.length === entries.length) {
    typed.forEach((pin, index) => byPin.set(pin.id, entries[index]));
    return byPin;
  }
  let cursor = 0;
  for (const pin of typed) {
    const found = entries.findIndex(
      (entry, index) =>
        index >= cursor && entry.name === pin.name && entry.type_name === pin.type_name,
    );
    if (found === -1) continue;
    byPin.set(pin.id, entries[found]);
    cursor = found + 1;
  }
  return byPin;
}

// One vocabulary in every Trail Suite app (the design system's Status badge): the margin to the
// cutoff, 1h or more is OK, under 1h Tight, past it Over. Null without a margin.
const TIGHT_S = 3600;

export const BADGE_LABELS = { ok: "OK", tight: "Tight", over: "Over" };

export function marginTier(marginSeconds) {
  if (marginSeconds === null || !Number.isFinite(marginSeconds)) return null;
  if (marginSeconds < 0) return "over";
  return marginSeconds < TIGHT_S ? "tight" : "ok";
}

// The margin the row prints, in seconds: the cutoff minus the planned departure, both cut to
// the minute as the row's clocks are, so 01:59 against 02:00 reads 0h01, not a rounded 0h00.
// The sign stays gpxz's: a departure seconds past the cutoff is never shown as 0h00.
export function shownMargin(entry) {
  if (entry.margin_s === null || entry.epoch_s_cutoff === null) return null;
  if (entry.epoch_s_arrival === null) return entry.margin_s;
  const departure = entry.epoch_s_arrival + (entry.stop_s ?? 0);
  const minutes = Math.floor(entry.epoch_s_cutoff / 60) - Math.floor(departure / 60);
  if (entry.margin_s < 0 && minutes >= 0) return -60;
  return minutes * 60;
}
