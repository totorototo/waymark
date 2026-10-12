import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import useAppUpdate, { offerUpdate } from "../../store/appUpdate.js";
import useStore from "../../store/store.js";
import UpdateNotice from "./UpdateNotice.jsx";

beforeEach(() => {
  useAppUpdate.setState({ apply: null });
  useStore.setState({ dirty: false });
});

it("shows nothing while no new build waits", () => {
  render(<UpdateNotice />);
  expect(screen.queryByRole("status")).toBeNull();
});

it("offers a waiting build, and takes it on Reload", () => {
  const apply = vi.fn();
  render(<UpdateNotice />);
  act(() => offerUpdate(apply));
  expect(screen.getByRole("status")).toHaveTextContent("A new version of waymark is ready.");
  fireEvent.click(screen.getByRole("button", { name: "Reload" }));
  expect(apply).toHaveBeenCalledOnce();
});

it("waits while edits are unsaved, and offers it once they are exported", () => {
  useStore.setState({ dirty: true });
  offerUpdate(vi.fn());
  render(<UpdateNotice />);
  expect(screen.queryByRole("status")).toBeNull();
  act(() => useStore.setState({ dirty: false }));
  expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
});
