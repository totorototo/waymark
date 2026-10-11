import { describe, expect, it } from "vitest";

import {
  clickRadius,
  formatClock,
  formatDuration,
  formatKm,
  formatPace,
  metersPerPixel,
  parsePace,
} from "./format.js";

describe("format", () => {
  it("writes km", () => {
    expect(formatKm(38250)).toBe("38.3 km");
    expect(formatKm(NaN)).toBe("–");
  });

  it("writes durations", () => {
    expect(formatDuration(5400)).toBe("1h30");
    expect(formatDuration(600)).toBe("10 min");
    expect(formatDuration(-5400)).toBe("-1h30");
    expect(formatDuration(null)).toBe("–");
    expect(formatDuration(undefined)).toBe("–");
  });

  it("writes and reads paces", () => {
    expect(formatPace(500)).toBe("8:20 /km");
    expect(formatPace(0)).toBe("–");
    expect(parsePace("8:20")).toBe(500);
    expect(parsePace("8")).toBe(480);
    expect(parsePace("8:75")).toBeNull();
    expect(parsePace("fast")).toBeNull();
    expect(parsePace("0")).toBeNull();
  });

  it("writes a clock on the zone's time", () => {
    expect(formatClock(1787281200, "Europe/Paris")).toBe("Fri 21 Aug 05:00");
    expect(formatClock(1787281200, "UTC")).toBe("Fri 21 Aug 03:00");
    expect(formatClock(null, "UTC")).toBe("–");
  });

  it("scales the click radius with the zoom, within bounds", () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 0);
    expect(clickRadius(45, 2)).toBe(5000);
    expect(clickRadius(45, 22)).toBe(5);
    const mid = clickRadius(45, 12);
    expect(mid).toBeGreaterThan(5);
    expect(mid).toBeLessThan(5000);
    expect(clickRadius(45, 13)).toBeLessThan(mid);
  });
});
