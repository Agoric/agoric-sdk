import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

// TODO: refactor overlap with init-chain-info.js in orch pkg

/**
 * @import {Remote, ERemote} from '@agoric/internal';
 * @import {NameHub, NameAdmin} from '@agoric/vats';
 * @typedef {{
 *   chainId?: string;
 *   connections?: Record<string, {
 *     id: string;
 *     client_id: string;
 *     state: unknown;
 *     counterparty: {
 *       client_id: string;
 *       connection_id: string;
 *     };
 *     transferChannel: {
 *       channelId: string;
 *       counterPartyChannelId: string;
 *       portId: string;
 *       counterPartyPortId: string;
 *       [name: string]: unknown;
 *     };
 *     [name: string]: unknown;
 *   }>;
 *   [name: string]: unknown;
 * }} ChainInfo
 * @typedef {Record<string, { chainInfo: ChainInfo }>} AxelarChainConfigMap
 * @import {ERef} from '@endo/eventual-send';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {PromiseSpaceOf} from '@agoric/vats/src/core/types.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 */

const trace = makeTracer('ChainInfoCore', true);

// chainInfo has no cap data but we need to marshal bigints
const marshalData = makeMarshal(_val => Fail`data only`);

// See also: exos/chain-hub. Consistency is enforced by test.
export const HubName = {
  Chain: 'chain',
  ChainConnection: 'chainConnection',
  ChainAssets: 'chainAssets',
};

const CHAIN_ID_SEPARATOR = '_';

/**
 * @param {string} chainId
 */
const encodeChainId = chainId =>
  chainId.replaceAll(
    CHAIN_ID_SEPARATOR,
    `${CHAIN_ID_SEPARATOR}${CHAIN_ID_SEPARATOR}`,
  );

/**
 * @param {string} chainId1
 * @param {string} chainId2
 */
const connectionKey = (chainId1, chainId2) =>
  [encodeChainId(chainId1), encodeChainId(chainId2)]
    .sort()
    .join(CHAIN_ID_SEPARATOR);

/**
 * @param {NonNullable<NonNullable<ChainInfo['connections']>[string]>} connInfo
 */
const reverseConnInfo = connInfo => {
  const { transferChannel } = connInfo;
  return harden({
    id: connInfo.counterparty.connection_id,
    client_id: connInfo.counterparty.client_id,
    counterparty: {
      client_id: connInfo.client_id,
      connection_id: connInfo.id,
    },
    state: connInfo.state,
    transferChannel: {
      ...transferChannel,
      channelId: transferChannel.counterPartyChannelId,
      counterPartyChannelId: transferChannel.channelId,
      portId: transferChannel.counterPartyPortId,
      counterPartyPortId: transferChannel.portId,
    },
  });
};

/**
 * @param {string} primaryChainId
 * @param {string} counterChainId
 * @param {NonNullable<NonNullable<ChainInfo['connections']>[string]>} connInfo
 * @returns {[string, NonNullable<NonNullable<ChainInfo['connections']>[string]>]}
 */
const normalizeConnectionInfo = (primaryChainId, counterChainId, connInfo) => {
  const key = connectionKey(primaryChainId, counterChainId);
  if (primaryChainId < counterChainId) {
    return [key, connInfo];
  }
  return [key, reverseConnInfo(connInfo)];
};

/**
 * local copy of orchestration's chain registration so deploy-script-support
 * does not depend on orchestration internals.
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {string} name
 * @param {ChainInfo} chainInfo
 * @param {(...messages: string[]) => void} [log]
 * @param {Set<string>} [handledConnections]
 */
const registerChain = async (
  agoricNamesAdmin,
  name,
  chainInfo,
  log = () => {},
  handledConnections = new Set(),
) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild(HubName.Chain);
  const { nameAdmin: connAdmin } = await E(agoricNamesAdmin).provideChild(
    HubName.ChainConnection,
  );

  const { connections = {}, ...vertex } = chainInfo;
  const promises = [
    E(nameAdmin)
      .update(name, vertex)
      .then(() => log(`registered agoricNames chain.${name}`)),
  ];

  const { chainId } = chainInfo;
  if (Object.keys(connections).length && !chainId) {
    Fail`chainInfo missing chainId for ${name}`;
  }

  for (const [counterChainId, connInfo] of Object.entries(connections)) {
    if (!chainId) {
      break;
    }
    const [key, connectionInfo] = normalizeConnectionInfo(
      chainId,
      counterChainId,
      connInfo,
    );
    if (handledConnections.has(key)) {
      continue;
    }

    promises.push(
      E(connAdmin)
        .update(key, connectionInfo)
        .then(() => log(`registering agoricNames chainConnection.${key}`)),
    );
    handledConnections.add(key);
  }
  await Promise.all(promises);
};

/**
 * Similar to publishAgoricNamesToChainStorage but publishes a node per chain
 * instead of one list of entries
 */

/**
 * For each HubName, provide a NameHubKit reflected into vstorage unless there's
 * already an agorcNames key by that name.
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {ERemote<StorageNode>} agoricNamesNode
 * @param {ERef<NameHub>} agoricNames
 */
const publishChainInfoToChainStorage = async (
  agoricNamesAdmin,
  agoricNamesNode,
  agoricNames,
) => {
  /**
   * @param {string} subpath
   */
  const echoNameUpdates = async subpath => {
    trace('reflecting', subpath, 'from agoricNames to vstorage');
    const chainNamesNode = E(agoricNamesNode).makeChildNode(subpath);
    const { nameAdmin } = await E(agoricNamesAdmin).provideChild(subpath);

    /**
     * Previous entries, to prevent redundant updates
     *
     * @type {Record<string, string>} chainName => stringified chainInfo
     */
    const prev = {};

    // XXX cannot be changed until we upgrade vat-agoricNames to allow it
    await E(nameAdmin).onUpdate(
      // XXX will live on the heap in the bootstrap vat. When we upgrade or kill
      // that this handler will sever and vat-agoricNames will need to be upgraded
      // to allow changing the handler, or to use pubsub mechanics instead.
      Far('chain info writer', {
        write(entries) {
          for (const [chainName, info] of entries) {
            const value = JSON.stringify(marshalData.toCapData(info));
            if (prev[chainName] === value) {
              continue;
            }
            const chainNode = E(chainNamesNode).makeChildNode(chainName);
            prev[chainName] = value;
            void E(chainNode)
              .setValue(value)
              .catch(() => delete prev[chainName]);
          }
        },
      }),
    );
  };
  const existingKeys = await E(agoricNames).keys();
  await Promise.all(
    Object.values(HubName)
      .filter(k => !existingKeys.includes(k))
      .map(echoNameUpdates),
  );
};

/**
 * null chainStorage case is vestigial
 *
 * @typedef {{ consume: { chainStorage: Promise<Remote<StorageNode>> } }} ChainStoragePresent
 */

/**
 * XXX move this into BootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   chainInfoPublished: unknown
 * }>} ChainInfoPowers
 */

/**
 * WARNING: prunes any data that was previously published
 *
 * @param {BootstrapPowers & ChainStoragePresent & ChainInfoPowers} powers
 * @param {{
 *   options: {
 *     chainInfo?: Record<string, ChainInfo>;
 *     axelarConfig: AxelarChainConfigMap;
 *   };
 * }} config
 */
export const publishChainInfo = async (
  {
    consume: { agoricNames, agoricNamesAdmin, chainStorage },
    produce: { chainInfoPublished },
  },
  config,
) => {
  const { keys } = Object;
  const { chainInfo = {} } = config.options;
  trace('publishChainInfo', keys(chainInfo));

  const agoricNamesNode = E(chainStorage).makeChildNode('agoricNames');

  // Ensure updates go to vstorage
  await publishChainInfoToChainStorage(
    agoricNamesAdmin,
    agoricNamesNode,
    agoricNames,
  );

  for (const kind of Object.values(HubName)) {
    const hub = E(agoricNames).lookup(kind);
    /** @type {string[]} */
    const oldKeys = await E(hub).keys();
    trace('clearing old', kind, oldKeys);
    if (!oldKeys.length) continue;

    const admin = E(agoricNamesAdmin).lookupAdmin(kind);
    await Promise.all(oldKeys.map(k => E(admin).delete(k)));
    const node = E(agoricNamesNode).makeChildNode(kind);
    // XXX setValue('') deletes a vstorage key (right?)
    await Promise.all(
      oldKeys.map(k =>
        E(E(node).makeChildNode(k, { sequence: false })).setValue(''),
      ),
    );
  }

  const handledConnections = new Set();
  for await (const [name, info] of Object.entries(chainInfo)) {
    await registerChain(
      agoricNamesAdmin,
      name,
      info,
      trace,
      handledConnections,
    );
    trace('@@@registered', name, info);
  }
  trace('@@@conn', ...handledConnections);

  chainInfoPublished.resolve(true);
  trace('publishChainInfo done');
};
harden(publishChainInfo);

export const getManifestForChainInfo = (_u, { options }) => ({
  manifest: {
    [publishChainInfo.name]: {
      consume: {
        agoricNames: true,
        agoricNamesAdmin: true,
        chainStorage: true,
      },
      produce: { chainInfoPublished: true },
    },
  },
  options,
});
