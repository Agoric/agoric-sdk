// @ts-check
import { E } from '@endo/far';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import { makeScopedBridge } from '../bridge.js';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     bridgeManager: import('../types').BridgeManager;
 *     localchainBridgeManager: import('../types').ScopedBridgeManager<'vlocalchain'>;
 *     bankManager: Promise<import('../vat-bank.js').BankManager>;
 *     transferMiddleware: Promise<import('../transfer.js').TransferMiddleware>;
 *   };
 *   produce: {
 *     localchain: Producer<any>;
 *     localchainVat: Producer<any>;
 *     localchainBridgeManager: Producer<any>;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ localchainRef: VatSourceRef }} options.options
 *
 * @typedef {{
 *   localchain: ERef<import('../vat-localchain.js').LocalChainVat>;
 * }} LocalChainVats
 */
export const setupLocalChainVat = async (
  {
    consume: {
      loadCriticalVat,
      bridgeManager: bridgeManagerP,
      localchainBridgeManager: localchainBridgeManagerP,
      bankManager,
      transferMiddleware,
    },
    produce: { localchainVat, localchain, localchainBridgeManager },
  },
  options,
) => {
  const bridgeManager = await bridgeManagerP;
  if (!bridgeManager) {
    // The sim-chain doesn't have a bridgeManager, so we can't set up the
    // localchain vat.
    console.error('No bridgeManager, skipping setupLocalChainVat');
    return;
  }

  const { localchainRef } = options.options;
  /** @type {LocalChainVats} */
  const vats = {
    localchain: E(loadCriticalVat)('localchain', localchainRef),
  };
  // don't proceed if loadCriticalVat fails
  await Promise.all(Object.values(vats));

  localchainVat.reset();
  localchainVat.resolve(vats.localchain);
  /** @type {import('../types').ScopedBridgeManager<'vlocalchain'>} */
  let scopedManager;
  try {
    scopedManager = await makeScopedBridge(
      bridgeManager,
      BRIDGE_ID.VLOCALCHAIN,
    );
    localchainBridgeManager.reset();
    localchainBridgeManager.resolve(scopedManager);
  } catch (e) {
    console.error('Failed to register', BRIDGE_ID.VLOCALCHAIN, 'reason:', e);
    scopedManager = await localchainBridgeManagerP;
    console.info(
      'Successfully retrieved scopedManager for',
      BRIDGE_ID.VLOCALCHAIN,
    );
  }

  const newLocalChain = await E(vats.localchain).makeLocalChain({
    system: scopedManager,
    bankManager: await bankManager,
    transfer: await transferMiddleware,
  });

  localchain.reset();
  localchain.resolve(newLocalChain);
};

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     localchain: import('../localchain.js').LocalChain;
 *   };
 * }} powers
 * @param {object} _options
 */
export const addLocalChainToClient = async (
  { consume: { client, localchain } },
  _options,
) => {
  return E(client).assignBundle([_a => ({ localchain })]);
};

export const getManifestForLocalChain = (_powers, { localchainRef }) => ({
  manifest: {
    [setupLocalChainVat.name]: {
      consume: {
        loadCriticalVat: true,
        bridgeManager: 'bridge',
        localchainBridgeManager: 'localchain',
        bankManager: 'bank',
        transferMiddleware: 'transfer',
      },
      produce: {
        localchain: 'localchain',
        localchainVat: 'localchain',
        localchainBridgeManager: 'localchain',
      },
    },

    [addLocalChainToClient.name]: {
      consume: {
        client: 'provisioning',
        localchain: 'localchain',
      },
    },
  },
  options: {
    localchainRef,
  },
});
