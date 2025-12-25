export const GAP_BETWEEN_COLUMNS = 20;

export const ZEBRA_COLORS = {
  band0: { bg: "bg-sky-50", fill: "#f0f9ff" },
  band1: { bg: "bg-amber-50", fill: "#fffbeb" },
} as const;

export type ColorBand = 0 | 1;
