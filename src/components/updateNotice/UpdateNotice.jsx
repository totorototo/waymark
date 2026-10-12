import useAppUpdate from "../../store/appUpdate.js";
import useStore from "../../store/store.js";
import style from "./UpdateNotice.style.js";

// A new build is ready. Offered only with nothing unsaved: the reload would drop the pins.
// With edits open it waits for the export, or for the next visit.
function UpdateNotice({ className }) {
  const apply = useAppUpdate((state) => state.apply);
  const dirty = useStore((state) => state.dirty);
  if (!apply || dirty) return null;

  return (
    <p className={className} role="status">
      A new version of waymark is ready.
      <button type="button" onClick={apply}>
        Reload
      </button>
    </p>
  );
}

export default style(UpdateNotice);
