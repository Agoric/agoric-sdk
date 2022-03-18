/**
 * Enum of parameter types
 *
 * UNKNOWN is an escape hatch for types we haven't added yet. If you are
 * developing a new contract and use UNKNOWN, please also file an issue to ask
 * us to support the new type.
 */
export const ParamTypes = /** @type {const} */ ({
  AMOUNT_VALUE: 'amountValue',
  BRAND: 'brand',
  BRANDED_AMOUNT: 'brandedAmount',
  BRANDED_RATIO: 'brandedRatio',
  INSTANCE: 'instance',
  INSTALLATION: 'installation',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO_VALUE: 'ratioValue',
  STRING: 'string',
  UNKNOWN: 'unknown',
});
harden(ParamTypes);
/** @typedef {typeof ParamTypes[keyof typeof ParamTypes]} ParamType */
