/** @file core-eval to 1) update ChainInfo 2) re-request the Noble ICA `intermediateRecipient` */

import { E } from '@endo/far';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makePublishingStorageKit } from './start-fast-usdc.core.js';

const trace = makeTracer('FUSD-2', true);

/**
 * @import {Passable} from '@endo/pass-style'
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {FastUSDCConfig} from './types.js'
 */

const contractName = 'fastUsdc';
const POOL_METRICS = 'poolMetrics';

/**
 * @param {BootstrapPowers &
 *  { consume: { fastUsdcKit: Promise<StartedInstanceKit<import('./fast-usdc.contract.js').FastUsdcSF> }}
 * } powers
 */
export const updateNobleICA = async ({
  consume: {
    agoricNames,
    board,
    chainTimerService: timerService,
    chainStorage,
    cosmosInterchainService,
    localchain,
    fastUsdcKit: fastUsdcKitP,
  },
}) => {
  await null;
  const fastUsdcKit = await fastUsdcKitP;

  const { storageNode, marshaller } = await makePublishingStorageKit(
    contractName,
    {
      board,
      // @ts-expect-error Promise<null> case is vestigial
      chainStorage,
    },
  );
  const poolMetricsNode = await E(storageNode).makeChildNode(POOL_METRICS);

  // TODO, seems we need to supply this again
  const feeConfig = {};

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      feeConfig,
      localchain,
      orchestrationService: cosmosInterchainService,
      poolMetricsNode,
      storageNode,
      timerService,
      marshaller,
      chainInfo: {}, // ignored after first incarnation
      assetInfo: [], // ignored after first incarnation
    }),
  );

  // TODO: get new bundle from options
  const newBundleId = 'b1-1234abcd...';

  const { incarnationNumber } = await E(fastUsdcKit.adminFacet).upgradeContract(
    newBundleId,
    // @ts-expect-error FIX feeConfig
    privateArgs,
  );
  trace('new incarnation', incarnationNumber);

  const chainHub = await E(fastUsdcKit.creatorFacet).getChainHub();
  chainHub.updateConnection('agoric-3', 'noble-1', {
    id: 'connection-72',
    client_id: '07-tendermint-77',
    counterparty: {
      client_id: '07-tendermint-32',
      connection_id: 'connection-38',
    },
    state: 3,
    transferChannel: {
      channelId: 'channel-62',
      portId: 'transfer',
      counterPartyChannelId: 'channel-21',
      counterPartyPortId: 'transfer',
      ordering: 0,
      state: 3,
      version: 'ics20-1',
    },
  });

  await E(fastUsdcKit.creatorFacet).connectToNoble();
  // consider publishing `intermediateAccount: address` to storage
};

/**
 * @param {{ restoreRef }} utils
 * @param {{
 *   installKeys: { fastUsdc: ERef<ManifestBundleRef> };
 *   options: {chainInfo: FastUSDCConfig['chainInfo'] & Passable};
 * }} opts
 */
export const getManifestForUpdateNobleICA = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [updateNobleICA.name]: {
        consume: {
          bankManager: true,

          chainStorage: true,
          chainTimerService: true,
          localchain: true,
          cosmosInterchainService: true,

          zoe: true,

          agoricNames: true,
          namesByAddress: true,
          board: true,
          // StartedInstanceKit, including creator and admin facets
          fastUsdcKit: true,
        },
        // TODO - do we need to reproduce these?
        // instance: {
        //   produce: { fastUsdc: true },
        // },
        // installation: {
        //   consume: { fastUsdc: true },
        // },
      },
    },
    installations: { fastUsdc: restoreRef(installKeys.fastUsdc) },
    options,
  };
};
