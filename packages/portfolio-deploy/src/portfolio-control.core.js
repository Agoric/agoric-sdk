/** @file core eval to give control of YMax contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { objectMap } from '@endo/patterns';
import { E, passStyleOf } from '@endo/far';

/**
 * @import {ContractControlPowers, DeliverContractControl} from './contract-control.core.js';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 * @import {StartFn} from './portfolio-start.type.ts';
 */

/**
 * @template {number} [T=number]
 * @typedef {`ymax${T}`} YMaxCN
 */

/**
 * @template {YMaxCN} [CN=YMaxCN]
 * @typedef {object} DelegatePortfolioOptions
 * @property {string} ymaxControlAddress
 * @property {CN} contractName
 */

const trace = makeTracer('PCtrl');

/**
 * @param {*} name
 * @returns {name is YMaxCN}
 */
export const isYMaxContractName = name =>
  typeof name === 'string' && name.startsWith('ymax');

/**
 * @param {BootstrapPowers &
 *  ContractControlPowers &
 *  PortfolioBootPowers
 * } permitted
 * @param {{ options: DelegatePortfolioOptions}} config
 */
export const delegatePortfolioContract = async (permitted, config) => {
  const { ymaxControlAddress, contractName } = config?.options || {};
  assert(ymaxControlAddress);
  assert(isYMaxContractName(contractName));

  await null;
  const { consume } = permitted;

  // TODO: use the kit and privateAgrs that startUpgradable stores instead (or as preference)
  // It does require a lot of powers, maybe we need a new helper to get these, or implement it in contract control

  // The kit may not exist
  const kit = await Promise.race([consume[`${contractName}Kit`], undefined]);
  trace(
    `${contractName}Kit?.privateArgs`,
    kit?.privateArgs && objectMap(kit.privateArgs, v => passStyleOf(v)),
  );

  const {
    localchain,
    cosmosInterchainService,
    chainTimerService,
    agoricNames,
    board,
  } = consume;

  const initialPrivateArgs = await deeplyFulfilledObject(
    harden({
      localchain,
      orchestrationService: cosmosInterchainService,
      timerService: chainTimerService,
      agoricNames,
      marshaller: E(board).getPublishingMarshaller(),
    }),
  );

  const deliverContractControl =
    /** @type {DeliverContractControl<StartFn>} */ (
      await consume.deliverContractControl
    );

  // Note: we don't wait till chainInfoPublished settles, but any invocation
  // of start should be done after

  const { contractControl } = await deliverContractControl({
    name: contractName,
    controlAddress: ymaxControlAddress,
    initialPrivateArgs,
    kit,
  });

  trace(`created ${contractName} control`, passStyleOf(contractControl));
};

export const getManifestForPortfolioControl = (utils, { options }) => {
  const { contractName } = options;
  return {
    manifest: {
      [delegatePortfolioContract.name]: {
        consume: {
          deliverContractControl: true,
          [`${contractName}Kit`]: true,

          // subset of orchPermit
          localchain: true,
          cosmosInterchainService: true,
          chainTimerService: true,
          agoricNames: true,

          // for publishing Brands and other remote object references
          board: true,
        },
      },
    },
    options,
  };
};
