import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pinFromWaypoint } from "../../gpx/pins.js";
import useStore from "../../store/store.js";
import { FOLD_MS } from "../../theme/controls.js";
import THEME from "../../theme/Theme.js";
import PinPanel from "./PinPanel.jsx";

// 2026-08-28 17:45 in Paris (UTC+2), the Start; the barrier's cutoff is 22:00 that day.
const START = Date.UTC(2026, 7, 28, 15, 45) / 1000;
const CUTOFF = START + 4 * 3600 + 15 * 60;

const pins = [
  pinFromWaypoint({ name: "Start", type_name: "Start", epoch_s: START, distance_m: 0 }, "p1"),
  pinFromWaypoint(
    { name: "Les Houches", type_name: "TimeBarrier", epoch_s: CUTOFF, distance_m: 8900 },
    "p2",
  ),
  pinFromWaypoint({ name: "Col", type_name: null, distance_m: 12000 }, "p3"),
  pinFromWaypoint({ name: "Finish", type_name: "Arrival", epoch_s: null, distance_m: 20000 }, "p4"),
];

const entry = (name, type_name, fields) => ({
  name,
  type_name,
  epoch_s_arrival: null,
  epoch_s_cutoff: null,
  stop_s: 0,
  margin_s: null,
  ...fields,
});

// Arrives 19:05, leaves at once: 2h55 to the 22:00 cutoff.
const plan = {
  sections: [],
  plan: [
    entry("Start", "Start", { epoch_s_arrival: START, epoch_s_cutoff: START, margin_s: 0 }),
    entry("Les Houches", "TimeBarrier", {
      epoch_s_arrival: START + 80 * 60,
      epoch_s_cutoff: CUTOFF,
      margin_s: CUTOFF - (START + 80 * 60),
    }),
    entry("Finish", "Arrival", { epoch_s_arrival: START + 5 * 3600 }),
  ],
};

function renderPanel() {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <PinPanel />
    </ThemeProvider>,
  );
}

const row = (name) => screen.getByRole("button", { name: new RegExp(`^\\d+ ${name}`) });

describe("PinPanel rows", () => {
  beforeEach(() => {
    useStore.setState({
      pins,
      plan,
      planStatus: "ready",
      selectedId: null,
      addedId: null,
      undo: null,
      timeZone: "Europe/Paris",
    });
  });

  afterEach(() => vi.useRealTimers());

  it("shows each pin's cutoff as its key time", () => {
    renderPanel();
    expect(within(row("Les Houches")).getByText("22:00")).toBeTruthy();
    expect(within(row("Start")).getByText("17:45")).toBeTruthy();
  });

  // Waymark edits the director's file: the pace plan's predictions are the Plan's, not a pin's.
  it("shows no pace plan on a pin, even with a plan computed", () => {
    renderPanel();
    for (const name of ["Start", "Les Houches", "Col", "Finish"]) {
      const pinRow = row(name);
      expect(within(pinRow).queryByText(/^(OK|Tight|Over)$/)).toBeNull();
      expect(within(pinRow).queryByText("Plan arrives")).toBeNull();
      expect(within(pinRow).queryByText("Spare at departure")).toBeNull();
    }
  });

  it("keeps a closing editor until its fold has shut, then drops it", () => {
    vi.useFakeTimers();
    renderPanel();
    fireEvent.click(row("Les Houches"));
    expect(screen.getByRole("button", { name: /Remove pin/ })).toBeTruthy();

    fireEvent.click(row("Les Houches"));
    // Folding shut: still mounted, but out of reach (jsdom keeps inert content in role
    // queries, so check the attribute).
    const editor = document.querySelector("form.editor");
    expect(editor).not.toBeNull();
    expect(editor.closest(".fold").hasAttribute("inert")).toBe(true);

    act(() => vi.advanceTimersByTime(FOLD_MS));
    expect(document.querySelectorAll("form.editor")).toHaveLength(0);
  });
});
