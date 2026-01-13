/** @file core eval to give control of YMax contract to a smartWallet */

import { makeTracer } from '@agoric/internal/src/debug.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { objectMap } from '@endo/patterns';
import { E, passStyleOf, getInterfaceOf } from '@endo/far';

/**
 * @import {ContractControlPowers, DeliverContractControl} from './contract-control.core.js';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 * @import {StartFn} from './portfolio-start.type.ts';
 * @import {UpgradeKit, GetUpgradeKitPowers} from './get-upgrade-kit.core.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
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

/**
 * @param {*} name
 * @returns {name is YMaxCN}
 */
export const isYMaxContractName = name =>
  typeof name === 'string' && name.startsWith('ymax');

/**
 * @param {BootstrapPowers &
 *  ContractControlPowers &
 *  GetUpgradeKitPowers &
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

  const trace = makeTracer(`PCtrl-${contractName}`);

  trace('getting existing instance kit');
  /** @type {UpgradeKit<StartFn> | undefined} */
  let kit;
  try {
    kit = await E(consume.getUpgradeKit)(contractName);
  } catch (err) {
    trace(
      'Could not get existing instance kit, falling back to promise space',
      err,
    );
    // The kit may not exist in promise space, but if it does, it is resolved already
    kit = await Promise.race([consume[`${contractName}Kit`], undefined]);
  }

  trace(
    'kit',
    kit &&
      objectMap(kit, v => {
        const style = passStyleOf(v);
        return style === 'remotable' ? getInterfaceOf(v) : style;
      }),
  );
  trace(
    'kit?.privateArgs',
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

  const deliverContractControl = await consume.deliverContractControl;

  // Note: we don't wait till chainInfoPublished settles, but any invocation
  // of start should be done after

  const { contractControl } = await deliverContractControl({
    name: contractName,
    controlAddress: ymaxControlAddress,
    initialPrivateArgs,
    kit,
  });

  trace(
    'created ymax control',
    passStyleOf(contractControl),
    'and delivering to',
    ymaxControlAddress,
  );
};

export const getManifestForPortfolioControl = (utils, { options }) => {
  const { contractName } = options;
  return {
    manifest: {
      [delegatePortfolioContract.name]: {
        consume: {
          deliverContractControl: true,
          getUpgradeKit: true,
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
