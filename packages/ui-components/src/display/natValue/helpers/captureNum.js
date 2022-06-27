// @ts-check
const { details } = assert;

// REGEXP:
// Match beginning of string
// [1]: Capture the first group of 0-9 digits
// [2]: Optionally capture a second group of 0-9 digits starting with a period
// [3]: Capture just the 0-9 digitals after the optional period
// Match the end of the string
const matchNumOptDecimalPlaces = /^(\d*)(\.(\d*)?)?$/;

export const captureNum = str => {
  assert.typeof(
    str,
    'string',
    details`${str} must be a non-negative decimal number`,
  );
  const match = str.match(matchNumOptDecimalPlaces);
  assert(match, details`${str} must be a non-negative decimal number`);
  const leftOfDecimal = match[1] || '0';
  const rightOfDecimal = match[3] || '';
  return {
    left: leftOfDecimal,
    right: rightOfDecimal,
  };
};
