// Writes the tab icon from the mark the masthead draws (src/theme/mark.js), as Retrace's
// script does. Dark's colours, the app's first variant.
//
//   node scripts/make-icons.mjs
//
// Output: public/favicon.svg.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MARK_PATH } from "../src/theme/mark.js";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "favicon.svg");

// Theme.js, dark: background, primary.
const BACKGROUND = "#3A3335";
const INK = "#f2af29";

// A rounded tile, the mark nearly to its edges.
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BACKGROUND}"/><path d="${MARK_PATH}" fill="${INK}" fill-rule="evenodd"/></svg>\n`;

writeFileSync(OUT, FAVICON);
console.log(`wrote ${OUT}`);
