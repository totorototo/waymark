import styled from "styled-components";

import { field } from "../../theme/controls.js";
import { eyebrow } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  h2 {
    ${eyebrow}
    margin-bottom: 0.5rem;
  }

  h2 small {
    font-weight: var(--font-weight-medium);
    letter-spacing: normal;
    text-transform: none;
  }

  .pace {
    margin-bottom: 0.75rem;
  }

  .pace label {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 10rem;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .pace input {
    ${field}
  }

  .pace p {
    margin-top: 0.25rem;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .summary {
    margin-bottom: 0.5rem;
    font-size: var(--font-size-small);
  }

  .summary.late {
    color: var(--color-behind-text);
  }

  details summary {
    margin-bottom: 0.5rem;
    font-size: var(--font-size-small);
    cursor: pointer;
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
    white-space: nowrap;
  }

  tr.late td {
    color: var(--color-behind-text);
  }
`;

export default style;
