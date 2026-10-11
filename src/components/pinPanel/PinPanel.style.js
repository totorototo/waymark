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
    grid-template-columns: 1.5rem 1fr auto;
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
    background: var(--color-background);
    border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
  }

  small {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
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
