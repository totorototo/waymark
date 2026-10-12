import styled from "styled-components";

const style = (Component) => styled(Component)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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

  /* The main action at the end of the line, wherever the line wraps. */
  button.export {
    margin-left: auto;
    background: var(--color-button-primary);
    border-color: var(--color-button-primary);
    color: var(--color-on-button-primary);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .brand {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.04em;
    line-height: 44px;
  }

  .doc {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .file {
    align-self: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
  }

  .unsaved {
    flex-shrink: 0;
    padding: 0.125rem 0.5rem;
    border: 1px solid var(--color-secondary-text);
    border-radius: var(--border-radius-sm);
    color: var(--color-secondary-text);
    font-size: var(--font-size-tiny);
  }

  .confirm {
    display: flex;
    flex-basis: 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent-text);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-small);
  }

  .confirm p {
    flex: 1 1 20rem;
  }

  .confirm .discard {
    border-color: var(--color-accent-text);
    color: var(--color-accent-text);
  }

  /* A phone: Open and Export on the first line, the file's name under them. */
  @media (max-width: 52em) {
    .doc {
      order: 1;
      flex-basis: 100%;
    }

    .confirm,
    .error {
      order: 2;
    }
  }

  .error {
    flex-basis: 100%;
    font-size: var(--font-size-tiny);
    color: var(--color-behind-text);
  }
`;

export default style;
