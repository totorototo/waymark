import { describe, expect, it } from "vitest";

import {
  epochToUtc,
  epochToZoned,
  isValidTimeZone,
  pinsWithOffsets,
  timeZones,
  utcOffsetSeconds,
  zonedToEpoch,
} from "./time.js";

// The GRP 2026 start: 03:00Z, which is 05:00 in Paris (UTC+2 in August).
const START = Date.UTC(2026, 7, 21, 3, 0, 0) / 1000;

describe("zonedToEpoch", () => {
  it("reads a Paris summer clock time", () => {
    expect(zonedToEpoch("2026-08-21T05:00", "Europe/Paris")).toBe(START);
  });

  it("reads a Paris winter clock time (UTC+1)", () => {
    expect(zonedToEpoch("2026-01-15T05:00", "Europe/Paris")).toBe(
      Date.UTC(2026, 0, 15, 4, 0, 0) / 1000,
    );
  });

  it("is the identity in UTC", () => {
    expect(zonedToEpoch("2026-08-21T03:00", "UTC")).toBe(START);
  });

  it("handles a zone west of UTC", () => {
    expect(zonedToEpoch("2026-08-21T03:00", "America/Denver")).toBe(START + 6 * 3600);
  });

  it("puts a time the spring change skips an hour later", () => {
    // Paris, 2026-03-29: 02:00 jumps to 03:00. 02:30 does not exist.
    expect(zonedToEpoch("2026-03-29T02:30", "Europe/Paris")).toBe(
      Date.UTC(2026, 2, 29, 1, 30, 0) / 1000,
    );
  });

  it("takes the first of a time the autumn change repeats", () => {
    // Paris, 2026-10-25: 03:00 falls back to 02:00, so 02:30 happens twice. The first is
    // still summer time (UTC+2).
    expect(zonedToEpoch("2026-10-25T02:30", "Europe/Paris")).toBe(
      Date.UTC(2026, 9, 25, 0, 30, 0) / 1000,
    );
  });

  it.each([
    "",
    null,
    undefined,
    "2026-08-21",
    "2026-08-21 05:00",
    "2026-13-01T05:00",
    "2026-02-30T05:00",
  ])("rejects %j", (text) => {
    expect(zonedToEpoch(text, "Europe/Paris")).toBeNull();
  });
});

describe("epochToZoned", () => {
  it("is the inverse of zonedToEpoch", () => {
    expect(epochToZoned(START, "Europe/Paris")).toBe("2026-08-21T05:00");
    for (const local of ["2026-08-21T23:59", "2026-01-01T00:00", "2026-12-31T12:30"]) {
      expect(epochToZoned(zonedToEpoch(local, "Europe/Paris"), "Europe/Paris")).toBe(local);
    }
  });

  it("shows midnight as 00:00, not 24:00", () => {
    expect(epochToZoned(Date.UTC(2026, 7, 21, 0, 0, 0) / 1000, "UTC")).toBe("2026-08-21T00:00");
  });

  it("is empty for no time", () => {
    expect(epochToZoned(null, "UTC")).toBe("");
    expect(epochToZoned(undefined, "UTC")).toBe("");
    expect(epochToZoned(Number.NaN, "UTC")).toBe("");
  });
});

describe("epochToUtc", () => {
  it("writes the director's form, without milliseconds", () => {
    expect(epochToUtc(START)).toBe("2026-08-21T03:00:00Z");
  });

  it("is empty for no time", () => {
    expect(epochToUtc(null)).toBe("");
  });
});

describe("time zones", () => {
  it("knows its own", () => {
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(timeZones()).toContain("Europe/Paris");
  });
});

describe("utcOffsetSeconds", () => {
  // 2026-08-21T03:00:00Z and 2026-01-15T03:00:00Z.
  const summer = 1787281200;
  const winter = 1768446000;

  it("is the race clock's offset at that instant, daylight saving included", () => {
    expect(utcOffsetSeconds(summer, "Europe/Paris")).toBe(7200);
    expect(utcOffsetSeconds(winter, "Europe/Paris")).toBe(3600);
    expect(utcOffsetSeconds(summer, "America/Denver")).toBe(-21600);
    expect(utcOffsetSeconds(summer, "Asia/Kolkata")).toBe(19800);
    expect(utcOffsetSeconds(summer, "UTC")).toBe(0);
  });

  it("is 0 without a time", () => {
    expect(utcOffsetSeconds(null, "Europe/Paris")).toBe(0);
  });
});

describe("pinsWithOffsets", () => {
  it("gives each timed pin its offset, and leaves the others alone", () => {
    const pins = [
      { id: 1, epoch_s: 1787281200, distance_m: 0 },
      { id: 2, epoch_s: null, distance_m: 100 },
    ];
    const zoned = pinsWithOffsets(pins, "Europe/Paris");
    expect(zoned[0]).toEqual({ ...pins[0], utc_offset_s: 7200 });
    expect(zoned[1]).toBe(pins[1]);
    expect(pins[0]).not.toHaveProperty("utc_offset_s");
  });
});
