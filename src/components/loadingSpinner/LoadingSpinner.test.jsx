import { render, screen } from "@testing-library/react";

import LoadingSpinner from "./LoadingSpinner.jsx";

it("shows the step it is at, as a status", () => {
  render(<LoadingSpinner label="Reading the race files…" />);
  expect(screen.getByRole("status")).toHaveTextContent("Reading the race files…");
});
