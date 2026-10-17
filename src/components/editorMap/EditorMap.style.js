import styled from "styled-components";

import THEME from "../../theme/Theme.js";

// The map's own colours, the same in both themes: Theme.js's map inks (see there).
export const MAP_COLORS = {
  route: THEME.map.route,
  casing: THEME.map.casing,
  pin: THEME.map.pin,
  selected: THEME.map.live,
  label: THEME.map.label,
  shadow: THEME.map.shadow,
};

const style = (Component) => styled(Component)`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: var(--border-radius-md);
  overflow: hidden;

  .missing {
    padding: 2rem;
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .controls {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border-radius: var(--border-radius-base);
    border: 1px solid var(--color-control-border);
    background: color-mix(in srgb, var(--color-background) 70%, transparent);
    color: var(--color-text-muted);
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition: all var(--transition-fast);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    font-weight: var(--font-weight-bold);
    -webkit-tap-highlight-color: transparent;

    &[aria-pressed="true"] {
      color: var(--color-primary-text);
      border-color: var(--color-primary-text);
    }

    &:hover {
      color: var(--color-primary-text);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
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
    color: ${MAP_COLORS.casing};
    cursor: grab;
    transform-origin: bottom center;
    transition: transform var(--transition-fast);
  }

  .pin svg {
    display: block;
    fill: ${MAP_COLORS.pin};
    stroke: ${MAP_COLORS.casing};
    stroke-width: 1.5px;
    filter: drop-shadow(0 1px 2px ${MAP_COLORS.shadow});
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
    font-size: var(--font-size-tiny);
    line-height: 1;
    pointer-events: none;
  }

  .pin.selected {
    transform: scale(1.25);
  }

  .pin.selected svg {
    fill: ${MAP_COLORS.selected};
  }

  .candidate {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    font-size: var(--font-size-tiny);
    background: ${MAP_COLORS.pin};
    border: 2px solid ${MAP_COLORS.casing};
    border-radius: var(--border-radius-md);
    color: ${MAP_COLORS.casing};
  }

  .rank {
    opacity: 0.8;
  }
`;

export default style;
