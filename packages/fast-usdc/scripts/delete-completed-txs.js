// import { E } from '@endo/far';
/* global E */

/** @import {FastUSDCCorePowers} from '../src/start-fast-usdc.core' */

const trace = (...args) => console.log('FUPS', ...args);
trace('script starting');

/** @param {BootstrapPowers & FastUSDCCorePowers} powers */
const pruneFastUsdcStorage = async powers => {
  trace('pruneFastUsdcStorage');
  const { fastUsdcKit } = powers.consume;
  const { creatorFacet } = await fastUsdcKit;
  trace(creatorFacet);
  // @ts-expect-error core eval scripts get E as an endowment
  await E(creatorFacet).deleteCompletedTxs();
  trace('done');
};

trace('script finishing');
pruneFastUsdcStorage;
