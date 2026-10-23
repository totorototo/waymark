import styled from "styled-components";

import { chip, chipDanger, field, fold, foldInner, textButton } from "../../theme/controls.js";
import { eyebrow } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  h2 {
    ${eyebrow}
  }

  .count {
    margin-right: auto;
    font-size: var(--font-size-tiny);
    color: var(--color-secondary-text);
  }

  .undo {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    padding: var(--space-2) var(--space-2);
    background: var(--color-surface);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-small);
  }

  .undo button {
    ${textButton}
    font-weight: var(--font-weight-bold);
  }

  .issues {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    list-style: none;
    font-size: var(--font-size-tiny);
  }

  /* level-*, not .error: the page's .error (a file it could not read) would apply here too. */
  .level-error {
    color: var(--color-behind-text);
  }

  .level-warning {
    color: var(--color-secondary-text);
  }

  .empty {
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  ol {
    display: flex;
    flex-direction: column;
    list-style: none;
  }

  /* The suite's checkpoint row (design system CheckpointRow): not boxed, so the row is not a
     card inside the panel's card; a hairline between rows, the open one's name in primary. */
  li {
    border-bottom: 1px solid var(--color-hairline);
  }

  li:last-child {
    border-bottom: 0;
  }

  li.selected .name {
    color: var(--color-primary-text);
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
    min-height: 44px;
    padding: var(--space-4) 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .top {
    display: grid;
    grid-template-columns: 1.5rem 1fr auto 1rem;
    align-items: baseline;
    gap: var(--space-2);
  }

  .label {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name,
  .meta {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .name {
    font-weight: var(--font-weight-bold);
  }

  .meta {
    margin-top: var(--space-1);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .key {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    white-space: nowrap;
  }

  .time {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-bold);
  }

  .flag {
    display: flex;
    align-self: center;
  }

  .index {
    font-family: var(--font-family-mono);
    color: var(--color-text-muted);
  }

  .fold {
    ${fold}
  }

  .fold-inner {
    ${foldInner}
  }

  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: 0 0 var(--space-4);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--space-hair);
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  input,
  select,
  textarea {
    ${field}
  }

  .cutoff {
    display: flex;
    flex-direction: column;
    gap: var(--space-hair);
    padding: 0;
    border: 0;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .cutoff legend {
    padding: 0;
    margin-bottom: var(--space-hair);
  }

  .cutoff div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 7rem);
    gap: var(--space-2);
  }

  /* The route's setting, not a pin's: labelled as a section, above the pins. */
  .clock {
    ${eyebrow}
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .add label {
    flex: 1 1 8rem;
  }

  .add button {
    ${chip}
  }

  .add p {
    flex-basis: 100%;
    font-size: var(--font-size-tiny);
  }

  .remove {
    ${chipDanger}
    align-self: flex-start;
  }

  /* Quiet: rare, behind a confirmation, and undoable. */
  .clear {
    ${textButton}
    color: var(--color-text-muted);
    font-size: var(--font-size-tiny);
  }

  .clear:hover {
    color: var(--color-accent-text);
  }

  .confirm {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    background: var(--color-surface);
    border: 1px solid var(--color-accent-text);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-small);
  }

  .confirm p {
    flex-basis: 100%;
  }

  .keep {
    ${chip}
  }
`;

export default style;
