import { render, screen } from "@testing-library/react";

import ErrorBoundary from "./ErrorBoundary.jsx";

function Section({ broken }) {
  if (broken) throw new Error("unexpected report");
  return <p>drawn</p>;
}

const renderPage = ({ broken, resetKey }) => (
  <>
    <ErrorBoundary message="Gap: this section couldn't be drawn." resetKey={resetKey}>
      <Section broken={broken} />
    </ErrorBoundary>
    <p>the rest of the story</p>
  </>
);

// React logs every error a boundary catches: keep the run's output clean.
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

it("keeps a render error to the part that threw", () => {
  render(renderPage({ broken: true, resetKey: 1 }));
  expect(screen.getByRole("alert")).toHaveTextContent("Gap: this section couldn't be drawn.");
  expect(screen.getByText("the rest of the story")).toBeInTheDocument();
});

it("tries again when the reset key changes", () => {
  const { rerender } = render(renderPage({ broken: true, resetKey: 1 }));
  rerender(renderPage({ broken: false, resetKey: 2 }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("drawn")).toBeInTheDocument();
});

it("stays on the message while the key is the same", () => {
  const { rerender } = render(renderPage({ broken: true, resetKey: 1 }));
  rerender(renderPage({ broken: false, resetKey: 1 }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
