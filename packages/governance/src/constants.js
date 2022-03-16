/**
 * Enum of parameter types
 *
 * UNKNOWN is an escape hatch for types we haven't added yet. If you are
 * developing a new contract and use UNKNOWN, please also file an issue to ask
 * us to support the new type.
 */
export const ParamTypes = /** @type {const} */ ({
  Amount: 'amount',
  Brand: 'brand',
  BrandedAmount: 'brandedAmount',
  BrandedRatio: 'brandedRatio',
  Instance: 'instance',
  Installation: 'installation',
  Invitation: 'invitation',
  Nat: 'nat',
  Ratio: 'ratio',
  String: 'string',
  Unknown: 'unknown',
});
harden(ParamTypes);
/** @typedef {typeof ParamTypes[keyof typeof ParamTypes]} ParamType */
