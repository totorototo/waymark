import { expect, test } from "@playwright/test";

import { fixtureText, offline, readDownload } from "./helpers.js";

// Stands in for the browser's agent: a document.modelContext that keeps what the page
// registers, so the test can call the tools as an agent would. Same calls as the spec's:
// registerTool(tool, { signal }), unregistered when the signal aborts.
function fakeModelContext() {
  const tools = {};
  window.__tools = tools;
  Object.defineProperty(document, "modelContext", {
    value: {
      async registerTool(tool, { signal }) {
        tools[tool.name] = tool;
        signal?.addEventListener("abort", () => {
          if (tools[tool.name] === tool) delete tools[tool.name];
        });
      },
    },
  });
}

// Runs a tool in the page, with no click: as an agent's call, without the person's gesture.
const call = (page, name, input = {}) =>
  page.evaluate(
    ([name, input]) =>
      window.__tools[name].execute(input, { signal: new AbortController().signal }),
    [name, input],
  );

test.beforeEach(async ({ page }) => {
  await offline(page);
  await page.addInitScript(fakeModelContext);
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(window.__tools ?? {}).length === 7);
});

test("an agent loads a GPX, fixes a cutoff, and downloads it to the person's disk", async ({
  page,
}) => {
  const loaded = await call(page, "load_gpx", { gpx: fixtureText, file_name: "race.gpx" });
  expect(loaded.ok).toBe(true);
  expect(loaded.checkpoints.map((pin) => pin.name)).toEqual(["Start", "Refuge", "Finish"]);
  await expect(page.getByRole("heading", { name: "Pins (3)" })).toBeVisible();

  const downloads = [];
  page.on("download", (download) => downloads.push(download));

  // The Refuge's cutoff after the Finish's: an error, so nothing is downloaded.
  const refuge = loaded.checkpoints[1];
  const late = await call(page, "update_checkpoint", {
    id: refuge.id,
    cutoff: "2026-06-06T11:00Z",
  });
  expect(late.ok).toBe(true);
  const refused = await call(page, "download_gpx");
  expect(refused.ok).toBe(false);
  expect(refused.review.ready).toBe(false);
  expect(refused.review.issues).toContainEqual(expect.objectContaining({ level: "error" }));

  const fixed = await call(page, "update_checkpoint", {
    id: refuge.id,
    cutoff: "2026-06-06T09:00Z",
  });
  expect(fixed.ok).toBe(true);
  expect((await call(page, "review_plan")).ready).toBe(true);

  const [download, result] = await Promise.all([
    page.waitForEvent("download"),
    call(page, "download_gpx"),
  ]);
  expect(result).toEqual({ ok: true, file_name: "race-edited.gpx", bytes: expect.any(Number) });
  expect(download.suggestedFilename()).toBe("race-edited.gpx");
  expect(downloads).toHaveLength(1);
  const text = await readDownload(download);
  expect(text.match(/<wpt /g)).toHaveLength(3);
  expect(text).toContain("2026-06-06T09:00:00Z");

  // The browser may have blocked a download nobody clicked for: the edits stay unsaved, and
  // the agent cannot load another file over them without the person's say.
  await expect(page.getByText("race.gpx •")).toBeVisible();
  const replaced = await call(page, "load_gpx", { gpx: fixtureText });
  expect(replaced).toEqual({ ok: false, error: expect.stringMatching(/unsaved edits/) });
});
