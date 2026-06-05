// 4-pt spacing scale. Use these instead of magic numbers for padding/margins/gaps.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export type Spacing = typeof spacing;
