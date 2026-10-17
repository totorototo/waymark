import { expect, test } from "@playwright/test";

import { fixture, offline, readDownload } from "./helpers.js";

test.beforeEach(({ page }) => offline(page));

test("opens a GPX, plans it, and exports it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Open the race director's GPX/)).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(fixture);
  await expect(page.getByText("route.gpx", { exact: true })).toBeVisible();
  // The file's waypoints, matched to the track by gpxz, are the pins.
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();
  const pins = page.getByRole("region", { name: "Pins" });
  for (const name of ["Start", "Refuge", "Finish"]) {
    await expect(pins.getByRole("button", { name: new RegExp(`^\\d+ ${name}`) })).toBeVisible();
  }
  // The plan is built: its one line gives the finish time.
  const plan = page.getByRole("region", { name: "Plan" });
  await expect(plan.getByText(/^Finish .*\./)).toBeVisible();
  await plan.getByText("Sections (2)").click();
  await expect(plan.getByRole("rowheader", { name: "Refuge → Finish" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export GPX" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("route-edited.gpx");
  const text = await readDownload(download);
  expect(text.match(/<wpt /g)).toHaveLength(3);
  expect(text).toContain("<trkpt");
});

test("a file gpxz cannot read shows its error", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles({
    name: "broken.gpx",
    mimeType: "application/gpx+xml",
    buffer: Buffer.from("<gpx><trk>"),
  });
  await expect(page.getByRole("alert")).toContainText("This file could not be read");
  await expect(page.getByRole("alert")).toContainText("no track");
  await expect(page.getByRole("button", { name: "Open another GPX" })).toBeVisible();
});

test("asks before another file replaces unsaved edits", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(fixture);
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();

  await page.getByRole("button", { name: /Refuge/, expanded: false }).click();
  await page.getByRole("button", { name: "Remove pin" }).click();
  await expect(page.getByRole("heading", { name: "Pins (2)" })).toBeVisible();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(fixture);
  await expect(page.getByText(/Your unsaved changes to route.gpx will be lost/)).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByText(/will be lost/)).toBeHidden();
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  await page.getByTestId("file-input").setInputFiles(fixture);
  await page.getByRole("button", { name: "Discard and open" }).click();
  await expect(page.getByText("Unsaved changes")).toBeHidden();
});
