import { describe, expect, it } from "vitest";

import {
  defaultName,
  followStartTime,
  insertPin,
  pinFromCandidate,
  pinFromWaypoint,
  startTime,
  validatePins,
} from "./pins.js";

const pin = (overrides = {}) => ({
  id: "p",
  latitude: 42,
  longitude: 0,
  elevation_m: 1000,
  name: "Somewhere",
  type_name: "TimeBarrier",
  epoch_s: 1000,
  stop_s: null,
  description: null,
  comment: null,
  symbol: null,
  distance_m: 0,
  ...overrides,
});

describe("pinFromWaypoint", () => {
  it("takes gpxz's waypoint as it is, with nulls for what is missing", () => {
    const result = pinFromWaypoint(
      { latitude: 1, longitude: 2, name: "A", distance_m: 5, offset_m: 3 },
      "pin-1",
    );
    expect(result).toEqual({
      id: "pin-1",
      latitude: 1,
      longitude: 2,
      elevation_m: null,
      name: "A",
      type_name: null,
      epoch_s: null,
      stop_s: null,
      description: null,
      comment: null,
      symbol: null,
      distance_m: 5,
    });
  });
});

describe("pinFromCandidate", () => {
  it("makes a time barrier without a cutoff", () => {
    const result = pinFromCandidate(
      { latitude: 1, longitude: 2, elevation_m: 30, distance_m: 4000, offset_m: 6 },
      "pin-2",
    );
    expect(result).toMatchObject({ id: "pin-2", type_name: "TimeBarrier", epoch_s: null });
    expect(result.distance_m).toBe(4000);
    expect(result).not.toHaveProperty("offset_m");
  });
});

describe("insertPin", () => {
  const pins = [pin({ id: "a", distance_m: 0 }), pin({ id: "b", distance_m: 100 })];

  it("keeps route order", () => {
    expect(insertPin(pins, pin({ id: "n", distance_m: 50 })).map((p) => p.id)).toEqual([
      "a",
      "n",
      "b",
    ]);
    expect(insertPin(pins, pin({ id: "n", distance_m: -1 })).map((p) => p.id)[0]).toBe("n");
    expect(insertPin(pins, pin({ id: "n", distance_m: 500 })).map((p) => p.id)[2]).toBe("n");
  });

  it("puts a pin after the ones already on its spot", () => {
    expect(insertPin(pins, pin({ id: "n", distance_m: 100 })).map((p) => p.id)).toEqual([
      "a",
      "b",
      "n",
    ]);
  });

  it("does not change the list it is given", () => {
    insertPin(pins, pin({ id: "n", distance_m: 50 }));
    expect(pins).toHaveLength(2);
  });

  it("starts a list", () => {
    expect(insertPin([], pin({ id: "n" }))).toHaveLength(1);
  });
});

describe("defaultName", () => {
  it("names the ends", () => {
    expect(defaultName("Start", [])).toBe("Start");
    expect(defaultName("Arrival", [])).toBe("Finish");
  });

  it("numbers the others, skipping the names taken", () => {
    expect(defaultName("TimeBarrier", [])).toBe("Checkpoint 1");
    expect(defaultName("TimeBarrier", [pin({ name: "Checkpoint 1" })])).toBe("Checkpoint 2");
    expect(
      defaultName("TimeBarrier", [pin({ name: "Checkpoint 1" }), pin({ name: "Checkpoint 3" })]),
    ).toBe("Checkpoint 2");
    expect(defaultName("LifeBase", [])).toBe("Life base 1");
  });
});

describe("followStartTime", () => {
  const pins = () => [
    pin({ id: "s", type_name: "Start", epoch_s: 0 }),
    pin({ id: "b", type_name: "TimeBarrier", epoch_s: null }),
    pin({ id: "l", type_name: "LifeBase", epoch_s: 0 }),
    pin({ id: "a", type_name: "Arrival", epoch_s: 900 }),
    pin({ id: "x", type_name: null, epoch_s: null }),
  ];

  it("gives the Start's time to the checkpoints with none or the old one, not to landmarks", () => {
    const moved = followStartTime(pins(), 0, 3600);
    expect(moved.map((p) => p.epoch_s)).toEqual([0, 3600, 3600, 900, null]);
  });

  it("empties the prefilled cutoffs when the Start's time is cleared", () => {
    expect(followStartTime(pins(), 0, null).map((p) => p.epoch_s)).toEqual([
      0,
      null,
      null,
      900,
      null,
    ]);
  });

  it("finds the Start's time", () => {
    expect(startTime(pins())).toBe(0);
    expect(startTime([pin()])).toBeNull();
  });
});

describe("validatePins", () => {
  const good = () => [
    pin({ id: "s", name: "Start", type_name: "Start", epoch_s: 0, distance_m: 0 }),
    pin({ id: "m", name: "Mid", type_name: "TimeBarrier", epoch_s: 100, distance_m: 10 }),
    pin({ id: "f", name: "Finish", type_name: "Arrival", epoch_s: 200, distance_m: 20 }),
  ];

  it("has nothing to say about a sound plan", () => {
    expect(validatePins(good())).toEqual([]);
  });

  it("asks for a first pin", () => {
    const issues = validatePins([]);
    expect(issues).toHaveLength(1);
    expect(issues[0].level).toBe("warning");
  });

  it("warns without a Start or an Arrival", () => {
    const messages = validatePins([good()[1]]).map((issue) => issue.message);
    expect(messages.some((m) => m.includes("No Start"))).toBe(true);
    expect(messages.some((m) => m.includes("No Arrival"))).toBe(true);
  });

  it("warns about a second Start or Arrival, on the second", () => {
    const pins = good();
    pins.splice(1, 0, pin({ id: "s2", name: "Start 2", type_name: "Start", epoch_s: 50 }));
    expect(validatePins(pins).find((issue) => issue.message === "More than one Start.").pinId).toBe(
      "s2",
    );
  });

  it("warns when the ends are not at the ends of the route", () => {
    const pins = good();
    [pins[0], pins[1]] = [pins[1], pins[0]];
    expect(validatePins(pins).some((i) => i.message.includes("not the Start"))).toBe(true);
    const other = good();
    [other[1], other[2]] = [other[2], other[1]];
    expect(validatePins(other).some((i) => i.message.includes("not the Arrival"))).toBe(true);
  });

  it("flags a missing name, Start time and cutoff", () => {
    const pins = good();
    pins[0].epoch_s = null;
    pins[1].epoch_s = null;
    pins[2].name = "  ";
    const messages = validatePins(pins).map((issue) => issue.message);
    expect(messages).toContain("Start: the Start has no time.");
    expect(messages).toContain("Mid: a time barrier has no cutoff.");
    expect(messages).toContain("A pin has no name.");
  });

  it("calls a cutoff before the previous one an error", () => {
    const pins = good();
    pins[1].epoch_s = 300;
    const issue = validatePins(pins).find((i) => i.level === "error");
    expect(issue.pinId).toBe("f");
    expect(issue.message).toBe("Finish: the cutoff is before Mid's.");
  });

  it("compares cutoffs across a pin that has none", () => {
    const pins = good();
    pins[1].epoch_s = null;
    pins[2].epoch_s = -5;
    expect(validatePins(pins).some((i) => i.level === "error")).toBe(true);
  });

  it("warns about a cutoff still at the Start's time", () => {
    const pins = good();
    pins[1].epoch_s = 0;
    expect(validatePins(pins)).toContainEqual({
      level: "warning",
      pinId: "m",
      message: "Mid: the cutoff is still the Start's time.",
    });
  });

  it("lets two pins share a cutoff", () => {
    const pins = good();
    pins[2].epoch_s = 100;
    expect(validatePins(pins).filter((i) => i.level === "error")).toEqual([]);
  });
});
