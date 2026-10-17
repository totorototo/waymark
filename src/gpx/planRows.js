// The plan, row by row: the spare each checkpoint shows and the tier it falls in.

// One vocabulary in every Trail Suite app (the design system's Status badge): the margin to the
// cutoff, 1h or more is OK, under 1h Tight, past it Over. Null without a margin.
const TIGHT_S = 3600;

export function marginTier(marginSeconds) {
  if (marginSeconds === null || !Number.isFinite(marginSeconds)) return null;
  if (marginSeconds < 0) return "over";
  return marginSeconds < TIGHT_S ? "tight" : "ok";
}

// The spare a checkpoint prints, in seconds: gpxz's plan margin (the cutoff minus the planned
// arrival and stop). Its departure is not printed, so it is not recounted on clock minutes:
// the table, the summary line and review_plan all read this one figure. A departure seconds
// past the cutoff would round to "0h00", so a missed cutoff reads at least a minute over.
export function shownMargin(entry) {
  if (entry.margin_s === null || entry.epoch_s_cutoff === null) return null;
  if (entry.margin_s < 0 && entry.margin_s > -30) return -60;
  return entry.margin_s;
}
