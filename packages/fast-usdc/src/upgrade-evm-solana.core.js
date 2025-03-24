/** @file core-eval to update Advancer's reference to Settler */

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('FUSD-EVM-SOL', true);

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {IBCConnectionInfo} from '@agoric/orchestration';
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
        connection_id: 'connection-38', // was: connection-40
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

  for (const [chainName, info] of Object.entries(fuKit.privateArgs.chainInfo)) {
    // note: connections in privateArgs is stale, but we only need `connections`
    const { connections: _, ...chainInfo } = info;
    await E(creatorFacet).updateChain(chainName, {
      ...chainInfo,
      namespace: 'cosmos',
      reference: chainInfo.chainId,
    });
  }
  trace('chainHub repaired');

  // TODO register new EVM/Solana chains

  const { agoric, noble } = fuKit.privateArgs.chainInfo;
  // TODO without parameters, why do we see `Cannot read properties of undefined (reading \'counterparty\')',` (`agToNoble` undefined)
  await E(creatorFacet).connectToNoble(
    agoric.chainId,
    noble.chainId,
    agoricToNoble,
  );
  trace('setIntermediateRecipient done');
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
