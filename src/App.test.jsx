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

import App from "./App.jsx";
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
    });
  });

  it("asks for the file when none is open", () => {
    renderApp();
    expect(screen.getByText(/Open the race director/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Export GPX/ }).disabled).toBe(true);
  });

  it("shows a file the worker refused", () => {
    useStore.setState({ status: "error", error: "InvalidGpx" });
    renderApp();
    expect(screen.getByRole("alert").textContent).toMatch(/InvalidGpx/);
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
