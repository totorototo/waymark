import { describe, expect, it } from "vitest";

import { FOLD_MS } from "./controls.js";
import THEME from "./Theme.js";

describe("fold", () => {
  // The pin editor stays mounted FOLD_MS after it starts to close: shorter cuts the
  // animation, longer leaves a hidden form behind.
  it("keeps FOLD_MS in step with --transition-standard", () => {
    const seconds = parseFloat(THEME.transitions["--transition-standard"]);
    expect(FOLD_MS).toBe(Math.round(seconds * 1000));
  });
});
