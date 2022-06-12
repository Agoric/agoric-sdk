// @ts-check

/** @typedef {import('./types').MemoryCostModel} MemoryCostModel */

/** @type {Record<string, MemoryCostModel>} */
const ALL_MODELS = {};

/**
 * @param {string} name
 * @param {MemoryCostModel} model
 */
const registerModel = (name, model) => {
  ALL_MODELS[name] = model;
  return model;
};

export const MINIMUM_COST_MODEL = registerModel('MINIMUM_COST_MODEL', {
  description: 'No memory cost',
  baseValueBytes: 0,
  bytesPerBigintDigit: 0,
  bytesPerStringCharacter: 0,
  bytesPerObjectProperty: 0,
});

/**
 * TOOD: Validate this cost model with folks at Node.js.
 */
export const NODE_JS_COST_MODEL = registerModel('NODE_JS_COST_MODEL', {
  description: 'Typical Node.js',
  baseValueBytes: 8,
  bytesPerBigintDigit: 1 / Math.log2(10),
  bytesPerStringCharacter: 2,
  bytesPerObjectProperty: 16,
});

/**
 * TOOD: Validate this cost model with folks at Moddable.
 */
export const XSNAP_COST_MODEL = registerModel('XSNAP_COST_MODEL', {
  description: '@agoric/xsnap',
  baseValueBytes: 8,
  bytesPerBigintDigit: 1 / Math.log2(10),
  bytesPerStringCharacter: 2,
  bytesPerObjectProperty: 16,
});

/**
 * @template {keyof MemoryCostModel} K
 * @param {K} prop
 */
const maxMemoryCostProperty = prop =>
  Object.values(ALL_MODELS).reduce((prior, model) => {
    const current = model[prop];
    if (prior < current) {
      return current;
    }
    return prior;
  }, MINIMUM_COST_MODEL[prop]);

export const MAXIMUM_COST_MODEL = registerModel('MAXIMUM_COST_MODEL', {
  description: 'Maximum finite cost',
  baseValueBytes: maxMemoryCostProperty('baseValueBytes'),
  bytesPerBigintDigit: maxMemoryCostProperty('bytesPerBigintDigit'),
  bytesPerStringCharacter: maxMemoryCostProperty('bytesPerStringCharacter'),
  bytesPerObjectProperty: maxMemoryCostProperty('bytesPerObjectProperty'),
});

// Transitively harden all our models.
harden(ALL_MODELS);
export { ALL_MODELS };
