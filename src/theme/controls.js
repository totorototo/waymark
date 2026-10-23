import { css } from "styled-components";

// The suite's controls, as style fragments: each panel's *.style.js applies them to its own
// class names, as Retrace's Setup styles the rows its children emit.
// why fragments, not a <Button>: the markup stays plain buttons and inputs, so the tests'
// roles and the e2e selectors don't move, and one rule still sets every button.

// Terminus's outlined button (its StoryPace profile buttons; Retrace's .chip): mono, bold,
// 44px tall, rounded, the primary colour on hover.
export const chip = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  background: none;
  border: 1px solid var(--color-control-border);
  border-radius: var(--border-radius-base);
  color: var(--color-text);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// The one main action on screen (Export, or Open on the empty page): filled.
export const chipPrimary = css`
  ${chip}
  background: var(--color-button-primary);
  border-color: var(--color-button-primary);
  color: var(--color-on-button-primary);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-button-primary) 85%, var(--color-text));
    border-color: var(--color-button-primary);
    color: var(--color-on-button-primary);
  }
`;

// What removes or discards: the accent, outlined.
export const chipDanger = css`
  ${chip}
  border-color: var(--color-accent-text);
  color: var(--color-accent-text);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent-text) 12%, transparent);
    border-color: var(--color-accent-text);
    color: var(--color-accent-text);
  }
`;

// A quiet action inside text (Undo, Remove all, Cancel): underlined, but still a 44px target.
export const textButton = css`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0;
  background: none;
  border: 0;
  color: var(--color-primary-text);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
`;

// Inputs, selects and textareas: lighter than the cards, 44px tall. Terminus's corner.
export const field = css`
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-field);
  border: 1px solid var(--color-field-border);
  border-radius: var(--border-radius-sm);
  color: var(--color-text);
  /* Set, not inherited: inside a label in the mono capitals (the race clock), the value
     stays plain. */
  font-family: var(--font-family-sansSerif);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  line-height: inherit;
  letter-spacing: normal;
  text-transform: none;

  &[aria-invalid="true"] {
    border-color: var(--color-behind-text);
  }
`;

// A fold that opens and closes (a pin's editor, the Plan's sections): its one grid row goes
// 0fr → 1fr, so it animates to the content's own height with no measuring. Put the class on
// the wrapper, `open` while open, and the content in a child with `foldInner`. The global
// reduced-motion rule shortens it to nothing. Keep FOLD_MS in step with --transition-standard.
export const FOLD_MS = 300;

export const fold = css`
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows var(--transition-standard),
    opacity var(--transition-standard);

  &.open {
    grid-template-rows: 1fr;
    opacity: 1;
  }
`;

// The fold's content: clipped while it opens. The 4px of padding, taken back by the margin,
// keeps the 2px focus ring (2px offset) of a field at the edge from being clipped.
export const foldInner = css`
  min-height: 0;
  overflow: hidden;
  padding: 0 var(--space-1);
  margin: 0 calc(-1 * var(--space-1));
`;
