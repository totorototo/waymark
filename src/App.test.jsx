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
