import styled from "styled-components";

const style = (Component) => styled(Component)`
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-size: var(--font-size);
    font-weight: var(--font-weight-bold);
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
    padding: 0;
    background: none;
    border: 0;
    color: var(--color-primary-text);
    font: inherit;
    font-weight: var(--font-weight-bold);
    text-decoration: underline;
    cursor: pointer;
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
    padding: 0.375rem 0.5rem;
    background: var(--color-field);
    border: 1px solid var(--color-field-border);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
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

  .clock {
    margin-bottom: 0.75rem;
  }

  .clock input[aria-invalid="true"],
  .add input[aria-invalid="true"] {
    border-color: var(--color-behind-text);
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
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-field-border);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
    cursor: pointer;
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
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: none;
    border: 1px solid var(--color-accent-text);
    border-radius: var(--border-radius-sm);
    color: var(--color-accent-text);
    font: inherit;
    font-size: var(--font-size-tiny);
    cursor: pointer;
  }

  /* Quiet: rare, behind a confirmation, and undoable. */
  .clear {
    padding: 0.25rem 0;
    background: none;
    border: 0;
    color: var(--color-text-muted);
    font: inherit;
    font-size: var(--font-size-tiny);
    text-decoration: underline;
    cursor: pointer;
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
    padding: 0.375rem 0.625rem;
    background: none;
    border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-tiny);
    cursor: pointer;
  }
`;

export default style;
