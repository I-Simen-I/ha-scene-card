// The colors Home Assistant's color picker (`ui_color` selector) offers,
// as in the frontend's src/common/color/compute-color.ts. They map to the
// theme's CSS variables, so themes can change them.
const THEME_COLORS = new Set([
  "primary",
  "accent",
  "red",
  "pink",
  "purple",
  "deep-purple",
  "indigo",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "deep-orange",
  "brown",
  "light-grey",
  "grey",
  "dark-grey",
  "blue-grey",
  "black",
  "white",
]);

// A theme color name, or any CSS color (#hex, rgb(), var(--x), ...)
export const computeCssColor = (color: string): string =>
  THEME_COLORS.has(color) ? `var(--${color}-color)` : color;
