import styled from "styled-components";

import { chip, chipDanger, chipPrimary } from "../../theme/controls.js";
import { wordmark } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  /* Clear of the theme toggle fixed in the top-right corner. */
  padding: var(--space-4) calc(var(--space-5) + var(--touch-target) + var(--space-4)) var(--space-4)
    var(--gutter-tool);

  /* On the start page, the masthead heads the centred column (App.style.js), level with the
     theme toggle (1.25rem down, 44px high) as the other apps' start, the name its h1. */
  &.is-start {
    padding: calc(env(safe-area-inset-top, 0px) + var(--space-5))
      calc(var(--space-5) + var(--touch-target) + var(--space-4)) 0 var(--start-inset);
  }

  button {
    ${chip}
  }

  /* The main action at the end of the line, wherever the line wraps. */
  button.export {
    ${chipPrimary}
    margin-left: auto;
  }

  /* Retrace's masthead: the name level with the theme toggle, its first half dimmed. */
  .brand {
    ${wordmark}
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 44px;
  }

  /* The pin's head starts 13 of the mark's 64 in: pulled back to line up with the text below. */
  .mark {
    flex: none;
    width: 44px;
    height: 44px;
    margin-left: calc(-44px * 13 / 64);
  }

  /* One ink, as the favicon's: dark's primary is its gold, light's its blue. */
  .mark path {
    fill: var(--color-primary);
  }

  .brand-way {
    color: var(--color-text-muted);
  }

  .doc {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .file {
    align-self: center;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-family-mono);
    font-size: var(--font-size-tiny);
  }

  .unsaved {
    flex-shrink: 0;
    padding: var(--space-hair) var(--space-2);
    border: 1px solid var(--color-secondary-text);
    border-radius: var(--border-radius-sm);
    color: var(--color-secondary-text);
    font-size: var(--font-size-tiny);
  }

  /* Before a file is open, the notice at the line's end, by the theme toggle. */
  .brand + .update {
    margin-left: auto;
  }

  .confirm {
    display: flex;
    flex-basis: 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-accent-text);
    border-radius: var(--border-radius-sm);
    font-size: var(--font-size-small);
  }

  .confirm p {
    flex: 1 1 20rem;
  }

  .confirm .discard {
    ${chipDanger}
  }

  /* A phone: Open and Export on the first line, the file's name under them. */
  @media (max-width: 52em) {
    gap: var(--space-2);
    /* The toggle sits 1rem in on a phone (ThemeToggle.style.js). */
    padding-right: calc(var(--space-4) + var(--touch-target) + var(--space-2));

    .doc {
      order: 1;
      flex-basis: 100%;
    }

    .update,
    .confirm,
    .error {
      order: 2;
    }
  }

  /* A narrow phone: Open and Export still on one line, by their words alone.
     why drop the icons, not "GPX": the words say what the buttons do, the icons only echo
     them, and keeping both put Export on a line of its own under 376 px. */
  @media (max-width: 23.5em) {
    button {
      padding-inline: var(--space-3);
    }

    button > svg {
      display: none;
    }
  }

  .error {
    flex-basis: 100%;
    font-size: var(--font-size-tiny);
    color: var(--color-behind-text);
  }
`;

export default style;
