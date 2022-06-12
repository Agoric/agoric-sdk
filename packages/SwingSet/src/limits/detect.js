/* global globalThis */
// @ts-check

import {
  XSNAP_COST_MODEL,
  NODE_JS_COST_MODEL,
  MAXIMUM_COST_MODEL,
} from './cost-models.js';

export const detectLocalMemoryCostModel = () => {
  if (globalThis.URL === undefined && globalThis.Base64 !== undefined) {
    return XSNAP_COST_MODEL;
  }
  if (globalThis.URL !== undefined && globalThis.Base64 === undefined) {
    return NODE_JS_COST_MODEL;
  }
  // By default, use the maximum cost model.
  return MAXIMUM_COST_MODEL;
};
