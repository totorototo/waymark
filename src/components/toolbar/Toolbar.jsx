import { Download } from "@styled-icons/feather/Download";
import { FolderPlus } from "@styled-icons/feather/FolderPlus";
import { useRef, useState } from "react";

import { timeZones } from "../../gpx/time.js";
import useStore from "../../store/store.js";
import style from "./Toolbar.style.js";

// The browser's download of bytes it holds: a link to a Blob, clicked.
export function download(name, bytes) {
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/gpx+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Toolbar({ className }) {
  const inputRef = useRef(null);
  const [exportError, setExportError] = useState(null);
  const status = useStore((state) => state.status);
  const fileName = useStore((state) => state.fileName);
  const dirty = useStore((state) => state.dirty);
  const timeZone = useStore((state) => state.timeZone);
  const loadFile = useStore((state) => state.loadFile);
  const setTimeZone = useStore((state) => state.setTimeZone);
  const exportFile = useStore((state) => state.exportFile);

  const onExport = async () => {
    try {
      setExportError(null);
      const { name, bytes } = await exportFile();
      download(name, bytes);
    } catch (err) {
      setExportError(err.message);
    }
  };

  return (
    <header className={className}>
      <button type="button" onClick={() => inputRef.current?.click()}>
        <FolderPlus size={16} /> Open GPX
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,text/xml"
        hidden
        data-testid="file-input"
        onChange={(event) => {
          const [file] = event.target.files;
          if (file) loadFile(file);
          event.target.value = "";
        }}
      />
      {fileName && (
        <span className="file">
          {fileName}
          {dirty ? " •" : ""}
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
      {exportError && (
        <p role="alert" className="error">
          {exportError}
        </p>
      )}
    </header>
  );
}

export default style(Toolbar);
