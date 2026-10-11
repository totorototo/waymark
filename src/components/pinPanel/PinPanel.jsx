import { Trash2 } from "@styled-icons/feather/Trash2";
import { useState } from "react";

import { TYPE_LABELS, WAYPOINT_TYPES } from "../../gpx/pins.js";
import { epochToUtc, epochToZoned, zonedToEpoch } from "../../gpx/time.js";
import useStore from "../../store/store.js";
import { formatKm } from "../../utils/format.js";
import style from "./PinPanel.style.js";

// A pin's fields. The cutoff is typed on the race's clock and kept as UTC seconds.
function PinEditor({ pin, timeZone, onChange, onRemove }) {
  const cutoff = pin.epoch_s === null ? "" : epochToZoned(pin.epoch_s, timeZone);
  const stopMinutes = pin.stop_s === null ? "" : String(Math.round(pin.stop_s / 60));

  return (
    <form className="editor" onSubmit={(event) => event.preventDefault()}>
      <label>
        Name
        <input value={pin.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label>
        Type
        <select
          value={pin.type_name ?? ""}
          onChange={(event) => onChange({ type_name: event.target.value || null })}
        >
          <option value="">Landmark (no type)</option>
          {WAYPOINT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cutoff ({timeZone})
        <input
          type="datetime-local"
          value={cutoff}
          onChange={(event) => {
            const value = event.target.value;
            onChange({ epoch_s: value === "" ? null : zonedToEpoch(value, timeZone) });
          }}
        />
        {pin.epoch_s !== null && <small>Saved as {epochToUtc(pin.epoch_s)}</small>}
      </label>
      <label>
        Stop (minutes)
        <input
          type="number"
          min="0"
          step="1"
          value={stopMinutes}
          onChange={(event) => {
            const minutes = event.target.value;
            onChange({ stop_s: minutes === "" ? null : Math.max(0, Number(minutes)) * 60 });
          }}
        />
      </label>
      <label>
        Description
        <textarea
          rows={2}
          value={pin.description ?? ""}
          onChange={(event) => onChange({ description: event.target.value || null })}
        />
      </label>
      <button type="button" className="remove" onClick={onRemove}>
        <Trash2 size={14} /> Remove pin
      </button>
    </form>
  );
}

function PinPanel({ className }) {
  const pins = useStore((state) => state.pins);
  const selectedId = useStore((state) => state.selectedId);
  const timeZone = useStore((state) => state.timeZone);
  const selectPin = useStore((state) => state.selectPin);
  const updatePin = useStore((state) => state.updatePin);
  const removePin = useStore((state) => state.removePin);
  const clearPins = useStore((state) => state.clearPins);
  const [confirming, setConfirming] = useState(false);

  return (
    <section className={className} aria-label="Pins">
      <header>
        <h2>Pins ({pins.length})</h2>
        {pins.length > 0 && !confirming && (
          <button type="button" className="remove" onClick={() => setConfirming(true)}>
            <Trash2 size={14} /> Remove all
          </button>
        )}
      </header>
      {/* why: inline, not window.confirm: it blocks the page, can't be styled or tested. */}
      {confirming && pins.length > 0 && (
        <div className="confirm" role="alert">
          <p>
            {pins.length === 1 ? "Remove the pin?" : `Remove all ${pins.length} pins?`} The exported
            file will have no waypoints; the file you opened is not changed.
          </p>
          <button
            type="button"
            className="remove"
            onClick={() => {
              clearPins();
              setConfirming(false);
            }}
          >
            Remove all
          </button>
          <button type="button" className="keep" onClick={() => setConfirming(false)}>
            Keep them
          </button>
        </div>
      )}
      {pins.length === 0 && <p className="empty">Click the route on the map to add a pin.</p>}
      <ol>
        {pins.map((pin, index) => (
          <li key={pin.id} className={pin.id === selectedId ? "selected" : ""}>
            <button
              type="button"
              className="row"
              aria-expanded={pin.id === selectedId}
              onClick={() => selectPin(pin.id === selectedId ? null : pin.id)}
            >
              <span className="index">{index + 1}</span>
              <span className="name">{pin.name || "Unnamed pin"}</span>
              <span className="km">{formatKm(pin.distance_m)}</span>
            </button>
            {pin.id === selectedId && (
              <PinEditor
                pin={pin}
                timeZone={timeZone}
                onChange={(patch) => updatePin(pin.id, patch)}
                onRemove={() => removePin(pin.id)}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default style(PinPanel);
