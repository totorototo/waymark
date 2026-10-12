// The app shell, precached (the worker chunk embeds the WASM module), so waymark opens and
// starts fast with a flaky network. Mapbox's tiles are not cached: the map needs the network.
import { precacheAndRoute } from "workbox-precaching";

// A new build waits until the person takes it (the update notice in the masthead posts
// SKIP_WAITING, then main.jsx's registerSW reloads onto it). why not Retrace's skipWaiting on
// install: its reload would land mid-edit, and waymark's pins live only in memory.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// why: the reload onto a new build follows the page's controller changing. A page opened
// before any worker was installed has none, and would never change one: claim it.
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

precacheAndRoute(self.__WB_MANIFEST);
