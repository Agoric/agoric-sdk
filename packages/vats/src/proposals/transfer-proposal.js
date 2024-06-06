// @ts-check
import { E } from '@endo/far';
import { BridgeId as BRIDGE_ID, VTRANSFER_IBC_EVENT } from '@agoric/internal';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     loadCriticalVat: VatLoader<any>;
 *     bridgeManager: import('../types').BridgeManager;
 *     vtransferBridgeManager: import('../types').ScopedBridgeManager<'vtransfer'>;
 *   };
 *   produce: {
 *     transferMiddleware: Producer<any>;
 *     transferVat: Producer<any>;
 *     vtransferBridgeManager: Producer<any>;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ transferRef: VatSourceRef }} options.options
 *
 * @typedef {{
 *   transfer: ERef<import('../vat-transfer.js').TransferVat>;
 * }} TransferVats
 */
export const setupTransferMiddleware = async (
  {
    consume: {
      loadCriticalVat,
      bridgeManager: bridgeManagerP,
      vtransferBridgeManager: vtransferBridgeManagerP,
    },
    produce: {
      transferMiddleware: produceTransferMiddleware,
      transferVat: produceTransferVat,
      vtransferBridgeManager: produceVtransferBridgeManager,
    },
  },
  options,
) => {
  const bridgeManager = await bridgeManagerP;
  if (!bridgeManager) {
    console.error('No bridgeManager, skipping setupTransferMiddleware');
    return;
  }

  const { transferRef } = options.options;
  /** @type {TransferVats} */
  const vats = {
    transfer: E(loadCriticalVat)('transfer', transferRef),
  };
  // don't proceed if loadCriticalVat fails
  await Promise.all(Object.values(vats));
  produceTransferVat.reset();
  produceTransferVat.resolve(vats.transfer);

  const vtransferID = BRIDGE_ID.VTRANSFER;
  const provideTransferKit = bridge =>
    E(vats.transfer).provideBridgeTargetKit(bridge, VTRANSFER_IBC_EVENT);
  /** @type {Awaited<ReturnType<typeof provideTransferKit>>} */
  let transferKit;
  try {
    const vtransferBridge = await E(bridgeManager).register(vtransferID);
    produceVtransferBridgeManager.reset();
    produceVtransferBridgeManager.resolve(vtransferBridge);
    transferKit = await provideTransferKit(vtransferBridge);
    await E(vtransferBridge).initHandler(transferKit.bridgeHandler);
    console.info('Successfully initHandler for', vtransferID);
  } catch (e) {
    console.error(
      'Failed to initHandler',
      vtransferID,
      'reason:',
      e,
      'falling back to setHandler',
    );
    const vtransferBridge = await vtransferBridgeManagerP;
    transferKit = await provideTransferKit(vtransferBridge);
    await E(vtransferBridge).setHandler(transferKit.bridgeHandler);
    console.info('Successfully setHandler for', vtransferID);
  }

  const { targetHost, targetRegistry } = transferKit;
  const transferMiddleware = await E(vats.transfer).makeTransferMiddleware({
    targetHost,
    targetRegistry,
  });
  produceTransferMiddleware.reset();
  produceTransferMiddleware.resolve(transferMiddleware);
};

export const getManifestForTransfer = (_powers, { transferRef }) => ({
  manifest: {
    [setupTransferMiddleware.name]: {
      consume: {
        loadCriticalVat: true,
        bridgeManager: 'bridge',
        vtransferBridgeManager: 'transfer',
      },
      produce: {
        transferMiddleware: 'transfer',
        transferVat: 'transfer',
        vtransferBridgeManager: 'transfer',
      },
    },
  },
  options: {
    transferRef,
  },
});
