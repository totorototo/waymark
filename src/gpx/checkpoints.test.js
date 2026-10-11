import { describe, expect, it } from "vitest";

import {
  checkpointAdd,
  checkpointRemove,
  checkpointsDescribe,
  checkpointUpdate,
  cutoffFromInput,
  fieldsFromInput,
  placeFromInput,
  typeFromText,
} from "./checkpoints.js";

const PARIS = "Europe/Paris";
const START_S = 1787281200; // 2026-08-21T05:00 in Paris.

const candidate = (distance_m) => ({
  latitude: 42 + distance_m / 100000,
  longitude: 0,
  elevation_m: 1000,
  distance_m,
  offset_m: 0,
});

const pin = (id, distance_m, overrides = {}) => ({
  ...candidate(distance_m),
  id,
  name: id,
  type_name: "TimeBarrier",
  epoch_s: null,
  stop_s: null,
  description: null,
  comment: null,
  symbol: null,
  ...overrides,
});

describe("typeFromText", () => {
  it("reads gpxz names, labels and common words", () => {
    expect(typeFromText("LifeBase")).toBe("LifeBase");
    expect(typeFromText("life base")).toBe("LifeBase");
    expect(typeFromText("TIME_BARRIER")).toBe("TimeBarrier");
    expect(typeFromText("Finish")).toBe("Arrival");
    expect(typeFromText("landmark")).toBeNull();
    expect(typeFromText(null)).toBeNull();
    expect(typeFromText("ravito")).toBeUndefined();
    expect(typeFromText(3)).toBeUndefined();
  });
});

describe("cutoffFromInput", () => {
  it("reads a time on the race's clock, with a T or a space", () => {
    expect(cutoffFromInput("2026-08-21T05:00", PARIS)).toBe(START_S);
    expect(cutoffFromInput("2026-08-21 05:00", PARIS)).toBe(START_S);
    expect(cutoffFromInput("2026-08-21 05:00:00", PARIS)).toBe(START_S);
  });

  it("reads a time with a zone as that instant", () => {
    expect(cutoffFromInput("2026-08-21T03:00:00Z", PARIS)).toBe(START_S);
    expect(cutoffFromInput("2026-08-21T05:00+02:00", "UTC")).toBe(START_S);
  });

  it("takes epoch seconds, clears on empty, refuses the rest", () => {
    expect(cutoffFromInput(START_S, PARIS)).toBe(START_S);
    expect(cutoffFromInput("", PARIS)).toBeNull();
    expect(cutoffFromInput(null, PARIS)).toBeNull();
    expect(cutoffFromInput(1.5, PARIS)).toBeUndefined();
    expect(cutoffFromInput("14h30", PARIS)).toBeUndefined();
    expect(cutoffFromInput("2026-02-30T05:00", PARIS)).toBeUndefined();
  });
});

describe("placeFromInput", () => {
  it("is a distance or coordinates", () => {
    expect(placeFromInput({ distance_m: 1200 })).toEqual({ distance_m: 1200 });
    expect(placeFromInput({ latitude: 42, longitude: 0 })).toEqual({ latitude: 42, longitude: 0 });
    expect(placeFromInput({ name: "A" })).toBeNull();
  });

  it("says what is wrong", () => {
    expect(placeFromInput({ distance_m: 1, latitude: 42, longitude: 0 }).error).toMatch(/not both/);
    expect(placeFromInput({ distance_m: -1 }).error).toMatch(/not a distance/);
    expect(placeFromInput({ distance_m: "12" }).error).toMatch(/not a distance/);
    expect(placeFromInput({ latitude: 91, longitude: 0 }).error).toMatch(/not a place/);
    expect(placeFromInput({ latitude: 42 }).error).toMatch(/not a place/);
  });
});

describe("fieldsFromInput", () => {
  it("keeps only the fields given, checked", () => {
    const input = {
      name: "  Col  ",
      type_name: "life base",
      cutoff: "2026-08-21 05:00",
      stop_s: 600,
      description: "",
      distance_m: 5,
    };
    expect(fieldsFromInput(input, { timeZone: PARIS })).toEqual({
      fields: {
        name: "Col",
        type_name: "LifeBase",
        epoch_s: START_S,
        stop_s: 600,
        description: null,
      },
    });
    expect(fieldsFromInput({}, { timeZone: PARIS })).toEqual({ fields: {} });
  });

  it("collects every error", () => {
    const input = { name: 3, type_name: "ravito", cutoff: "soon", stop_s: -1 };
    const { errors } = fieldsFromInput(input, { timeZone: PARIS });
    expect(errors).toHaveLength(4);
    expect(errors[1]).toMatch(/Unknown type "ravito"/);
  });

  it("refuses a cutoff given twice", () => {
    const input = { epoch_s: START_S, cutoff: "2026-08-21T05:00" };
    expect(fieldsFromInput(input, { timeZone: PARIS }).errors[0]).toMatch(/not both/);
  });
});

describe("checkpointAdd", () => {
  it("makes the first pin the Start and the next ones time barriers, by default", () => {
    const first = checkpointAdd([], candidate(0), {}, "a");
    expect(first.pin).toMatchObject({ id: "a", type_name: "Start", name: "Start", epoch_s: null });
    const second = checkpointAdd(first.pins, candidate(5000), {}, "b");
    expect(second.pin).toMatchObject({ type_name: "TimeBarrier", name: "Checkpoint 1" });
  });

  it("puts the pin at its place along the route, with the fields given", () => {
    const pins = [pin("start", 0), pin("end", 9000)];
    const fields = { name: "Col", type_name: "LifeBase", stop_s: 900 };
    const { pins: next, pin: added } = checkpointAdd(pins, candidate(4000), fields, "col");
    expect(next.map((other) => other.id)).toEqual(["start", "col", "end"]);
    expect(added).toMatchObject({ name: "Col", type_name: "LifeBase", stop_s: 900 });
  });

  it("names an unnamed pin by its type", () => {
    const { pin: added } = checkpointAdd([], candidate(0), { name: "", type_name: "Arrival" }, "x");
    expect(added.name).toBe("Finish");
  });

  it("starts a checkpoint from the Start's time, unless it has its own", () => {
    const pins = [pin("start", 0, { type_name: "Start", epoch_s: START_S })];
    expect(checkpointAdd(pins, candidate(10), {}, "a").pin.epoch_s).toBe(START_S);
    const own = checkpointAdd(pins, candidate(10), { epoch_s: START_S + 60 }, "b");
    expect(own.pin.epoch_s).toBe(START_S + 60);
  });

  it("gives a new Start's time to the checkpoints that have none", () => {
    const pins = [pin("cp", 5000)];
    const fields = { type_name: "Start", epoch_s: START_S };
    const { pins: next } = checkpointAdd(pins, candidate(0), fields, "start");
    expect(next[1].epoch_s).toBe(START_S);
  });
});

describe("checkpointUpdate", () => {
  it("sets the fields and keeps the place", () => {
    const pins = [pin("a", 0), pin("b", 5000)];
    const next = checkpointUpdate(pins, "b", { name: "Col" });
    expect(next[1]).toMatchObject({ id: "b", name: "Col", distance_m: 5000 });
    expect(next[0]).toBe(pins[0]);
  });

  it("moves the pin to a new place, in route order", () => {
    const pins = [pin("a", 0), pin("b", 5000), pin("c", 9000)];
    const next = checkpointUpdate(pins, "a", {}, candidate(7000));
    expect(next.map((other) => other.id)).toEqual(["b", "a", "c"]);
    expect(next[1].latitude).toBe(candidate(7000).latitude);
  });

  it("carries a new Start time to the checkpoints", () => {
    const pins = [pin("s", 0, { type_name: "Start" }), pin("cp", 5000)];
    const next = checkpointUpdate(pins, "s", { epoch_s: START_S });
    expect(next[1].epoch_s).toBe(START_S);
  });
});

describe("checkpointRemove and checkpointsDescribe", () => {
  it("removes by id", () => {
    expect(checkpointRemove([pin("a", 0), pin("b", 1)], "a").map((p) => p.id)).toEqual(["b"]);
  });

  it("describes cutoffs on the race's clock and rounds distances", () => {
    const pins = [pin("a", 1234.6, { epoch_s: START_S }), pin("b", 2000)];
    expect(checkpointsDescribe(pins, PARIS)).toEqual([
      {
        id: "a",
        name: "a",
        type_name: "TimeBarrier",
        distance_m: 1235,
        cutoff: "2026-08-21T05:00",
        stop_s: null,
        description: null,
      },
      expect.objectContaining({ id: "b", cutoff: null }),
    ]);
  });
});
