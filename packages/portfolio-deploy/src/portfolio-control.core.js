/** @file core eval to give control of YMax contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { objectMap } from '@endo/patterns';
import { passStyleOf } from '@endo/pass-style';

/**
 * @import {ContractControlPowers, DeliverContractControl} from './contract-control.core.js';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 * @import {StartFn} from './portfolio-start.type.ts';
 */

/**
 * @typedef {object} DelegatePortfolioOptions
 * @property {string} ymaxControlAddress
 */

const contractName = 'ymax0';

const trace = makeTracer('PCtrl');

/**
 * @param {BootstrapPowers &
 *  ContractControlPowers &
 *  PortfolioBootPowers
 * } permitted
 * @param {{ options: DelegatePortfolioOptions}} config
 */
export const delegatePortfolioContract = async (permitted, config) => {
  const { ymaxControlAddress } = config?.options || {};
  assert(ymaxControlAddress);

  await null;
  const { consume } = permitted;

  const { privateArgs } = await consume.ymax0Kit;
  trace(
    'ymax0Kit.privateArgs',
    objectMap(privateArgs, v => passStyleOf(v)),
  );

  const deliverContractControl = await consume.deliverContractControl;

  // Note: we don't wait till chainInfoPublished settles, but any invocation
  // of start should be done after

  const { contractControl } = await deliverContractControl({
    name: contractName,
    controlAddress: ymaxControlAddress,
    initialPrivateArgs: privateArgs,
  });

  trace(
    'created ymax control',
    passStyleOf(contractControl),
    'and delivering to',
    ymaxControlAddress,
  );
};

export const getManifestForPortfolioControl = (utils, { options }) => ({
  manifest: {
    [delegatePortfolioContract.name]: {
      consume: {
        deliverContractControl: true,
        ymax0Kit: true,
      },
    },
  },
  options,
});
