import styled from "styled-components";

// A quiet note where the broken part would be: mono, as the sections' eyebrows.
export const Fallback = styled.p`
  margin: 0;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-small);
  color: color-mix(in srgb, var(--color-text) 85%, transparent);

  &.section-fallback {
    max-width: var(--measure);
    margin: 0 auto;
    padding: 3rem var(--gutter);
  }

  &.panel-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 1.5rem;
    text-align: center;
  }
`;
