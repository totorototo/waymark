import { describe, expect, it } from "vitest";

import {
  clickRadius,
  formatClock,
  formatDuration,
  formatKm,
  formatMargin,
  formatPace,
  formatShortClock,
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

  it("writes margins as the checkpoint row does", () => {
    expect(formatMargin(3840)).toBe("1h04");
    expect(formatMargin(420)).toBe("0h07");
    expect(formatMargin(-1440)).toBe("−0h24");
    expect(formatMargin(-10)).toBe("0h00");
    expect(formatMargin(-400 * 3600)).toBe("−99h+");
    expect(formatMargin(null)).toBe("–");
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

  it("writes a clock as hours on the race's first day, with the weekday after", () => {
    const start = 1787281200; // Fri 21 Aug 05:00 in Paris
    expect(formatShortClock(start + 3600, "Europe/Paris", start)).toBe("06:00");
    expect(formatShortClock(start + 24 * 3600, "Europe/Paris", start)).toBe("Sat 05:00");
    // 23:30 UTC is already the next day in Paris.
    expect(formatShortClock(1787268600, "Europe/Paris", 1787268600 - 3600)).toBe("01:30");
    expect(formatShortClock(null, "UTC", start)).toBe("–");
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
