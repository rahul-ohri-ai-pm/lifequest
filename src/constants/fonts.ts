// One display font (headers/numbers/level-ups), system font for body (§5).
// Font files land with the first styled screen (M3); refs are stable now.
export const fonts = {
  display: 'Rajdhani-Bold',
  displayRegular: 'Rajdhani-Regular',
  body: undefined, // system font (SF / Roboto)
} as const;
