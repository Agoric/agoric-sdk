import { Fail } from '@endo/errors';
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { makeTracer, objectMap } from '@agoric/internal';
import { HubName } from '../constants.js';
import {
  makeAssetInfo,
  registerChain,
  registerChainAssets,
  selectCosmosChainInfo,
} from '../chain-name-service.js';

/**
 * @import {ChainInfo, CosmosChainInfo, Denom} from '@agoric/orchestration';
 * @import {NameHub, NameAdmin} from '@agoric/vats';
 */

const trace = makeTracer('ChainInfoCore', true);

// chainInfo has no cap data but we need to marshal bigints
const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * Similar to publishAgoricNamesToChainStorage but publishes a node per chain
 * instead of one list of entries
 */

/**
 * For each HubName, provide a NameHubKit reflected into vstorage unless there's
 * already an agorcNames key by that name.
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {ERef<StorageNode>} chainStorageP
 * @param {ERef<NameHub>} agoricNames
 */
const publishChainInfoToChainStorage = async (
  agoricNamesAdmin,
  chainStorageP,
  agoricNames,
) => {
  const agoricNamesNode = E(chainStorageP).makeChildNode('agoricNames');

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
 * @typedef {{ consume: { chainStorage: Promise<StorageNode> } }} ChainStoragePresent
 */

/**
 * WARNING: prunes any data that was previously published
 *
 * @param {BootstrapPowers & ChainStoragePresent} powers
 * @param {{
 *   options?: {
 *     chainInfo?: Record<string, ChainInfo>;
 *   };
 * }} [config]
 */
export const publishChainInfo = async (
  { consume: { agoricNames, agoricNamesAdmin, chainStorage } },
  config = {},
) => {
  const { keys } = Object;
  const { chainInfo = {} } = config?.options || {};
  trace('publishChainInfo', keys(chainInfo));

  // Ensure updates go to vstorage
  await publishChainInfoToChainStorage(
    agoricNamesAdmin,
    chainStorage,
    agoricNames,
  );

  const agoricNamesNode = E(chainStorage).makeChildNode('agoricNames');
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
      oldKeys.map(k => E(E(node).makeChildNode(k)).setValue('')),
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
    },
  },
  options,
});
