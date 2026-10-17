import styled from "styled-components";

import { chip, chipDanger, field, fold, foldInner, textButton } from "../../theme/controls.js";
import { eyebrow } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
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
    gap: 0.25rem;
    margin-bottom: 0.5rem;
    padding: 0.375rem 0.5rem;
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
    gap: 0.25rem;
    margin-bottom: 0.5rem;
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
    gap: 0.75rem;
    width: 100%;
    min-height: 44px;
    padding: 1rem 0;
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
    gap: 0.5rem;
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
    margin-top: 0.25rem;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .key {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.375rem;
    white-space: nowrap;
  }

  .time {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-bold);
  }

  /* Outlined, no tint: a 14% fill dropped the label under 4.5:1. The word carries the state. */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1875rem 0.5rem;
    border: 1px solid currentColor;
    border-radius: var(--border-radius-lg);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .tier-ok {
    color: var(--color-success-text);
  }

  .tier-tight {
    color: var(--color-primary-text);
  }

  .tier-over {
    color: var(--color-behind-text);
  }

  .flag {
    display: flex;
    align-self: center;
  }

  .index {
    font-family: var(--font-family-mono);
    color: var(--color-text-muted);
  }

  /* Plan arrives and Spare at departure: value over label. */
  .figures {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem 1.5rem;
    padding: 0.75rem;
    border-radius: var(--border-radius-md);
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
  }

  /* The last plan's figures while the next one computes (a few hundred ms after an edit):
     dimmed as a passed row is, so a stale margin never reads as current. */
  .is-updating {
    opacity: 0.55;
    transition: opacity var(--transition-base);
  }

  .figure {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.125rem;
  }

  .figure-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .figure-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);

    &.is-over {
      color: var(--color-behind-text);
    }
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
    gap: 0.5rem;
    padding: 0 0 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
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
    gap: 0.125rem;
    padding: 0;
    border: 0;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .cutoff legend {
    padding: 0;
    margin-bottom: 0.125rem;
  }

  .cutoff div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 7rem);
    gap: 0.375rem;
  }

  /* The route's setting, not a pin's: labelled as a section, above the pins. */
  .clock {
    ${eyebrow}
    gap: 0.375rem;
    margin-bottom: 0.75rem;
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.5rem;
    margin-top: 0.75rem;
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
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding: 0.5rem;
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
