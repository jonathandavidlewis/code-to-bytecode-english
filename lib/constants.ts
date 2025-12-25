export const GAP_BETWEEN_COLUMNS = 20;

export const ZEBRA_COLORS = {
  band0: { bg: "bg-sky-50", fill: "#f0f9ff" },
  band1: { bg: "bg-amber-50", fill: "#fffbeb" },
} as const;

export const STATEMENT_HOVER_BG_COLOR = {
  band0: "bg-sky-100",
  band1: "bg-amber-100",
} as const;

// Base border class - using ring-inset which doesn't affect layout (unlike border)
export const STATEMENT_BORDER_BASE = "ring-inset";

export const STATEMENT_HOVER_BORDER = {
  band0: {
    className: "ring-1 ring-sky-400",
    inactiveClassName: "ring-0",
    stroke: "#38bdf8", // sky-400 hex for SVG
  },
  band1: {
    className: "ring-1 ring-amber-400",
    inactiveClassName: "ring-0",
    stroke: "#fbbf24", // amber-400 hex for SVG
  },
} as const;

export type ColorBand = 0 | 1;
