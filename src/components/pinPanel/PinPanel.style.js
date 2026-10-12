import styled from "styled-components";

import { chip, chipDanger, field, textButton } from "../../theme/controls.js";
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
    gap: 0.25rem;
    list-style: none;
  }

  li {
    background: var(--color-surface);
    border: 1px solid transparent;
    border-radius: var(--border-radius-sm);
  }

  li.selected {
    border-color: var(--color-primary);
  }

  .row {
    display: grid;
    grid-template-columns: 1.5rem 1fr auto 1rem;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    font-size: var(--font-size-small);
    text-align: left;
    cursor: pointer;
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

  .meta {
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .flag {
    display: flex;
  }

  .index,
  .km {
    font-family: var(--font-family-mono);
    color: var(--color-text-muted);
  }

  .editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 0.5rem 0.5rem;
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

  /* On a phone the map is sticky over the page: a pin scrolled into view lands under it. */
  @media (max-width: 52em) {
    li {
      scroll-margin-top: 46vh;
    }
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
