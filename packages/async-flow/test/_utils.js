import { prepareAsyncFlowTools } from '../src/async-flow.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {PreparationOptions} from '../src/types.js';
 */

/**
 * @param {*} t
 * @param {Zone} zone
 * @param {PreparationOptions} [opts]
 */
export const prepareTestAsyncFlowTools = (t, zone, opts) => {
  const {
    panicHandler = e => {
      t.log('Panic handler called', e);
      t.fail('Unexpected panic');
    },
  } = opts || {};
  return prepareAsyncFlowTools(zone, { panicHandler, ...opts });
};
harden(prepareTestAsyncFlowTools);
