import { Fail } from '@endo/errors';
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';
import { registerKnownChains } from '../chain-info.js';
import { CHAIN_KEY, CONNECTIONS_KEY } from '../exos/chain-hub.js';

const trace = makeTracer('InitChainInfo', true);

/**
 * Similar to publishAgoricNamesToChainStorage but publishes a node per chain
 * instead of one list of entries
 */

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {ERef<StorageNode | null>} chainStorageP
 */
const publishChainInfoToChainStorage = async (
  agoricNamesAdmin,
  chainStorageP,
) => {
  const chainStorage = await chainStorageP;
  if (!chainStorage) {
    console.warn('no chain storage, not registering chain info');
    return;
  }

  const agoricNamesNode = await E(chainStorage).makeChildNode('agoricNames');

  /**
   * @param {string} subpath
   */
  const echoNameUpdates = async subpath => {
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
          // chainInfo has no cap data but we need to marshal bigints
          const marshalData = makeMarshal(_val => Fail`data only`);
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
  await echoNameUpdates(CHAIN_KEY);
  await echoNameUpdates(CONNECTIONS_KEY);
};

/**
 * @param {BootstrapPowers} powers
 */
export const initChainInfo = async ({
  consume: { agoricNamesAdmin, chainStorage: chainStorageP },
}) => {
  trace('init-chainInfo');

  // First set up callback to write updates to vstorage
  await publishChainInfoToChainStorage(agoricNamesAdmin, chainStorageP);

  // Now register the names
  await registerKnownChains(agoricNamesAdmin, trace);
};
harden(initChainInfo);

export const getManifestForChainInfo = () => ({
  manifest: {
    [initChainInfo.name]: {
      consume: {
        agoricNamesAdmin: true,
        chainStorage: true,
      },
    },
  },
});
