import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import { offerUpdate } from "./store/appUpdate.js";
import ThemedApp from "./ThemedApp.jsx";

// Registers the app shell (see sw.js). A new build waits: the masthead offers it, and taking
// it reloads the page onto it once the new worker controls the page.
// why our own reload: the plugin's reloads only a page that had a worker when it opened, not
// one first opened before any was installed.
const takeUpdate = () => {
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  updateSW();
};
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => offerUpdate(takeUpdate),
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemedApp />
  </StrictMode>,
);
