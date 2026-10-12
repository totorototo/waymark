import styled from "styled-components";

import { textButton } from "./theme/controls.js";
import { eyebrow } from "./theme/type.js";

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  outline: ${(props) => (props.$dragging ? "3px dashed var(--color-primary)" : "none")};
  outline-offset: -6px;

  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 1rem;
  }

  /* The page before a file is open, or after one could not be read: Terminus's start (an
     eyebrow, a mono title, one ledger row), on the masthead's left edge as Retrace's. */
  .start {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 40rem;
    padding: clamp(3rem, 12vh, 6rem) 0 3rem;
  }

  .start .eyebrow {
    ${eyebrow}
    margin-bottom: 1rem;
  }

  .start .title {
    font-family: var(--font-family-mono);
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.04em;
    line-height: 1;
    max-width: 16ch;
    margin-bottom: 1rem;
  }

  .start .lede {
    max-width: 38ch;
    margin-bottom: 2.5rem;
    color: var(--color-text-muted);
  }

  .start .ledger {
    width: 100%;
    max-width: 28rem;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
  }

  /* The drop target, as Terminus marks it: round the ledger, not the whole page. */
  .start.dragging .ledger {
    outline: 2px dashed var(--color-primary);
    outline-offset: 0.75rem;
  }

  .start .ledger-row {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    width: 100%;
    min-height: 44px;
    padding: 1rem 0;
    background: none;
    border: 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 10%, transparent);
    color: var(--color-text);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition: color var(--transition-base);
    -webkit-tap-highlight-color: transparent;

    &:hover {
      color: var(--color-primary-text);
    }

    &:active {
      opacity: 0.7;
    }
  }

  .start .drop,
  .start .note {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  /* Clear of the drop outline, 0.75rem out from the ledger. */
  .start .drop {
    margin-top: 1.25rem;
  }

  .start .note {
    max-width: 40ch;
    margin-top: 2rem;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24rem;
    grid-template-rows: minmax(0, 1fr);
    gap: 1rem;
    flex: 1;
    min-height: 480px;
  }

  /* A desktop: the page is exactly the window, the panel scrolls inside it. Taller, the
     window scrolled too, and bringing a pin into view moved the whole page. */
  @media (min-width: 52.0625em) {
    &:has(.workspace) {
      height: 100vh;
      min-height: 0;
    }

    &:has(.workspace) footer {
      padding-top: 0.75rem;
      padding-bottom: 0.75rem;
    }
  }

  .workspace:fullscreen,
  .workspace:-webkit-full-screen,
  .workspace.is-fullscreen {
    height: 100dvh;
    padding: calc(env(safe-area-inset-top, 0px) + 0.75rem) 0.75rem 0.75rem;
    background: var(--color-background);
  }

  .workspace.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: var(--z-index-modal);
  }

  .map {
    position: relative;
    min-height: 0;
  }

  .notice {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-small);
  }

  .notice button {
    ${textButton}
  }

  aside {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  /* A phone: the map stays at the top while the pins scroll under it.
     why sticky, not a bottom sheet: most of the benefit (map and editor both on screen)
     with no drag-handle gestures, and the same markup as the desktop. */
  @media (max-width: 52em) {
    main {
      padding: 0 0.5rem;
    }

    /* On the masthead's edge: the toolbar keeps its 1rem gutter. */
    .start {
      padding-inline: 0.5rem;
    }

    .workspace {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      height: auto;
      min-height: 0;
      gap: 0.75rem;
    }

    .map {
      position: sticky;
      top: 0;
      z-index: 2;
      height: 42vh;
      padding-top: 0.25rem;
      background: var(--color-background);
    }

    aside {
      overflow: visible;
      padding-right: 0;
    }

    .workspace:fullscreen,
    .workspace:-webkit-full-screen,
    .workspace.is-fullscreen {
      overflow-y: auto;
    }
  }
`;
