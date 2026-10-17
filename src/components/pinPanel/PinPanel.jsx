import { AlertCircle } from "@styled-icons/feather/AlertCircle";
import { AlertTriangle } from "@styled-icons/feather/AlertTriangle";
import { Plus } from "@styled-icons/feather/Plus";
import { Trash2 } from "@styled-icons/feather/Trash2";
import { useEffect, useMemo, useRef, useState } from "react";

import { startTime, TYPE_LABELS, validatePins, WAYPOINT_TYPES } from "../../gpx/pins.js";
import { epochToUtc, epochToZoned, timeZones, zonedToEpoch } from "../../gpx/time.js";
import useStore from "../../store/store.js";
import { FOLD_MS } from "../../theme/controls.js";
import { formatKm, formatShortClock } from "../../utils/format.js";
import style from "./PinPanel.style.js";

function Issues({ issues }) {
  return (
    <ul className="issues">
      {issues.map((issue, index) => (
        <li key={index} className={`level-${issue.level}`}>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

// What a row says about a pin under its name: its type and where it is. The cutoff is the
// row's key time, on the right.
function rowMeta(pin) {
  const type = pin.type_name ? TYPE_LABELS[pin.type_name] : "Landmark";
  return `${type} · ${formatKm(pin.distance_m)}`;
}

// The race's time zone, typed with suggestions: about 400 zones are too many for a select.
function RaceClock() {
  const timeZone = useStore((state) => state.timeZone);
  const setTimeZone = useStore((state) => state.setTimeZone);
  const zones = useMemo(() => [...new Set([timeZone, ...timeZones()])], [timeZone]);
  // What is being typed, null when not: the field shows the store's zone otherwise.
  const [draft, setDraft] = useState(null);
  const text = draft ?? timeZone;

  return (
    <label className="clock">
      Race clock
      <input
        list="time-zones"
        value={text}
        spellCheck={false}
        aria-invalid={!zones.includes(text)}
        onChange={(event) => {
          setDraft(event.target.value);
          // Only a zone from the list: Intl also takes "europe/paris", which then shows as typed.
          if (zones.includes(event.target.value)) setTimeZone(event.target.value);
        }}
        onFocus={(event) => event.target.select()}
        onBlur={() => setDraft(null)}
      />
      <datalist id="time-zones">
        {zones.map((zone) => (
          <option key={zone} value={zone} />
        ))}
      </datalist>
    </label>
  );
}

// The day a time typed alone falls on: the Start's, else today, on the race's clock.
function defaultDay(pins, timeZone) {
  const epoch = startTime(pins) ?? Math.floor(Date.now() / 1000);
  return epochToZoned(epoch, timeZone).slice(0, 10);
}

// A pin's fields. The cutoff is typed on the race's clock and kept as UTC seconds.
// why a date and a time, not one datetime-local: the race day is typed once (the Start's,
// which new checkpoints take); on each checkpoint only the time changes, and a time field
// takes "10:30" straight away.
function PinEditor({ pin, issues, timeZone, fallbackDay, focusTime, onChange, onRemove }) {
  const cutoff = pin.epoch_s === null ? "" : epochToZoned(pin.epoch_s, timeZone);
  const day = cutoff.slice(0, 10);
  const time = cutoff.slice(11, 16);
  const stopMinutes = pin.stop_s === null ? "" : String(Math.round(pin.stop_s / 60));
  const timeRef = useRef(null);

  // Not on a touch screen: the keyboard would cover the map after every tap that adds a pin.
  useEffect(() => {
    const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? true;
    if (focusTime && finePointer) timeRef.current?.focus({ preventScroll: true });
  }, [focusTime]);

  const setCutoff = (nextDay, nextTime) => {
    if (nextDay === "" && nextTime === "") return onChange({ epoch_s: null });
    const epoch_s = zonedToEpoch(`${nextDay || fallbackDay}T${nextTime || "00:00"}`, timeZone);
    if (epoch_s !== null) onChange({ epoch_s });
    return undefined;
  };

  return (
    <form className="editor" onSubmit={(event) => event.preventDefault()}>
      {issues.length > 0 && <Issues issues={issues} />}
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
      {/* The UTC the file will carry, on hover: what the race clock means is plain enough. */}
      <fieldset
        className="cutoff"
        title={pin.epoch_s === null ? undefined : `Saved as ${epochToUtc(pin.epoch_s)}`}
      >
        <legend>Cutoff ({timeZone})</legend>
        <div>
          <input
            type="date"
            aria-label="Cutoff day"
            value={day}
            onChange={(event) => setCutoff(event.target.value, time)}
          />
          <input
            ref={timeRef}
            type="time"
            aria-label="Cutoff time"
            value={time}
            onChange={(event) => setCutoff(day, event.target.value)}
          />
        </div>
      </fieldset>
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

// A pin at a distance typed in: from a spreadsheet of km, or without a mouse.
function AddAtKm() {
  const addAtDistance = useStore((state) => state.addAtDistance);
  const [km, setKm] = useState("");
  const [error, setError] = useState(null);

  const onSubmit = async (event) => {
    event.preventDefault();
    const value = Number(km.replace(",", "."));
    if (km.trim() === "" || !Number.isFinite(value) || value < 0) {
      setError("Type a distance in km, such as 12.5.");
      return;
    }
    const result = await addAtDistance(Math.round(value * 1000));
    setError(result.ok ? null : result.error);
    if (result.ok) setKm("");
  };

  return (
    <form className="add" onSubmit={onSubmit}>
      <label>
        Add a pin at km
        <input
          inputMode="decimal"
          value={km}
          placeholder="12.5"
          aria-invalid={error !== null}
          onChange={(event) => setKm(event.target.value)}
        />
      </label>
      <button type="submit">
        <Plus size={14} /> Add
      </button>
      {error && (
        <p role="alert" className="level-error">
          {error}
        </p>
      )}
    </form>
  );
}

function PinPanel({ className }) {
  const pins = useStore((state) => state.pins);
  const selectedId = useStore((state) => state.selectedId);
  const addedId = useStore((state) => state.addedId);
  const timeZone = useStore((state) => state.timeZone);
  const selectPin = useStore((state) => state.selectPin);
  const updatePin = useStore((state) => state.updatePin);
  const removePin = useStore((state) => state.removePin);
  const clearPins = useStore((state) => state.clearPins);
  const undo = useStore((state) => state.undo);
  const undoLast = useStore((state) => state.undoLast);
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef(null);

  // The pin whose editor is folding shut: it stays mounted until the fold has closed, so the
  // form slides away instead of vanishing. Only the open and the closing pin hold an editor.
  // why set during render: the previous selection is known only here; React re-renders at
  // once with it, before painting (the "storing information from previous renders" pattern).
  const [shownId, setShownId] = useState(selectedId);
  const [closingId, setClosingId] = useState(null);
  if (shownId !== selectedId) {
    setClosingId(shownId);
    setShownId(selectedId);
  }
  useEffect(() => {
    if (closingId === null) return undefined;
    const timer = setTimeout(() => setClosingId(null), FOLD_MS);
    return () => clearTimeout(timer);
  }, [closingId]);

  // why here, not in the Plan: an issue is about a pin, so it shows on that pin's row, where
  // the fix is; only what no single pin owns (no Start, no Arrival) goes above the list.
  const issues = useMemo(() => validatePins(pins), [pins]);
  const routeIssues = issues.filter((issue) => issue.pinId === null);
  const issuesOf = (id) => issues.filter((issue) => issue.pinId === id);
  // Clock times on the race's first day read as "08:38"; later days add the weekday, as in
  // the Plan's tables.
  const raceDay = startTime(pins);
  const clock = (epoch) => formatShortClock(epoch, timeZone, raceDay);

  // A pin picked on the map opens here: bring it into view, in the panel or on a phone's page.
  useEffect(() => {
    if (!selectedId) return;
    const item = listRef.current?.querySelector(`[data-pin="${selectedId}"]`);
    // why: scrollIntoView's smooth scroll is JS-driven, so the global reduced-motion rule
    // (CSS transitions and animations only) does not reach it: check the preference here.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    item?.scrollIntoView?.({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <section className={className} aria-label="Pins">
      <header>
        <h2>Pins ({pins.length})</h2>
        {issues.length > 0 && (
          <span className="count">
            {issues.length === 1 ? "1 issue" : `${issues.length} issues`}
          </span>
        )}
        {pins.length > 0 && !confirming && (
          <button type="button" className="clear" onClick={() => setConfirming(true)}>
            Remove all
          </button>
        )}
      </header>
      <RaceClock />
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
      {undo && (
        <p className="undo" role="status">
          {undo.label}.{" "}
          <button type="button" onClick={undoLast}>
            Undo
          </button>
        </p>
      )}
      {pins.length === 0 && (
        <p className="empty">Click the route on the map, or add a pin at a distance below.</p>
      )}
      {routeIssues.length > 0 && <Issues issues={routeIssues} />}
      <ol ref={listRef}>
        {pins.map((pin, index) => {
          const own = issuesOf(pin.id);
          const level = own.some((issue) => issue.level === "error") ? "error" : "warning";
          const Flag = level === "error" ? AlertCircle : AlertTriangle;
          return (
            <li key={pin.id} data-pin={pin.id} className={pin.id === selectedId ? "selected" : ""}>
              <button
                type="button"
                className="row"
                aria-expanded={pin.id === selectedId}
                onClick={() => selectPin(pin.id === selectedId ? null : pin.id)}
              >
                <span className="top">
                  <span className="index">{index + 1}</span>
                  <span className="label">
                    <span className="name">{pin.name || "Unnamed pin"}</span>
                    <span className="meta">{rowMeta(pin)}</span>
                  </span>
                  {/* why only the cutoff: a pin row shows what the director sets in the
                      file. The pace plan's predictions (arrival, spare) are the Plan's. */}
                  <span className="key">
                    {pin.epoch_s !== null && <span className="time">{clock(pin.epoch_s)}</span>}
                  </span>
                  <span className={`flag level-${level}`}>
                    {own.length > 0 && (
                      <Flag
                        size={16}
                        title={own.length === 1 ? "1 issue" : `${own.length} issues`}
                      />
                    )}
                  </span>
                </span>
              </button>
              <div
                className={`fold${pin.id === selectedId ? " open" : ""}`}
                inert={pin.id !== selectedId}
              >
                <div className="fold-inner">
                  {(pin.id === selectedId || pin.id === closingId) && (
                    <PinEditor
                      pin={pin}
                      issues={own}
                      timeZone={timeZone}
                      fallbackDay={defaultDay(pins, timeZone)}
                      focusTime={pin.id === addedId}
                      onChange={(patch) => updatePin(pin.id, patch)}
                      onRemove={() => removePin(pin.id)}
                    />
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <AddAtKm />
    </section>
  );
}

export default style(PinPanel);
