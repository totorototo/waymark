import { expect, test } from "@playwright/test";

import { offline } from "./helpers.js";

test("registers a service worker", async ({ page }) => {
  await offline(page);
  await page.goto("/");
  const registered = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(registered).toBe(true);
});

test("serves a web app manifest with the install icons", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("Waymark");
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
  for (const { src } of manifest.icons) expect((await request.get(`/${src}`)).ok()).toBe(true);
});
