import { FolderPlus } from "@styled-icons/feather/FolderPlus";
import { useRef } from "react";

import useStore from "../../store/store.js";

// The Open GPX button and its hidden file input. One is on the page at a time (the empty
// screen's, the error's, or the toolbar's), so the input keeps a single test id.
export default function OpenFile({ className, children = "Open GPX" }) {
  const inputRef = useRef(null);
  const openFile = useStore((state) => state.openFile);

  return (
    <>
      <button type="button" className={className} onClick={() => inputRef.current?.click()}>
        <FolderPlus size={16} /> {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,text/xml"
        hidden
        data-testid="file-input"
        onChange={(event) => {
          const [file] = event.target.files;
          if (file) openFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}
