import styled from "styled-components";

import { textButton } from "./theme/controls.js";
import { eyebrow } from "./theme/type.js";

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  outline: ${(props) => (props.$dragging ? "3px dashed var(--color-primary)" : "none")};
  outline-offset: -6px;
  /* The start page's column: the measure, centred, never closer to the edge than the gutter.
     The toolbar's masthead reads it too, so the mark sits over the eyebrow. */
  --start-inset: max(var(--gutter), (100% - var(--measure)) / 2);

  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 ${(props) => (props.$start ? "var(--start-inset)" : "var(--gutter-tool)")};
  }

  /* The page before a file is open, or after one could not be read: Terminus's start (an
     eyebrow, a mono title, one ledger row), on the masthead's left edge as Retrace's. */
  .start {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: var(--measure);
    padding: var(--start-gap) 0 var(--space-12);
  }

  .start .eyebrow {
    ${eyebrow}
    margin-bottom: var(--space-4);
  }

  .start .title {
    font-family: var(--font-family-mono);
    font-size: clamp(2.25rem, 6vw, 3.5rem);
    font-weight: var(--font-weight-bold);
    letter-spacing: -0.04em;
    line-height: 1;
    max-width: 16ch;
    margin-bottom: var(--space-4);
  }

  .start .lede {
    max-width: var(--measure-lede);
    margin-bottom: var(--space-10);
    color: var(--color-text-muted);
  }

  .start .ledger {
    width: 100%;
    max-width: var(--measure-list);
    border-top: 1px solid var(--color-hairline);
  }

  /* The drop target, as Terminus marks it: round the ledger, not the whole page. */
  .start.dragging .ledger {
    outline: 2px dashed var(--color-primary);
    outline-offset: 0.75rem;
  }

  .start .ledger-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    min-height: 44px;
    padding: var(--space-4) 0;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--color-hairline);
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
    margin-top: var(--space-5);
  }

  .start .note {
    max-width: 40ch;
    margin-top: var(--space-8);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24rem;
    grid-template-rows: minmax(0, 1fr);
    gap: var(--space-4);
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
      padding-top: var(--space-3);
      padding-bottom: var(--space-3);
    }
  }

  .workspace:fullscreen,
  .workspace:-webkit-full-screen,
  .workspace.is-fullscreen {
    height: 100dvh;
    padding: calc(env(safe-area-inset-top, 0px) + var(--space-3)) var(--space-3) var(--space-3);
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
    bottom: var(--space-4);
    left: var(--space-4);
    right: var(--space-4);
    padding: var(--space-2) var(--space-3);
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
    gap: var(--space-6);
    overflow-y: auto;
    padding-right: var(--space-1);
  }

  /* A phone: the map, then the pins and the plan, in the page's own scroll.
     why not sticky: a map pinned over the page took half the screen, and with the
     keyboard up to name a pin nearly all of it, the fields scrolling under it. A map in the
     flow scrolls away while typing; fullscreen is the map-and-pins view, split below. */
  @media (max-width: 52em) {
    /* The start page keeps the suite's gutter, on the masthead's edge. */
    main {
      padding: 0 ${(props) => (props.$start ? "var(--start-inset)" : "var(--space-2)")};
    }

    .workspace {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto;
      height: auto;
      min-height: 0;
      gap: var(--space-3);
    }

    .map {
      height: 55svh;
    }

    aside {
      overflow: visible;
      padding-right: 0;
    }

    /* Fullscreen splits the screen: the map above, the pins scrolling on their own below,
       side by side in time as on a desktop, never one over the other. */
    .workspace:fullscreen,
    .workspace:-webkit-full-screen,
    .workspace.is-fullscreen {
      grid-template-rows: minmax(0, 55fr) minmax(0, 45fr);
    }

    .workspace:fullscreen .map,
    .workspace:-webkit-full-screen .map,
    .workspace.is-fullscreen .map {
      height: auto;
    }

    .workspace:fullscreen aside,
    .workspace:-webkit-full-screen aside,
    .workspace.is-fullscreen aside {
      overflow-y: auto;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
  }
`;
