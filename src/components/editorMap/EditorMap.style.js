import styled from "styled-components";

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: var(--border-radius-md);
  overflow: hidden;

  &:fullscreen,
  &:-webkit-full-screen {
    border-radius: 0;
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    border-radius: 0;
    z-index: var(--z-index-modal);
  }

  .missing {
    padding: 2rem;
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .fullscreen {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border-radius: var(--border-radius-base);
    border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
    background: color-mix(in srgb, var(--color-background) 70%, transparent);
    color: color-mix(in srgb, var(--color-text) 75%, transparent);
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: all var(--transition-fast);
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
  }

  /* In fullscreen the button is at the screen edge, under a notch or status bar. */
  &:fullscreen .fullscreen,
  &:-webkit-full-screen .fullscreen,
  &.is-fullscreen .fullscreen {
    top: max(calc(env(safe-area-inset-top, 0px) + 0.75rem), 3.25rem);
    right: calc(env(safe-area-inset-right, 0px) + 0.75rem);
  }

  .pin,
  .candidate {
    font-family: var(--font-family-mono);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
  }

  .pin {
    position: relative;
    display: block;
    padding: 0;
    background: none;
    border: 0;
    color: var(--color-background);
    transform-origin: bottom center;
    transition: transform var(--transition-fast);
  }

  .pin svg {
    display: block;
    fill: var(--color-primary);
    stroke: var(--color-background);
    stroke-width: 1.5px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
  }

  /* The number takes the place of the pin's inner circle. */
  .pin svg circle {
    display: none;
  }

  /* Over the pin's head: Feather's MapPin circle is at (12, 10) of 24. */
  .number {
    position: absolute;
    top: 41.7%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-xsmall);
    line-height: 1;
    pointer-events: none;
  }

  .pin.selected {
    transform: scale(1.25);
  }

  .pin.selected svg {
    fill: var(--color-accent);
    stroke: var(--color-text);
  }

  .candidate {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: var(--font-size-tiny);
    background: var(--color-primary);
    border: 2px solid var(--color-text);
    border-radius: var(--border-radius-md);
    color: var(--color-background);
  }

  .rank {
    opacity: 0.8;
  }
`;

export default style;
