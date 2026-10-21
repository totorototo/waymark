import { expect, test } from "@playwright/test";

import { fixture, offline, readDownload } from "./helpers.js";

// The race's clock is the browser's until the person picks one: Paris, as a director's would
// be. In June that is UTC+2, so the fixture's Refuge (08:00Z) reads 10:00.
test.use({ timezoneId: "Europe/Paris" });

test.beforeEach(async ({ page }) => {
  await offline(page);
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles(fixture);
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();
});

const pinsPanel = (page) => page.getByRole("region", { name: "Pins" });
const rows = (page) => pinsPanel(page).locator("ol > li > button");

// The exported file's waypoints, in file order: { name, type, time }.
function waypoints(text) {
  return [...text.matchAll(/<wpt [^>]*>([\s\S]*?)<\/wpt>/g)].map(([, body]) => ({
    name: body.match(/<name>(.*?)<\/name>/)?.[1],
    type: body.match(/<type>(.*?)<\/type>/)?.[1],
    time: body.match(/<time>(.*?)<\/time>/)?.[1],
  }));
}

test("adds a pin at a km, sets its cutoff, and exports it in route order", async ({ page }) => {
  const panel = pinsPanel(page);
  const km = panel.getByLabel("Add a pin at km");

  await km.fill("abc");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(panel.getByRole("alert")).toHaveText("Type a distance in km, such as 12.5.");
  await km.fill("9");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(panel.getByRole("alert")).toContainText("is past the finish");
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();

  // A comma, as a French spreadsheet writes it. The new pin goes between the Refuge (3 km)
  // and the Finish, not at the end of the list.
  await km.fill("4,5");
  await panel.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("heading", { name: "Pins (4)" })).toBeVisible();
  await expect(km).toHaveValue("");
  await expect(rows(page)).toHaveText([/Start/, /Refuge/, /Checkpoint 1.*4\.5 km/, /Finish/]);

  // It opens with its cutoff time focused, prefilled with the Start's: before the Refuge's.
  const time = panel.getByLabel("Cutoff time");
  await expect(time).toBeFocused();
  await expect(time).toHaveValue("08:00");
  await expect(panel.getByText("Checkpoint 1: the cutoff is before Refuge's.")).toBeVisible();
  // Counted above the list, and flagged on the pin's own row.
  await expect(panel.locator("header").getByText("2 issues")).toBeVisible();
  await expect(rows(page).nth(2).getByText("2 issues")).toBeAttached();

  await time.fill("11:00");
  await expect(panel.getByText(/the cutoff is/)).toBeHidden();
  await expect(panel.getByText(/^\d+ issues?$/)).toBeHidden();
  await expect(rows(page).nth(2)).toContainText("Time barrier");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export GPX" }).click(),
  ]);
  // 11:00 in Paris, written on the race's clock with its offset: the file says the race runs
  // at UTC+2, so gpxz puts the night slowdown on that clock.
  expect(waypoints(await readDownload(download))).toEqual([
    { name: "Start", type: "Start", time: "2026-06-06T08:00:00+02:00" },
    { name: "Refuge", type: "TimeBarrier", time: "2026-06-06T10:00:00+02:00" },
    { name: "Checkpoint 1", type: "TimeBarrier", time: "2026-06-06T11:00:00+02:00" },
    { name: "Finish", type: "Arrival", time: "2026-06-06T12:00:00+02:00" },
  ]);
  await expect(page.getByText("Unsaved changes")).toBeHidden();
});

// Drags a pin on the map by (dx, dy) pixels, as a mouse would.
async function drag(page, pin, dx, dy) {
  const box = await pin.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 5 });
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

// The map has no tiles offline, but Mapbox still draws the pins and moves them. A build
// without VITE_MAPBOX_KEY (a fork's pull request) has no map at all.
test.describe("on the map", () => {
  test.beforeEach(async ({ page }) => {
    const mapless = await page.getByText(/Set VITE_MAPBOX_KEY/).isVisible();
    test.skip(mapless, "built without VITE_MAPBOX_KEY: no map to drag pins on");
  });

  test("drags a pin along the route, and undoes the move", async ({ page }) => {
    const refuge = page.getByRole("button", { name: "Refuge, pin 2" });
    const finish = page.getByRole("button", { name: "Finish, pin 3" });
    await expect(refuge).toBeVisible();
    const from = await refuge.boundingBox();
    const to = await finish.boundingBox();
    const refugeRow = rows(page).nth(1);
    await expect(refugeRow).toContainText("3.0 km");

    // Half way to the Finish: km 4.5, snapped onto the track.
    await drag(page, refuge, (to.x - from.x) / 2, (to.y - from.y) / 2);
    await expect(refugeRow).toContainText(/4\.[4-6] km/);
    await expect(refugeRow).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    await pinsPanel(page).getByRole("status").getByRole("button", { name: "Undo" }).click();
    await expect(refugeRow).toContainText("3.0 km");
    await expect(pinsPanel(page).getByRole("status")).toBeHidden();
  });

  test("a pin dropped off the route goes back where it was", async ({ page }) => {
    const refuge = page.getByRole("button", { name: "Refuge, pin 2" });
    await expect(refuge).toBeVisible();
    // Its tip, on the track: a selected pin is drawn larger, from the same tip.
    const center = async () => {
      const box = await refuge.boundingBox();
      return { x: box.x + box.width / 2, y: box.y + box.height };
    };
    const before = await center();

    await drag(page, refuge, 200, 0);
    await expect(
      page.getByText("Dropped off the route: the pin stays where it was."),
    ).toBeVisible();
    await expect(rows(page).nth(1)).toContainText("3.0 km");
    await expect.poll(async () => (await center()).x).toBeCloseTo(before.x, 0);
    await expect(page.getByText("Unsaved changes")).toBeHidden();
  });
});

test("removes every pin after asking, and undoes it", async ({ page }) => {
  const panel = pinsPanel(page);
  await panel.getByRole("button", { name: "Remove all" }).click();
  await expect(panel.getByText(/Remove all 3 pins\?/)).toBeVisible();
  await panel.getByRole("button", { name: "Keep them" }).click();
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();

  await panel.getByRole("button", { name: "Remove all" }).click();
  await panel.getByRole("alert").getByRole("button", { name: "Remove all" }).click();
  await expect(page.getByRole("heading", { name: "Pins (0)" })).toBeVisible();
  await expect(
    panel.getByText("No checkpoints yet: click the route to add the first."),
  ).toBeVisible();

  await panel.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();
  await expect(rows(page)).toHaveText([/Start/, /Refuge/, /Finish/]);
});
