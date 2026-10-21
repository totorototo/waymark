import { useEffect, useRef, useState } from "react";

import { registerWebMcp } from "./agent/webmcp.js";
import { Layout } from "./App.style.js";
import EditorMap from "./components/editorMap/EditorMap.jsx";
import ErrorBoundary from "./components/errorBoundary/ErrorBoundary.jsx";
import Footer from "./components/footer/Footer.jsx";
import LoadingSpinner from "./components/loadingSpinner/LoadingSpinner.jsx";
import OpenFile from "./components/openFile/OpenFile.jsx";
import PinPanel from "./components/pinPanel/PinPanel.jsx";
import PlanPanel from "./components/planPanel/PlanPanel.jsx";
import ThemeToggle from "./components/themeToggle/ThemeToggle.jsx";
import Toolbar from "./components/toolbar/Toolbar.jsx";
import useFullscreen from "./hooks/useFullscreen.js";
import useStore from "./store/store.js";

// What to do about a file gpxz refused, by its error name; anything else is not a GPX it
// can read. Zigar reports the name as words ("Trace too short"): match either form.
const LOAD_HINTS = {
  TraceTooShort:
    "The file has no track, or too few points to make one. Is it a route with a <trk>?",
  ElevationMissing:
    "The track has no elevation, which the plan needs. Export it again with elevation from the app or watch that recorded it.",
  // gpxz's caps on untrusted input (gpx.zig bytes_max, points_max, waypoints_max).
  FileTooLarge: "The file is over 64 MB, more than any race route needs.",
  PointsTooMany:
    "The track has over a million points, far more than any race needs. Simplify it and export it again.",
  WaypointsTooMany:
    "The file has over 10,000 waypoints, more than any race has. Is it a course, or a waypoint library?",
};
const LOAD_HINT_DEFAULT =
  "It does not look like a GPX file with a track. Try exporting it again as GPX from the app that made it.";

const squash = (text) => String(text).replace(/\s+/g, "").toLowerCase();

export function loadHint(error) {
  const known = Object.keys(LOAD_HINTS).find((name) => squash(name) === squash(error));
  return known ? LOAD_HINTS[known] : LOAD_HINT_DEFAULT;
}

export default function App() {
  const [dragging, setDragging] = useState(false);
  const workspaceRef = useRef(null);
  // why the workspace, not the map: fullscreen keeps the pins beside the map, so a pin
  // added there can be named and timed without leaving it.
  const [isFullscreen, toggleFullscreen] = useFullscreen(workspaceRef);
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);
  const notice = useStore((state) => state.notice);
  const pending = useStore((state) => state.pending);
  const cancelPending = useStore((state) => state.cancelPending);
  const openFile = useStore((state) => state.openFile);
  const dirty = useStore((state) => state.dirty);
  const undoLast = useStore((state) => state.undoLast);

  // The checkpoint tools for an agent in the browser, while the editor is on screen.
  useEffect(() => registerWebMcp(useStore), []);

  // Closing or reloading the tab would drop the pins: the browser asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Cmd/Ctrl+Z undoes a removal or a move, except in a field, where it undoes the typing.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "z" || !(event.metaKey || event.ctrlKey) || event.shiftKey) return;
      if (event.target.closest?.("input, textarea, select, [contenteditable]")) return;
      if (!useStore.getState().undo) return;
      event.preventDefault();
      undoLast();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLast]);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    if (file) openFile(file);
  };

  return (
    <Layout
      // The start page marks its ledger as the drop target; the editor, the whole page.
      $dragging={dragging && status === "ready"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <ThemeToggle />
      <Toolbar />
      <main>
        {status === "idle" && (
          <div className={`start${dragging ? " dragging" : ""}`}>
            <span className="eyebrow">Checkpoints and cutoffs</span>
            <h1 className="title">A race&apos;s GPX, pinned and timed</h1>
            <p className="lede">
              Open the race director&apos;s GPX, pin the checkpoints on the route, set their
              cutoffs, and export the file with them.
            </p>
            <div className="ledger">
              <OpenFile className="ledger-row" />
            </div>
            <p className="drop">or drop the file anywhere on the page</p>
            <p className="note">The file stays in your browser: nothing is uploaded.</p>
          </div>
        )}
        {status === "loading" && <LoadingSpinner label="Reading the route…" />}
        {status === "error" && (
          <div className={`start${dragging ? " dragging" : ""}`} role="alert">
            <span className="eyebrow">Open GPX</span>
            <h1 className="title">This file could not be read</h1>
            <p className="lede">{loadHint(error)}</p>
            <div className="ledger">
              <OpenFile className="ledger-row">Open another GPX</OpenFile>
            </div>
            <p className="note detail">gpxz said: {error}</p>
          </div>
        )}
        {status === "ready" && (
          <div ref={workspaceRef} className={`workspace${isFullscreen ? " is-fullscreen" : ""}`}>
            <div className="map">
              <ErrorBoundary message="The map failed to load.">
                <EditorMap isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen}>
                  {(notice || pending) && (
                    <p className="notice" role="status">
                      {pending
                        ? "The route passes here more than once: pick the one you mean. "
                        : `${notice} `}
                      {pending && (
                        <button type="button" onClick={cancelPending}>
                          Cancel
                        </button>
                      )}
                    </p>
                  )}
                </EditorMap>
              </ErrorBoundary>
            </div>
            <aside>
              <PinPanel />
              <PlanPanel />
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </Layout>
  );
}
