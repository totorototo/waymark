// The app's mark, on a 64 grid: a map pin, as the ones waymark drops on the route. Its head
// a circle (r 19 round 32, 25), its sides the circle's tangents from the tip (32, 60); the
// hole in the head a subpath, filled even-odd, so the mark is one colour and shows whatever
// is under it. Drawn by the masthead (Toolbar.jsx) and scripts/make-icons.mjs.
export const MARK_PATH =
  "M32 60L16.04 35.31A19 19 0 1 1 47.96 35.31ZM24.5 25a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0Z";
