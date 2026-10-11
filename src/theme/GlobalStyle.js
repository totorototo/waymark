import { createGlobalStyle } from "styled-components";

const toCustomProperties = (entries) =>
  Object.entries(entries)
    .map(([rule, value]) => `${rule}: ${value};`)
    .join("\n");

// What the charts mean by colour, per variant, on top of Terminus's tokens (Theme.js stays
// a copy of Terminus's). Behind the plan is the accent in both. Ahead is the secondary in
// dark (sage), but light's secondary is orange, which beside the accent's red reads as a
// second shade of bad: there it is the success green, and its text a darker mix of it
// (4.8:1 on the background, where the plain green is 1.9:1).
// Secondary text, in two steps: muted (labels, notes) and faint (ticks, axis names). Each
// keeps 4.5:1 on its variant's background: dark's has room to fade, light's mid-grey has
// little (below ~80% of the text colour it fails), so there the two steps sit close.
const SEMANTIC = {
  dark: {
    "--color-behind": "var(--color-accent)",
    "--color-behind-text": "var(--color-accent-text)",
    "--color-ahead": "var(--color-secondary)",
    "--color-ahead-text": "var(--color-secondary-text)",
    "--color-text-muted": "color-mix(in srgb, var(--color-text) 75%, transparent)",
    "--color-text-faint": "color-mix(in srgb, var(--color-text) 65%, transparent)",
  },
  light: {
    "--color-behind": "var(--color-accent)",
    "--color-behind-text": "var(--color-accent-text)",
    "--color-ahead": "var(--color-success)",
    "--color-ahead-text": "color-mix(in srgb, var(--color-success) 30%, var(--color-text))",
    "--color-text-muted": "color-mix(in srgb, var(--color-text) 88%, transparent)",
    "--color-text-faint": "color-mix(in srgb, var(--color-text) 82%, transparent)",
  },
};

// The CSS custom properties from Theme.js, as in Terminus's ThemedApp.
const GlobalStyle = createGlobalStyle`
  :root {
    ${(props) => toCustomProperties(props.theme.colors[props.theme.currentVariant])}
    ${(props) => toCustomProperties(SEMANTIC[props.theme.currentVariant])}
    ${(props) => Object.values(props.theme.font).map(toCustomProperties).join("\n")}
    ${(props) => toCustomProperties(props.theme.borderRadius)}
    ${(props) => toCustomProperties(props.theme.transitions)}
    ${(props) => toCustomProperties(props.theme.zIndex)}

    color-scheme: ${(props) => props.theme.currentVariant};
    font-family: var(--font-family-sansSerif);
    line-height: 1.5;
    color: var(--color-text);
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    min-height: 100vh;
    min-width: 320px;
    background-color: var(--color-background);
    padding:
      env(safe-area-inset-top) env(safe-area-inset-right)
      env(safe-area-inset-bottom) env(safe-area-inset-left);
  }

  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--border-radius-xs);
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default GlobalStyle;
