import { ChevronRight } from "@styled-icons/feather/ChevronRight";
import { useState } from "react";

import { marginTier, shownMargin } from "../../gpx/planRows.js";
import { slowestPace } from "../../gpx/review.js";
import useStore from "../../store/store.js";
import {
  formatClock,
  formatDuration,
  formatKm,
  formatMargin,
  formatPace,
  formatShortClock,
  parsePace,
} from "../../utils/format.js";
import style from "./PlanPanel.style.js";

// One line for the plan: when the runner at this pace finishes, and how close they come to a
// cutoff. Not the Start's margin: its cutoff is the start itself, always 0.
function summary(checkpoints, timeZone) {
  const timed = checkpoints.slice(1).filter((entry) => entry.epoch_s_cutoff);
  const late = timed.filter((entry) => entry.margin_s < 0);
  const finish = checkpoints.at(-1);
  const finishText = `Finish ${formatClock(finish.epoch_s_arrival, timeZone)}.`;
  if (late.length > 0) {
    const names = late.map((entry) => entry.name).join(", ");
    return {
      late: true,
      text: `${finishText} Misses ${late.length === 1 ? "the cutoff" : "cutoffs"} at ${names}.`,
    };
  }
  if (timed.length === 0) return { late: false, text: finishText };
  const tightest = timed.reduce((best, entry) => (entry.margin_s < best.margin_s ? entry : best));
  return {
    late: false,
    text: `${finishText} Tightest spare ${formatMargin(shownMargin(tightest))} at ${tightest.name}.`,
  };
}

// A table folded under its name, as a pin's editor folds: closed until asked for.
// why a button and a fold, not <details>: a native details only animates in recent Chrome.
function Fold({ id, label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="fold-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronRight size={16} aria-hidden="true" />
        {label}
      </button>
      <div id={id} className={`fold${open ? " open" : ""}`} inert={!open}>
        <div className="fold-inner">{children}</div>
      </div>
    </>
  );
}

function PlanPanel({ className }) {
  const plan = useStore((state) => state.plan);
  const planError = useStore((state) => state.planError);
  const planStatus = useStore((state) => state.planStatus);
  const settings = useStore((state) => state.settings);
  const timeZone = useStore((state) => state.timeZone);
  const setPace = useStore((state) => state.setPace);
  const [paceText, setPaceText] = useState(formatPace(settings.pace_base_s_per_km).split(" ")[0]);

  const sections = plan?.sections ?? [];
  const checkpoints = plan?.plan ?? [];
  const line = checkpoints.length > 0 ? summary(checkpoints, timeZone) : null;
  // Clock times on the race's first day read as "08:38"; later days add the weekday.
  const raceDay = checkpoints[0]?.epoch_s_arrival;
  const clock = (epoch) => formatShortClock(epoch, timeZone, raceDay);

  return (
    <section className={className} aria-label="Plan">
      <h2>Plan {planStatus === "computing" && <small>updating…</small>}</h2>

      <div className="pace">
        <label>
          Runner&apos;s pace (min/km)
          <input
            value={paceText}
            inputMode="numeric"
            aria-invalid={parsePace(paceText) === null}
            aria-describedby="pace-hint"
            onChange={(event) => {
              setPaceText(event.target.value);
              const pace = parsePace(event.target.value);
              if (pace !== null) setPace(pace);
            }}
          />
        </label>
        <p id="pace-hint">
          On the flat, before climbs and fatigue. For the estimates only: not in the export.
        </p>
      </div>

      {planError && <p role="alert">The plan could not be built: {planError}</p>}

      {line && <p className={`summary${line.late ? " late" : ""}`}>{line.text}</p>}

      {/* why folded, and here: Waymark edits the director's file; the plan is a prediction
          at the pace above, so each checkpoint's arrival and spare sit in the Plan, not on
          the pins. The sections are what a director checks once (is a time barrier humane?). */}
      {checkpoints.length > 0 && (
        <Fold id="plan-checkpoints" label={`Checkpoints (${checkpoints.length})`}>
          <table>
            <thead>
              <tr>
                <th scope="col">Checkpoint</th>
                <th scope="col">Arrives</th>
                <th scope="col">Cutoff</th>
                <th
                  scope="col"
                  title="Spare at departure: the cutoff minus the planned arrival and stop"
                >
                  Spare
                </th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((entry, index) => {
                // The Start's cutoff is the start itself: its spare is always 0.
                const spare = index === 0 ? null : shownMargin(entry);
                return (
                  <tr key={index} className={marginTier(spare) === "over" ? "late" : ""}>
                    <th scope="row">{entry.name}</th>
                    <td>{clock(entry.epoch_s_arrival)}</td>
                    <td>{clock(entry.epoch_s_cutoff)}</td>
                    <td>{spare === null ? "–" : formatMargin(spare)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Fold>
      )}

      {sections.length > 0 && (
        <Fold id="plan-sections" label={`Sections (${sections.length})`}>
          <table>
            <thead>
              <tr>
                <th scope="col">Section</th>
                <th scope="col">Dist.</th>
                <th scope="col">D+</th>
                <th scope="col">Allowed</th>
                <th scope="col" title="The slowest average pace that still makes the cutoff">
                  Slowest pace
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => (
                <tr key={index}>
                  <th scope="row">
                    {section.location_start} → {section.location_end}
                  </th>
                  <td>{formatKm(section.distance_m)}</td>
                  <td>{Math.round(section.elevation_gain_m)} m</td>
                  <td>{formatDuration(section.duration_s_cutoff)}</td>
                  <td>{formatPace(slowestPace(section))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Fold>
      )}
    </section>
  );
}

export default style(PlanPanel);
