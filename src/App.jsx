import { useEffect, useState } from "react";

import { registerWebMcp } from "./agent/webmcp.js";
import { Layout } from "./App.style.js";
import EditorMap from "./components/editorMap/EditorMap.jsx";
import ErrorBoundary from "./components/errorBoundary/ErrorBoundary.jsx";
import Footer from "./components/footer/Footer.jsx";
import LoadingSpinner from "./components/loadingSpinner/LoadingSpinner.jsx";
import PinPanel from "./components/pinPanel/PinPanel.jsx";
import PlanPanel from "./components/planPanel/PlanPanel.jsx";
import ThemeToggle from "./components/themeToggle/ThemeToggle.jsx";
import Toolbar from "./components/toolbar/Toolbar.jsx";
import useStore from "./store/store.js";

export default function App() {
  const [dragging, setDragging] = useState(false);
  const status = useStore((state) => state.status);
  const error = useStore((state) => state.error);
  const notice = useStore((state) => state.notice);
  const pending = useStore((state) => state.pending);
  const cancelPending = useStore((state) => state.cancelPending);
  const loadFile = useStore((state) => state.loadFile);

  // The checkpoint tools for an agent in the browser, while the editor is on screen.
  useEffect(() => registerWebMcp(useStore), []);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const [file] = event.dataTransfer.files;
    if (file) loadFile(file);
  };

  return (
    <Layout
      $dragging={dragging}
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
          <p className="empty">
            Open the race director&apos;s GPX (or drop it here), click the route to pin checkpoints,
            set their cutoffs, then export.
          </p>
        )}
        {status === "loading" && <LoadingSpinner label="Reading the route…" />}
        {status === "error" && (
          <p role="alert" className="error">
            This file could not be read: {error}
          </p>
        )}
        {status === "ready" && (
          <div className="workspace">
            <div className="map">
              <ErrorBoundary message="The map failed to load.">
                <EditorMap>
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
