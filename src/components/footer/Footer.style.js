import styled from "styled-components";

// Terminus's footer type (mono, 11px, a little tracked), on the story's gutters.
// why: 0.85 alpha, as Terminus's wizard footer, not the 0.4 of its story end: 0.85 is the
// floor for small text on the flat background.
const style = (Component) => styled(Component)`
  display: block;
  padding: 3rem clamp(1.5rem, 6vw, 4rem) calc(env(safe-area-inset-bottom, 0px) + 2.5rem);
  text-align: center;
  font-family: var(--font-family-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--color-text) 85%, transparent);
`;

export default style;
