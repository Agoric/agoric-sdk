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

/**
 * TOOD: Validate this cost model with folks at Node.js.
 */
export const NODE_JS_COST_MODEL = registerModel('NODE_JS_COST_MODEL', {
  description: 'Typical Node.js',
  baseCost: 8n,
  bigintPerWordCost: 8n,
  stringPerCharacterCost: 2n,
  objectPerPropertyCost: 16n,
});

/**
 * TOOD: Validate this cost model with folks at Moddable.
 */
export const XSNAP_COST_MODEL = registerModel('XSNAP_COST_MODEL', {
  description: '@agoric/xsnap',
  baseCost: 8n,
  bigintPerWordCost: 8n,
  stringPerCharacterCost: 2n,
  objectPerPropertyCost: 16n,
});

/**
 * @param {keyof MemoryCostModel} prop
 * @returns {bigint}
 */
const maxMemoryCostProperty = prop =>
  Object.values(ALL_MODELS).reduce((prior, model) => {
    const current = model[prop];
    if (typeof current !== 'bigint') {
      return prior;
    }
    if (prior >= current) {
      return prior;
    }
    return current;
  }, 0n);

export const MINIMUM_COST_MODEL = registerModel('MINIMUM_COST_MODEL', {
  description: 'No memory cost',
  baseCost: 0n,
  bigintPerWordCost: 0n,
  stringPerCharacterCost: 0n,
  objectPerPropertyCost: 0n,
});

export const MAXIMUM_COST_MODEL = registerModel('MAXIMUM_COST_MODEL', {
  description: 'Maximum finite cost',
  baseCost: maxMemoryCostProperty('baseCost'),
  bigintPerWordCost: maxMemoryCostProperty('bigintPerWordCost'),
  stringPerCharacterCost: maxMemoryCostProperty('stringPerCharacterCost'),
  objectPerPropertyCost: maxMemoryCostProperty('objectPerPropertyCost'),
});

// Transitively harden all our models.
harden(ALL_MODELS);
export { ALL_MODELS };
