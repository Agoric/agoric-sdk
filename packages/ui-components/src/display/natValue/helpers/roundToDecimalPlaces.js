// @ts-check
const { details } = assert;

export const roundToDecimalPlaces = (
  rightOfDecimalStr = '',
  decimalPlaces = 0,
) => {
  assert.typeof(rightOfDecimalStr, 'string');
  assert.typeof(decimalPlaces, 'number');
  assert(
    decimalPlaces >= 0,
    details`decimalPlaces must be a number greater or equal to 0`,
  );
  // If rightOfDecimalStr isn't long enough, pad with 0s
  const strPadded = rightOfDecimalStr.padEnd(decimalPlaces, '0');
  // This is rounding down to the floor
  // TODO: round more appropriately, maybe bankers' rounding
  const strRounded = strPadded.substring(0, decimalPlaces);
  return strRounded;
};
