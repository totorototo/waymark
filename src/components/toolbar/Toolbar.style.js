import styled from "styled-components";

import { chip, chipDanger, chipPrimary } from "../../theme/controls.js";
import { wordmark } from "../../theme/type.js";

const style = (Component) => styled(Component)`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  /* Clear of the theme toggle fixed in the top-right corner. */
  padding: 1rem calc(1.25rem + 44px + 1rem) 1rem 1rem;

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
    gap: 0.625rem;
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
    color: color-mix(in srgb, var(--color-text) 70%, transparent);
  }

  .doc {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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
    padding: 0.125rem 0.5rem;
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
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
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
    gap: 0.5rem;
    /* The toggle sits 1rem in on a phone (ThemeToggle.style.js). */
    padding-right: calc(1rem + 44px + 0.5rem);

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
      padding-inline: 0.75rem;
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
