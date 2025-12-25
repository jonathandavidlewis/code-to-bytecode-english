export const GAP_BETWEEN_COLUMNS = 20;

export const ZEBRA_COLORS = {
  band0: { bg: "bg-sky-50", fill: "#f0f9ff" },
  band1: { bg: "bg-amber-50", fill: "#fffbeb" },
} as const;

export const STATEMENT_HOVER_BG_COLOR = {
  band0: "bg-sky-100",
  band1: "bg-amber-100",
} as const;

// Base border class - empty since we use box-shadow which doesn't affect layout
export const STATEMENT_BORDER_BASE = "";

// Using box-shadow for top and bottom borders only (doesn't affect layout)
// Using style objects for reliable rendering (Tailwind arbitrary values can be unreliable)
export const STATEMENT_HOVER_BORDER = {
  band0: {
    style: { boxShadow: "inset 0 1px 0 0 #38bdf8, inset 0 -1px 0 0 #38bdf8" },
    inactiveStyle: {},
    stroke: "#38bdf8", // sky-400 hex for SVG
  },
  band1: {
    style: { boxShadow: "inset 0 1px 0 0 #fbbf24, inset 0 -1px 0 0 #fbbf24" },
    inactiveStyle: {},
    stroke: "#fbbf24", // amber-400 hex for SVG
  },
} as const;

export type ColorBand = 0 | 1;
