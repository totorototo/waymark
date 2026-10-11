import styled from "styled-components";

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  outline: ${(props) => (props.$dragging ? "3px dashed var(--color-primary)" : "none")};
  outline-offset: -6px;

  main {
    flex: 1;
    padding: 0 1rem;
  }

  .empty,
  .error {
    max-width: 40rem;
    margin: 4rem auto;
    font-size: var(--font-size);
    text-align: center;
  }

  .error {
    color: var(--color-behind-text);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24rem;
    gap: 1rem;
    height: calc(100vh - 9rem);
    min-height: 480px;
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

  @media (max-width: 52em) {
    .workspace {
      grid-template-columns: minmax(0, 1fr);
      height: auto;
    }

    .map {
      height: 60vh;
    }
  }
`;
