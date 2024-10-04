import { prepareVowTools } from '@agoric/vow';
import { prepareAsyncFlowTools } from '../src/async-flow.js';

/**
 * @import {ExecutionContext} from 'ava';
 * @import {Zone} from '@agoric/base-zone';
 * @import {PreparationOptions} from '../src/types.js';
 */

/** @typedef {(e: any, t: ExecutionContext) => void} TestAsyncFlowPanicHandler */

/**
 * @param {ExecutionContext} t
 * @param {Zone} zone
 * @param {Omit<PreparationOptions, 'panicHandler'> & {panicHandler?: TestAsyncFlowPanicHandler}} [opts]
 */
export const prepareTestAsyncFlowTools = (t, zone, opts) => {
  const {
    panicHandler: originalPanicHandler,
    vowTools = prepareVowTools(zone),
    ...otherOpts
  } = { ...opts };

  const panicHandler = originalPanicHandler
    ? e => originalPanicHandler(e, t)
    : e => {
        t.log('Panic handler called', e);
        t.fail('Unexpected panic');
      };

  const asyncFlowTools = prepareAsyncFlowTools(zone, {
    panicHandler,
    vowTools,
    ...otherOpts,
  });
  return { ...vowTools, ...asyncFlowTools };
};
harden(prepareTestAsyncFlowTools);
