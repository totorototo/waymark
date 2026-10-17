import { describe, expect, it } from "vitest";

import { marginTier, shownMargin } from "./planRows.js";

describe("marginTier", () => {
  it("is OK at 1h or more, Tight under, Over past the cutoff", () => {
    expect(marginTier(3600)).toBe("ok");
    expect(marginTier(3599)).toBe("tight");
    expect(marginTier(0)).toBe("tight");
    expect(marginTier(-1)).toBe("over");
  });

  it("is null without a margin", () => {
    expect(marginTier(null)).toBeNull();
    expect(marginTier(undefined)).toBeNull();
  });
});

describe("shownMargin", () => {
  it("is gpxz's plan margin", () => {
    expect(shownMargin({ epoch_s_cutoff: 1, margin_s: 3480 })).toBe(3480);
  });

  it("never lets a missed cutoff round to zero", () => {
    expect(shownMargin({ epoch_s_cutoff: 1, margin_s: -10 })).toBe(-60);
    expect(shownMargin({ epoch_s_cutoff: 1, margin_s: -1380 })).toBe(-1380);
  });

  it("is null without a cutoff or a margin", () => {
    expect(shownMargin({ epoch_s_cutoff: null, margin_s: null })).toBeNull();
    expect(shownMargin({ epoch_s_cutoff: 1, margin_s: null })).toBeNull();
  });
});
