import styled from "styled-components";

const style = (Component) => styled(Component)`
  h2 {
    margin-bottom: 0.5rem;
    font-size: var(--font-size);
    font-weight: var(--font-weight-bold);
  }

  h2 small {
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-muted);
  }

  .pace {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 8rem;
    margin-bottom: 0.75rem;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .pace input {
    padding: 0.375rem 0.5rem;
    background: var(--color-background);
    border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
    border-radius: var(--border-radius-sm);
    color: var(--color-text);
    font: inherit;
    font-size: var(--font-size-small);
  }

  table {
    width: 100%;
    margin-bottom: 1rem;
    border-collapse: collapse;
    font-size: var(--font-size-tiny);
  }

  th,
  td {
    padding: 0.25rem 0.375rem;
    text-align: right;
    font-weight: var(--font-weight-medium);
  }

  th:first-child {
    text-align: left;
  }

  thead th {
    color: var(--color-text-muted);
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 30%, transparent);
  }

  td {
    font-family: var(--font-family-mono);
  }

  tr.late td {
    color: var(--color-behind-text);
  }
`;

export default style;
