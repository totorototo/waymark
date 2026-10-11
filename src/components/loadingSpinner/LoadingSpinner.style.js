import styled, { keyframes } from "styled-components";

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

// Terminus's LoadingSpinner style, on the CSS custom properties. In the page's flow, not
// over it: Setup's intro stays above it.
const style = (Component) => styled(Component)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 0;

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-top-color: var(--color-primary);
    border-radius: var(--border-radius-full);
    animation: ${spin} 0.8s linear infinite;
  }

  p {
    margin: 0;
    font-size: var(--font-size-small);
    letter-spacing: 1.5px;
    color: var(--color-text);
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
      border-top-color: var(--color-text);
    }
  }
`;

export default style;
