import { prepareVowTools } from '@agoric/vow';
import { prepareAsyncFlowTools } from '../src/async-flow.js';

/**
 * @import {ExecutionContext} from 'ava';
 * @import {Zone} from '@agoric/base-zone';
 * @import {PreparationOptions} from '../src/types.js';
 */

/**
 * @param {ExecutionContext} t
 * @param {Zone} zone
 * @param {PreparationOptions} [opts]
 */
export const prepareTestAsyncFlowTools = (t, zone, opts) => {
  const {
    panicHandler = e => {
      t.log('Panic handler called', e);
      t.fail('Unexpected panic');
    },
    vowTools = prepareVowTools(zone),
    ...otherOpts
  } = { ...opts };

  const asyncFlowTools = prepareAsyncFlowTools(zone, {
    panicHandler,
    vowTools,
    ...otherOpts,
  });
  return { ...vowTools, ...asyncFlowTools };
};
harden(prepareTestAsyncFlowTools);
