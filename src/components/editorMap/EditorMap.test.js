import { describe, expect, it, vi } from "vitest";

vi.mock("react-map-gl/mapbox", () => ({}));
vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

import { kmMarks } from "./EditorMap.jsx";

// Flat [latitude, longitude, elevation, distance] per point, along a meridian.
const track = (distances) => distances.flatMap((d) => [d / 100000, 0, 0, d]);

describe("kmMarks", () => {
  it("labels each km of a short route, between the points around it", () => {
    const marks = kmMarks(track([0, 1500, 3200]), 3200);
    expect(marks.features.map((mark) => mark.properties.label)).toEqual(["1 km", "2 km", "3 km"]);
    const [, latitude] = marks.features[0].geometry.coordinates;
    expect(latitude).toBeCloseTo(0.01);
  });

  it("spaces the labels out on a long route", () => {
    const marks = kmMarks(track([0, 50000, 100000, 171000]), 171000);
    expect(marks.features[0].properties.label).toBe("20 km");
    expect(marks.features.length).toBeLessThanOrEqual(12);
  });

  it("puts no label at the start or the finish", () => {
    expect(kmMarks(track([0, 1000]), 1000).features).toEqual([]);
  });
});
