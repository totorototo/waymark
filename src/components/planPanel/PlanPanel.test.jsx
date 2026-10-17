import { fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { beforeEach, describe, expect, it } from "vitest";

import useStore, { DEFAULT_SETTINGS } from "../../store/store.js";
import THEME from "../../theme/Theme.js";
import PlanPanel from "./PlanPanel.jsx";

// 2026-08-28 05:00 in Paris (UTC+2), the Start.
const START = Date.UTC(2026, 7, 28, 3, 0) / 1000;
const at = (hours, minutes) => START + hours * 3600 + minutes * 60;

const entry = (name, fields) => ({
  name,
  type_name: "TimeBarrier",
  epoch_s_arrival: null,
  epoch_s_cutoff: null,
  stop_s: 0,
  margin_s: null,
  ...fields,
});

// Merlans: arrives 08:53 for an 08:30 cutoff. La Mongie: 11:55 for 13:00, a 2 min stop.
const plan = {
  sections: [],
  plan: [
    entry("Vielle-Aure", {
      type_name: "Start",
      epoch_s_arrival: START,
      epoch_s_cutoff: START,
      margin_s: 0,
    }),
    entry("Restaurant Merlans", {
      epoch_s_arrival: at(3, 53),
      epoch_s_cutoff: at(3, 30),
      margin_s: -23 * 60,
    }),
    entry("La Mongie", {
      epoch_s_arrival: at(6, 55),
      epoch_s_cutoff: at(8, 0),
      stop_s: 120,
      margin_s: 63 * 60,
    }),
  ],
};

function renderPanel() {
  return render(
    <ThemeProvider theme={{ ...THEME, currentVariant: "dark" }}>
      <PlanPanel />
    </ThemeProvider>,
  );
}

describe("PlanPanel checkpoints", () => {
  beforeEach(() => {
    useStore.setState({
      plan,
      planError: null,
      planStatus: "ready",
      settings: DEFAULT_SETTINGS,
      timeZone: "Europe/Paris",
    });
  });

  it("folds each checkpoint's prediction under Checkpoints, closed at first", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: "Checkpoints (3)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const fold = document.getElementById(toggle.getAttribute("aria-controls"));
    expect(fold).toHaveAttribute("inert");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(fold).not.toHaveAttribute("inert");
  });

  it("gives each checkpoint its arrival, cutoff and spare at departure", () => {
    renderPanel();
    const mongie = screen.getByRole("rowheader", { name: "La Mongie" }).closest("tr");
    expect(within(mongie).getByText("11:55")).toBeTruthy();
    expect(within(mongie).getByText("13:00")).toBeTruthy();
    expect(within(mongie).getByText("1h03")).toBeTruthy();
  });

  it("marks a checkpoint the plan misses, and gives the Start no spare", () => {
    renderPanel();
    const merlans = screen.getByRole("rowheader", { name: "Restaurant Merlans" }).closest("tr");
    expect(merlans).toHaveClass("late");
    expect(within(merlans).getByText("−0h23")).toBeTruthy();
    const start = screen.getByRole("rowheader", { name: "Vielle-Aure" }).closest("tr");
    expect(within(start).getByText("–")).toBeTruthy();
  });

  it("names the miss in the summary line", () => {
    renderPanel();
    expect(screen.getByText(/Misses the cutoff at Restaurant Merlans\./)).toBeTruthy();
  });
});
