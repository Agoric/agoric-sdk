/* global E */
/// <reference types="@agoric/vats/src/core/core-eval-env.js" />

/**
 * @import {FastUSDCCorePowers} from '../src/start-fast-usdc.core.js'
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 */

const trace = (...args) => console.log('FUPS', ...args);
trace('script starting');

/** @param {BootstrapPowers & FastUSDCCorePowers} powers */
const pruneFastUsdcStorage = async powers => {
  trace('pruneFastUsdcStorage');
  const { fastUsdcKit } = powers.consume;
  const { creatorFacet } = await fastUsdcKit;
  trace(creatorFacet);
  await E(creatorFacet).deleteCompletedTxs();
  trace('done');
};

trace('script finishing');
pruneFastUsdcStorage;
