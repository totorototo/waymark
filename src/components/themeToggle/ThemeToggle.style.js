import styled from "styled-components";

// Terminus's ThemeToggle style on the CSS custom properties. From its why-comments: a plain
// tinted fill (not glass) stays legible over a flat page, and the ring's 0.4 alpha keeps
// about 3:1 non-text contrast against the background (WCAG 1.4.11).
const style = (Component) => styled(Component)`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 1.25rem);
  right: calc(env(safe-area-inset-right, 0px) + 1.25rem);
  z-index: var(--z-index-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: color-mix(in srgb, var(--color-text) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-text) 40%, transparent);
  border-radius: var(--border-radius-full);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: color-mix(in srgb, var(--color-text) 18%, transparent);
    border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    color: var(--color-primary);
  }
`;

export default style;
