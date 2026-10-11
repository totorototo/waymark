import styled from "styled-components";

// A quiet note where the broken part would be: mono, as the sections' eyebrows.
export const Fallback = styled.p`
  margin: 0;
  font-family: var(--font-family-mono);
  font-size: var(--font-size-small);
  color: color-mix(in srgb, var(--color-text) 85%, transparent);

  &.section-fallback {
    max-width: 46rem;
    margin: 0 auto;
    padding: 3rem clamp(1.5rem, 6vw, 4rem);
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
