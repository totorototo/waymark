import { describe, expect, it } from "vitest";

import { planReview, slowestPace } from "./review.js";

const PARIS = "Europe/Paris";
const START_S = 1787281200; // 2026-08-21T05:00 in Paris.

const pin = (id, name, type_name, epoch_s, distance_m) => ({
  id,
  name,
  type_name,
  epoch_s,
  distance_m,
  latitude: 42,
  longitude: 0,
  stop_s: null,
});

const entry = (name, type_name, distance_m, arrival_s, cutoff_s, margin_s) => ({
  name,
  type_name,
  distance_m,
  epoch_s_arrival: arrival_s,
  epoch_s_cutoff: cutoff_s,
  margin_s,
});

const settings = { pace_base_s_per_km: 500 };

describe("slowestPace", () => {
  it("is the cutoff time over the distance, null without either", () => {
    expect(slowestPace({ duration_s_cutoff: 3600, distance_m: 10000 })).toBe(360);
    expect(slowestPace({ duration_s_cutoff: null, distance_m: 10000 })).toBeNull();
    expect(slowestPace({ duration_s_cutoff: 3600, distance_m: 0 })).toBeNull();
  });
});

describe("planReview", () => {
  const pins = [
    pin("a", "Start", "Start", START_S, 0),
    pin("b", "Col", "TimeBarrier", START_S + 7200, 10000),
    pin("c", "Finish", "Arrival", START_S + 14400, 20000),
  ];
  const plan = {
    sections: [
      {
        location_start: "Start",
        location_end: "Col",
        distance_m: 10000.4,
        elevation_gain_m: 812.6,
        duration_s_cutoff: 7200,
      },
    ],
    plan: [
      entry("Start", "Start", 0, START_S, START_S, 0),
      entry("Col", "TimeBarrier", 10000.4, START_S + 5000, START_S + 7200, 2200),
      entry("Finish", "Arrival", 20000, START_S + 15000, START_S + 14400, -600),
    ],
  };

  it("is ready with only warnings, and reads like the panel", () => {
    const review = planReview({ pins, plan, planError: null, settings, timeZone: PARIS });
    expect(review).toMatchObject({ ok: true, ready: true, timeZone: PARIS, pace_s_per_km: 500 });
    expect(review.checkpoints[1]).toEqual({
      name: "Col",
      type_name: "TimeBarrier",
      distance_m: 10000,
      estimated: "2026-08-21T06:23",
      cutoff: "2026-08-21T07:00",
      margin_min: 37,
    });
    expect(review.sections).toEqual([
      {
        from: "Start",
        to: "Col",
        distance_m: 10000,
        elevation_gain_m: 813,
        allowed_min: 120,
        pace_to_make_it_s_per_km: 720,
      },
    ]);
    expect(review.next).toMatch(/click Export GPX/);
  });

  it("warns about a cutoff the estimate misses", () => {
    const { issues } = planReview({ pins, plan, planError: null, settings, timeZone: PARIS });
    expect(issues).toEqual([
      {
        level: "warning",
        checkpoint: "Finish",
        message: "Finish: at this pace, the runner leaves 10 min after the cutoff.",
      },
    ]);
  });

  it("is not ready with an error, and names the checkpoint", () => {
    const late = [pins[0], { ...pins[1], epoch_s: START_S - 60 }, pins[2]];
    const review = planReview({ pins: late, plan, planError: null, settings, timeZone: PARIS });
    expect(review.ready).toBe(false);
    expect(review.issues).toContainEqual({
      level: "error",
      checkpoint: "Col",
      message: "Col: the cutoff is before Start's.",
    });
    expect(review.next).toMatch(/Not ready/);
  });

  it("is not ready without a plan", () => {
    const review = planReview({
      pins,
      plan: null,
      planError: "Pins not in route order",
      settings,
      timeZone: PARIS,
    });
    expect(review.ready).toBe(false);
    expect(review.checkpoints).toEqual([]);
    expect(review.issues).toContainEqual({
      level: "error",
      checkpoint: null,
      message: "No plan: Pins not in route order",
    });
  });
});
