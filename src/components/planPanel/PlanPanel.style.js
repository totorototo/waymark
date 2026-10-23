import styled from "styled-components";

import { field, fold, foldInner } from "../../theme/controls.js";
import { eyebrow } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  h2 {
    ${eyebrow}
    margin-bottom: var(--space-2);
  }

  h2 small {
    font-weight: var(--font-weight-medium);
    letter-spacing: normal;
    text-transform: none;
  }

  .pace {
    margin-bottom: var(--space-3);
  }

  .pace label {
    display: flex;
    flex-direction: column;
    gap: var(--space-hair);
    width: 10rem;
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .pace input {
    ${field}
  }

  .pace p {
    margin-top: var(--space-1);
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .summary {
    margin-bottom: var(--space-2);
    font-size: var(--font-size-small);
  }

  .summary.late {
    color: var(--color-behind-text);
  }

  .fold-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    min-height: 44px;
    padding: 0;
    background: none;
    border: 0;
    color: inherit;
    font: inherit;
    font-size: var(--font-size-small);
    cursor: pointer;

    svg {
      transition: transform var(--transition-standard);
    }

    &[aria-expanded="true"] svg {
      transform: rotate(90deg);
    }
  }

  .fold {
    ${fold}
  }

  .fold-inner {
    ${foldInner}
  }

  table {
    width: 100%;
    margin-bottom: var(--space-4);
    border-collapse: collapse;
    font-size: var(--font-size-tiny);
  }

  th,
  td {
    padding: var(--space-1) var(--space-2);
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

  /* A checkpoint whose planned departure is past its cutoff. */
  tr.late th,
  tr.late td {
    color: var(--color-behind-text);
  }
`;

export default style;
