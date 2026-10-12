import { Download } from "@styled-icons/feather/Download";
import { useState } from "react";

import { timeZones } from "../../gpx/time.js";
import useStore from "../../store/store.js";
import { download } from "../../utils/download.js";
import OpenFile from "../openFile/OpenFile.jsx";
import style from "./Toolbar.style.js";

function Toolbar({ className }) {
  const [exportError, setExportError] = useState(null);
  const status = useStore((state) => state.status);
  const fileName = useStore((state) => state.fileName);
  const dirty = useStore((state) => state.dirty);
  const timeZone = useStore((state) => state.timeZone);
  const setTimeZone = useStore((state) => state.setTimeZone);
  const pendingFile = useStore((state) => state.pendingFile);
  const confirmOpen = useStore((state) => state.confirmOpen);
  const cancelOpen = useStore((state) => state.cancelOpen);
  const exportFile = useStore((state) => state.exportFile);

  const onExport = async () => {
    try {
      setExportError(null);
      const { name, bytes } = await exportFile({ markSaved: true });
      download(name, bytes);
    } catch (err) {
      setExportError(err.message);
    }
  };

  // Before a file is open, and when one could not be read, the page itself offers to open
  // one: nothing to show here but the name.
  if (status === "idle" || status === "error") {
    return (
      <header className={className}>
        <span className="brand">waymark</span>
      </header>
    );
  }

  return (
    <header className={className}>
      <OpenFile />
      {fileName && (
        <span className="doc">
          <span className="file" title={fileName}>
            {fileName}
          </span>
          {dirty && <span className="unsaved">Unsaved changes</span>}
        </span>
      )}
      <label className="zone">
        Race clock
        <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
          {[...new Set([timeZone, ...timeZones()])].map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="export" disabled={status !== "ready"} onClick={onExport}>
        <Download size={16} /> Export GPX
      </button>
      {pendingFile && (
        <div className="confirm" role="alert">
          <p>
            Open {pendingFile.name}? Your unsaved changes to {fileName} will be lost: export first
            to keep them.
          </p>
          <button type="button" className="discard" onClick={confirmOpen}>
            Discard and open
          </button>
          <button type="button" onClick={cancelOpen}>
            Keep editing
          </button>
        </div>
      )}
      {exportError && (
        <p role="alert" className="error">
          {exportError}
        </p>
      )}
    </header>
  );
}

export default style(Toolbar);
