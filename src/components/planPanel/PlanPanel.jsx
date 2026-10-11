import { useMemo, useState } from "react";

import { validatePins } from "../../gpx/pins.js";
import { slowestPace } from "../../gpx/review.js";
import useStore from "../../store/store.js";
import {
  formatClock,
  formatDuration,
  formatKm,
  formatPace,
  parsePace,
} from "../../utils/format.js";
import style from "./PlanPanel.style.js";

function PlanPanel({ className }) {
  const pins = useStore((state) => state.pins);
  const plan = useStore((state) => state.plan);
  const planError = useStore((state) => state.planError);
  const planStatus = useStore((state) => state.planStatus);
  const settings = useStore((state) => state.settings);
  const timeZone = useStore((state) => state.timeZone);
  const setPace = useStore((state) => state.setPace);
  const selectPin = useStore((state) => state.selectPin);
  const [paceText, setPaceText] = useState(formatPace(settings.pace_base_s_per_km).split(" ")[0]);

  const issues = useMemo(() => validatePins(pins), [pins]);
  const sections = plan?.sections ?? [];
  const checkpoints = plan?.plan ?? [];

  return (
    <section className={className} aria-label="Plan">
      <h2>Plan {planStatus === "computing" && <small>updating…</small>}</h2>

      <label className="pace">
        Pace (min/km)
        <input
          value={paceText}
          inputMode="numeric"
          aria-invalid={parsePace(paceText) === null}
          onChange={(event) => {
            setPaceText(event.target.value);
            const pace = parsePace(event.target.value);
            if (pace !== null) setPace(pace);
          }}
        />
      </label>

      {issues.length > 0 && (
        <ul className="issues">
          {issues.map((issue, index) => (
            <li key={index} className={issue.level}>
              {issue.pinId ? (
                <button type="button" onClick={() => selectPin(issue.pinId)}>
                  {issue.message}
                </button>
              ) : (
                issue.message
              )}
            </li>
          ))}
        </ul>
      )}

      {planError && <p role="alert">The plan could not be built: {planError}</p>}

      {sections.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Dist.</th>
              <th scope="col">D+</th>
              <th scope="col">Allowed</th>
              <th scope="col">Pace to make it</th>
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
      )}

      {checkpoints.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Checkpoint</th>
              <th scope="col">Estimated</th>
              <th scope="col">Cutoff</th>
              <th scope="col">Margin</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((entry, index) => (
              <tr key={index} className={entry.margin_s < 0 ? "late" : ""}>
                <th scope="row">{entry.name}</th>
                <td>{formatClock(entry.epoch_s_arrival, timeZone)}</td>
                <td>{formatClock(entry.epoch_s_cutoff, timeZone)}</td>
                <td>{entry.epoch_s_cutoff ? formatDuration(entry.margin_s) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default style(PlanPanel);
