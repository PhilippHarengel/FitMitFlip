// Corner radii. control = buttons/inputs, card = cards/list groups,
// sheet = modal sheets, full = pills/circles.
export const radius = {
  control: 18,
  card: 20,
  sheet: 24,
  full: 999,
} as const;

export type Radius = typeof radius;
