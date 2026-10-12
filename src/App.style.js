import styled from "styled-components";

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

  /* The page before a file is open, or after one could not be read. */
  .start {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    max-width: 36rem;
    margin: clamp(2rem, 10vh, 6rem) auto 0;
    padding: 2.5rem 1.5rem;
    border: 2px dashed color-mix(in srgb, var(--color-text) 30%, transparent);
    border-radius: var(--border-radius-md);
    text-align: center;
    transition: border-color var(--transition-fast);
  }

  .start.dragging {
    border-color: var(--color-primary-text);
  }

  .start h1 {
    font-size: var(--font-size-medium);
    font-weight: var(--font-weight-bold);
  }

  .start p {
    font-size: var(--font-size-small);
  }

  .start .primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: var(--color-button-primary);
    border: 1px solid var(--color-button-primary);
    border-radius: var(--border-radius-sm);
    color: var(--color-on-button-primary);
    font: inherit;
    font-size: var(--font-size);
    cursor: pointer;
  }

  .start .drop,
  .start .private,
  .start .detail {
    font-size: var(--font-size-tiny);
    color: var(--color-text-muted);
  }

  .start .detail {
    font-family: var(--font-family-mono);
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
    background: none;
    border: 0;
    color: var(--color-primary-text);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
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
