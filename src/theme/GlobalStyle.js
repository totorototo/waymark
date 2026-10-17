import { toCustomProperties } from "@totorototo/trail-tokens";
import { createGlobalStyle } from "styled-components";

// The CSS custom properties from Theme.js, as in Terminus's ThemedApp.
const GlobalStyle = createGlobalStyle`
  :root {
    ${(props) => toCustomProperties(props.theme.colors[props.theme.currentVariant])}
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
    outline: 2px solid var(--color-focus);
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
