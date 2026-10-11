import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
  /* Clear of the theme toggle fixed in the top-right corner. */
  padding: 1rem calc(1.25rem + 44px + 1rem) 1rem 1rem;

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    background: var(--color-surface);
    border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
    cursor: pointer;
  }

  button.export {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-background);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .file {
    align-self: center;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
  }

  .zone {
    display: flex;
    flex-direction: column;
    margin-left: auto;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .zone select {
    padding: 0.375rem 0.5rem;
    background: var(--color-surface);
    border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
  }

  .error {
    flex-basis: 100%;
    font-size: var(--font-size-tiny);
    color: var(--color-behind-text);
  }
`;

export default style;
