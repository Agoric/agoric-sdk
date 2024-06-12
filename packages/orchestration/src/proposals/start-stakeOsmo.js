import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { makeChainHub } from '../utils/chainHub.js';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {StakeIcaSF} from '../examples/stakeIca.contract';
 */

const trace = makeTracer('StartStakeOsmo', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       stakeIca: Installation<
 *         import('../examples/stakeIca.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const startStakeOsmo = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    orchestration,
    startUpgradable,
  },
  installation: {
    consume: { stakeIca },
  },
  instance: {
    // @ts-expect-error stakeOsmo not typed
    produce: { stakeOsmo: produceInstance },
  },
}) => {
  const VSTORAGE_PATH = 'stakeOsmo';
  trace('startStakeOsmo');
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  // TODO add osmo to bank
  const atomIssuer = await E(agoricNames).lookup('issuer', 'ATOM');
  trace('ATOM Issuer', atomIssuer);

  const chainHub = makeChainHub(await agoricNames);

  const agoric = await chainHub.getChainInfo('agoric');
  const osmosis = await chainHub.getChainInfo('osmosis');
  const connectionInfo = await chainHub.getConnectionInfo(
    agoric.chainId,
    osmosis.chainId,
  );

  /** @type {StartUpgradableOpts<StakeIcaSF>} */
  const startOpts = {
    label: 'stakeOsmo',
    installation: stakeIca,
    issuerKeywordRecord: harden({ ATOM: atomIssuer }),
    terms: {
      chainId: osmosis.chainId,
      hostConnectionId: /** @type {IBCConnectionID} */ (connectionInfo.id),
      controllerConnectionId: /** @type {IBCConnectionID} */ (
        connectionInfo.counterparty.connection_id
      ),
      bondDenom: osmosis.stakingTokens[0].denom,
      icqEnabled: osmosis.icqEnabled,
    },
    privateArgs: {
      orchestration: await orchestration,
      storageNode,
      marshaller,
      timer: await chainTimerService,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startStakeOsmo);

export const getManifestForStakeOsmo = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startStakeOsmo.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          orchestration: true,
          startUpgradable: true,
        },
        installation: {
          consume: { stakeIca: true },
        },
        instance: {
          produce: { stakeOsmo: true },
        },
      },
    },
    installations: {
      stakeIca: restoreRef(installKeys.stakeIca),
    },
    options,
  };
};
