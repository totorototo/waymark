// The app's mark, on a 64 grid: a checkpoint flag (swallowtail, a ring punched in it) on its
// pole, beside low-poly peaks. The peaks are Retrace's family; the flag, not Retrace's arched
// pin, is the silhouette, so the two tabs tell apart at 16px. One path, filled even-odd: each
// hole (the ring, the peaks' facets) is a subpath, so the mark is one colour and shows
// whatever is under it. Drawn by the masthead (Toolbar.jsx) and scripts/make-icons.mjs.
export const MARK_PATH =
  "M15 7Q15 5 17 5L19 5Q21 5 21 7L21 58Q21 59 20 59L16 59Q15 59 15 58ZM21 8L52 8L43 19.5L52 31L21 31ZM27 19.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0ZM29.8 19.5a2.7 2.7 0 1 0 5.4 0a2.7 2.7 0 1 0 -5.4 0ZM24 59L36 40L41 46L47 36L59 59ZM36 45L39 51L33 51ZM47 42L51 50L44 50Z";
