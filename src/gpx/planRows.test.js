import { describe, expect, it } from "vitest";

import { marginTier, planEntriesByPin, shownMargin } from "./planRows.js";

const pin = (id, name, type_name) => ({ id, name, type_name });
const entry = (name, type_name, margin_s = null) => ({ name, type_name, margin_s });

describe("planEntriesByPin", () => {
  it("pairs typed pins with plan entries in route order", () => {
    const pins = [
      pin("a", "Start", "Start"),
      pin("b", "Col", null),
      pin("c", "Refuge", "LifeBase"),
    ];
    const plan = { plan: [entry("Start", "Start"), entry("Refuge", "LifeBase")] };
    const byPin = planEntriesByPin(pins, plan);
    expect(byPin.get("a").name).toBe("Start");
    expect(byPin.has("b")).toBe(false);
    expect(byPin.get("c").name).toBe("Refuge");
  });

  it("leaves a pin the stale plan does not know yet without an entry", () => {
    const pins = [
      pin("a", "Start", "Start"),
      pin("n", "New", "TimeBarrier"),
      pin("f", "Finish", "Arrival"),
    ];
    const plan = { plan: [entry("Start", "Start"), entry("Finish", "Arrival")] };
    const byPin = planEntriesByPin(pins, plan);
    expect(byPin.has("n")).toBe(false);
    expect(byPin.get("f").name).toBe("Finish");
  });

  it("skips entries whose pin was removed", () => {
    const pins = [pin("a", "Start", "Start"), pin("f", "Finish", "Arrival")];
    const plan = {
      plan: [entry("Start", "Start"), entry("Gone", "TimeBarrier"), entry("Finish", "Arrival")],
    };
    expect(planEntriesByPin(pins, plan).get("f").name).toBe("Finish");
  });

  it("keeps a renamed pin's entry while the plan recomputes", () => {
    const pins = [pin("a", "Start", "Start"), pin("c", "Refuge du Mi", "LifeBase")];
    const plan = { plan: [entry("Start", "Start"), entry("Refuge", "LifeBase")] };
    expect(planEntriesByPin(pins, plan).get("c").name).toBe("Refuge");
  });

  it("is empty without a plan", () => {
    expect(planEntriesByPin([pin("a", "Start", "Start")], null).size).toBe(0);
  });
});

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
  const at = (hh, mm, ss = 0) => 1_800_000_000 + hh * 3600 + mm * 60 + ss;

  it("counts minutes as the row's clocks show them", () => {
    const entry = {
      epoch_s_arrival: at(1, 59, 20),
      stop_s: 0,
      epoch_s_cutoff: at(2, 0),
      margin_s: 40,
    };
    expect(shownMargin(entry)).toBe(60);
  });

  it("includes the planned stop", () => {
    const entry = {
      epoch_s_arrival: at(5, 39),
      stop_s: 14 * 60,
      epoch_s_cutoff: at(6, 0),
      margin_s: 420,
    };
    expect(shownMargin(entry)).toBe(420);
  });

  it("never shows a missed cutoff as zero", () => {
    const entry = {
      epoch_s_arrival: at(2, 0, 10),
      stop_s: 0,
      epoch_s_cutoff: at(2, 0),
      margin_s: -10,
    };
    expect(shownMargin(entry)).toBe(-60);
  });

  it("is null without a margin", () => {
    expect(
      shownMargin({ epoch_s_arrival: null, stop_s: 0, epoch_s_cutoff: null, margin_s: null }),
    ).toBeNull();
  });
});
