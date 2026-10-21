import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-map-gl/mapbox", () => ({
  Map: ({ children }) => <div data-testid="map">{children}</div>,
  Source: ({ children }) => <div>{children}</div>,
  Layer: () => null,
  Marker: ({ children }) => <div>{children}</div>,
}));
vi.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}));

import App, { loadHint } from "./App.jsx";
import { pinFromWaypoint } from "./gpx/pins.js";
import useStore from "./store/store.js";
import THEME from "./theme/Theme.js";

const geometry = {
  name: "Race",
  points: [45, 6, 1000, 0, 45.01, 6.01, 1100, 1500],
  waypoints: [],
};

function renderApp() {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <App />
    </ThemeProvider>,
  );
}

describe("App", () => {
  beforeEach(() => {
    useStore.setState({
      status: "idle",
      error: null,
      geometry: null,
      pins: [],
      selectedId: null,
      pending: null,
      notice: null,
      plan: null,
      planError: null,
      planStatus: "idle",
      fileName: null,
      dirty: false,
      undo: null,
      pendingFile: null,
    });
  });

  it("asks for the file when none is open", () => {
    renderApp();
    expect(screen.getByText(/Open the race director/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Open GPX/ })).toBeTruthy();
    // Nothing to export yet: no button that does nothing.
    expect(screen.queryByRole("button", { name: /Export GPX/ })).toBeNull();
  });

  it("shows a file the worker refused, what to do, and offers another", () => {
    useStore.setState({ status: "error", error: "InvalidGpx" });
    renderApp();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/does not look like a GPX file with a track/);
    expect(alert.textContent).toMatch(/InvalidGpx/);
    expect(screen.getByRole("button", { name: /Open another GPX/ })).toBeTruthy();
  });

  it("reads gpxz's error by name, as Zigar words it or not", () => {
    expect(loadHint("Trace too short")).toMatch(/no track/);
    expect(loadHint("TraceTooShort")).toMatch(/no track/);
    expect(loadHint("Unexpected token")).toMatch(/does not look like a GPX/);
    // gpxz's input caps: a valid GPX that is too big, not "not a GPX".
    expect(loadHint("File too large")).toMatch(/over 64 MB/);
    expect(loadHint("PointsTooMany")).toMatch(/million points/);
    expect(loadHint("Waypoints too many")).toMatch(/10,000 waypoints/);
  });

  it("says which part of the file is missing when gpxz says so", () => {
    useStore.setState({ status: "error", error: "Elevation missing" });
    renderApp();
    expect(screen.getByRole("alert").textContent).toMatch(/no elevation/);
  });

  it("lists the pins and opens one to edit", () => {
    const pin = pinFromWaypoint(
      { latitude: 45, longitude: 6, name: "Start", type_name: "Start", distance_m: 0 },
      "pin-1",
    );
    const updatePin = vi.fn();
    useStore.setState({ status: "ready", geometry, pins: [pin], fileName: "race.gpx", updatePin });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Start/, expanded: false }));
    const name = screen.getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Depart" } });
    expect(updatePin).toHaveBeenCalledWith("pin-1", { name: "Depart" });
  });

  it("removes all pins only once confirmed", () => {
    const pin = pinFromWaypoint(
      { latitude: 45, longitude: 6, name: "Old barrier", type_name: "TimeBarrier", distance_m: 0 },
      "pin-1",
    );
    const clearPins = vi.fn();
    useStore.setState({ status: "ready", geometry, pins: [pin], fileName: "race.gpx", clearPins });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Remove all/ }));
    fireEvent.click(screen.getByRole("button", { name: "Keep them" }));
    expect(clearPins).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Remove all/ }));
    expect(screen.getByText(/Remove the pin\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove all" }));
    expect(clearPins).toHaveBeenCalledTimes(1);
  });

  it("shows a pin's type, cutoff and issues on its row", () => {
    const pin = pinFromWaypoint(
      { latitude: 45, longitude: 6, name: "Col", type_name: "TimeBarrier", distance_m: 0 },
      "pin-1",
    );
    useStore.setState({ status: "ready", geometry, pins: [pin], fileName: "race.gpx" });
    renderApp();
    const row = screen.getByRole("button", { name: /Col/, expanded: false });
    expect(row.textContent).toMatch(/Time barrier/);
    expect(screen.getByRole("img", { name: /issue/ })).toBeTruthy();
    // No Start and no Arrival belong to no pin: above the list.
    expect(screen.getByText(/No Start/)).toBeTruthy();
    fireEvent.click(row);
    expect(screen.getByText(/a time barrier has no cutoff/)).toBeTruthy();
  });

  it("offers to undo the last removal", () => {
    const undoLast = vi.fn();
    useStore.setState({
      status: "ready",
      geometry,
      fileName: "race.gpx",
      undo: { label: "Removed Refuge", pins: [], selectedId: null },
      undoLast,
    });
    renderApp();
    expect(screen.getByText(/Removed Refuge/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undoLast).toHaveBeenCalled();
  });

  it("asks before another file replaces unsaved edits", () => {
    const confirmOpen = vi.fn();
    useStore.setState({
      status: "ready",
      geometry,
      fileName: "race.gpx",
      dirty: true,
      pendingFile: { name: "other.gpx" },
      confirmOpen,
    });
    renderApp();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(screen.getByText(/Open other.gpx\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard and open" }));
    expect(confirmOpen).toHaveBeenCalled();
  });

  it("types a cutoff time on the day already set, on the race's clock", () => {
    const pin = pinFromWaypoint(
      {
        latitude: 45,
        longitude: 6,
        name: "Col",
        type_name: "TimeBarrier",
        epoch_s: 1787281200, // Fri 21 Aug 05:00 in Paris
        distance_m: 0,
      },
      "pin-1",
    );
    const updatePin = vi.fn();
    useStore.setState({
      status: "ready",
      geometry,
      pins: [pin],
      selectedId: "pin-1",
      timeZone: "Europe/Paris",
      updatePin,
    });
    renderApp();
    expect(screen.getByLabelText("Cutoff day").value).toBe("2026-08-21");
    fireEvent.change(screen.getByLabelText("Cutoff time"), { target: { value: "10:30" } });
    expect(updatePin).toHaveBeenCalledWith("pin-1", { epoch_s: 1787281200 + 5.5 * 3600 });
  });

  it("sets the race clock only to a zone from the list", () => {
    const setTimeZone = vi.fn();
    useStore.setState({ status: "ready", geometry, timeZone: "UTC", setTimeZone });
    renderApp();
    const clock = screen.getByLabelText("Race clock");
    fireEvent.change(clock, { target: { value: "Europe/Par" } });
    expect(setTimeZone).not.toHaveBeenCalled();
    fireEvent.change(clock, { target: { value: "Europe/Paris" } });
    expect(setTimeZone).toHaveBeenCalledWith("Europe/Paris");
  });

  it("adds a pin at a distance typed in km, and says why it cannot", async () => {
    const addAtDistance = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, pin: {} })
      .mockResolvedValueOnce({ ok: false, error: "km 99.00 is past the finish." });
    useStore.setState({ status: "ready", geometry, addAtDistance });
    renderApp();
    const km = screen.getByLabelText("Add a pin at km");
    fireEvent.change(km, { target: { value: "12,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await vi.waitFor(() => expect(addAtDistance).toHaveBeenCalledWith(12500));
    fireEvent.change(km, { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText(/past the finish/)).toBeTruthy();
  });

  it("offers the passes of an out-and-back and cancels", () => {
    const cancelPending = vi.fn();
    useStore.setState({
      status: "ready",
      geometry,
      pending: {
        latitude: 45,
        longitude: 6,
        candidates: [
          { latitude: 45, longitude: 6, elevation_m: 1, distance_m: 38300, offset_m: 1 },
          { latitude: 45, longitude: 6, elevation_m: 1, distance_m: 44900, offset_m: 1 },
        ],
      },
      cancelPending,
    });
    renderApp();
    expect(screen.getByText(/more than once/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancelPending).toHaveBeenCalled();
  });
});
