/** @file core-eval that includes changes necessary to support FastUSDC to Solana and EVM Chains */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';

const trace = makeTracer('FUSD-EVM-SOL', true);

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {BundleID} from '@agoric/swingset-vat';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 * @import {FastUSDCCorePowers} from './start-fast-usdc.core.js';
 */

const { keys } = Object;

const config = /** @type {const} */ ({
  MAINNET: {
    agoricToNoble: {
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
    },
  },
});
harden(config);

/**
 * @typedef {object} UpdateOpts
 * @property {IBCConnectionInfo} [agoricToNoble]
 * @property {{bundleID: BundleID}} [fastUsdcCode]
 */

/**
 * @param {BootstrapPowers & FastUSDCCorePowers} powers
 * @param {object} [config]
 * @param {UpdateOpts} [config.options]
 */
export const upgradeEvmSolana = async (
  { consume: { fastUsdcKit } },
  { options = {} } = {},
) => {
  trace('options', options);
  const {
    agoricToNoble = config.MAINNET.agoricToNoble,
    fastUsdcCode = assert.fail('missing bundleID'),
  } = options;
  const fuKit = await fastUsdcKit;
  trace('fastUsdcKit.privateArgs keys:', keys(fuKit.privateArgs));
  const { adminFacet, creatorFacet } = fuKit;
  const upgraded = await E(adminFacet).upgradeContract(
    fastUsdcCode.bundleID,
    fuKit.privateArgs,
  );
  trace('fastUsdc upgraded', upgraded);

  /**
   * update existing registered chains to include CAIP-2 `namespace` and `reference`
   */
  for (const [chainName, info] of Object.entries(fuKit.privateArgs.chainInfo)) {
    // note: connections in privateArgs is stale, but we're not using them here
    const { connections: _, ...chainInfo } =
      /** @type {Omit<CosmosChainInfo, 'reference' | 'namespace'>} */ (info);
    await E(creatorFacet).updateChain(chainName, {
      ...chainInfo,
      namespace: 'cosmos',
      reference: chainInfo.chainId,
      // does not affect runtime logic, but best to include for consistency
      ...(chainName === 'noble' && {
        cctpDestinationDomain: cctpChainInfo.noble.cctpDestinationDomain,
      }),
    });
  }
  // XXX consider updating fuKit with new privateArgs.chainInfo
  trace('chainHub repaired');

  /**
   * register new destination chains reachable via CCTP
   */
  for (const [chainName, info] of Object.entries(cctpChainInfo)) {
    if (chainName === 'noble') continue;
    await E(creatorFacet).registerChain(chainName, {
      ...info,
      // for backwards compatibility with `CosmosChainInfoShapeV1` which expects a `chainId`
      chainId: `${info.namespace}:${info.reference}`,
    });
  }

  const { agoric, noble } = fuKit.privateArgs.chainInfo;
  /**
   * It's necessary to supply parameters, as `lookupChainsAndConnection` now performs
   * a namespace === 'cosmos' check. In the initial upgrade, connectionInfo will be undefined
   * as a result. After calling `chainHub.updateChain()`, subsequent calls should resolve.
   *
   * Our contract relies on `agToNoble` when creating the `Settler`, but since `zone.makeOnce()`
   * is used it's OK for this to be undefined until a future incarnation.
   */
  await E(creatorFacet).connectToNoble(
    agoric.chainId,
    noble.chainId,
    agoricToNoble,
  );
  trace('setIntermediateAccount done');
};

/**
 * @param {unknown} _utils
 * @param {{
 *   installKeys: { fastUsdc: ERef<ManifestBundleRef> };
 *   options: Omit<UpdateOpts, 'fastUsdcCode'> & CopyRecord;
 * }} opts
 */
export const getManifestForUpgradeEvmSolana = (
  _utils,
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [upgradeEvmSolana.name]: {
        consume: { fastUsdcKit: true },
      },
    },
    options: { ...options, fastUsdcCode: installKeys.fastUsdc },
  };
};
