/** Unsigned 255-bit data with an extra bit to indicate unused. */
export const OPT_UINT_UNDEFINED = -1n;
export const optUint255 = 'int256';
export const maxOptUint255 = 2n ** 255n;

/** Validate wire values without requiring Endo initialization. */
export const assertOptUint255 = (value: bigint, field: string): void => {
  if (
    typeof value !== 'bigint' ||
    value < OPT_UINT_UNDEFINED ||
    value >= maxOptUint255
  ) {
    throw RangeError(`invalid optUint255 ${field}: ${String(value)}`);
  }
};
