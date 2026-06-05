// Corner radii. control = buttons/inputs, card = cards/list groups,
// sheet = modal sheets, full = pills/circles.
export const radius = {
  control: 10,
  card: 12,
  sheet: 16,
  full: 999,
} as const;

export type Radius = typeof radius;
