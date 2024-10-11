/**
 * Enum of parameter types
 *
 * UNKNOWN is an escape hatch for types we haven't added yet. If you are
 * developing a new contract and use UNKNOWN, please also file an issue to ask
 * us to support the new type.
 * @enum {typeof ParamType[keyof typeof ParamType]}
 */
export const ParamType = /** @type {const} */ ({
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTALLATION: 'installation',
  INSTANCE: 'instance',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  PASSABLE_RECORD: 'record',
  TIMESTAMP: 'timestamp',
  RELATIVE_TIME: 'relativeTime',
  UNKNOWN: 'unknown',
});
harden(ParamType);

// For backwards compatibility
// Shallow copy to work around TS d.ts defining an empty namespace instead of an object
export const ParamTypes = { ...ParamType };
