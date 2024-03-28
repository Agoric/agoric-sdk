// @ts-check
import { E } from '@endo/far';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     loadCriticalVat: VatLoader<any>;
 *     bridgeManager: import('../types').BridgeManager;
 *     vtransferBridgeManager: import('../types').ScopedBridgeManager;
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
    produce: { transferMiddleware, transferVat, vtransferBridgeManager },
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

  transferVat.reset();
  transferVat.resolve(vats.transfer);
  const provideKit = mgr =>
    E(vats.transfer).provideBridgeTargetKit(mgr, 'VTRANSFER_IBC_EVENT');
  /** @type {Awaited<ReturnType<typeof provideKit>>} */
  let kit;
  try {
    const m = await E(bridgeManager).register(BRIDGE_ID.VTRANSFER);
    vtransferBridgeManager.reset();
    vtransferBridgeManager.resolve(m);
    kit = await provideKit(m);
    await E(m).initHandler(kit.bridgeHandler);
    console.info('Successfully initHandler for', BRIDGE_ID.VTRANSFER);
  } catch (e) {
    console.error(
      'Failed to initHandler',
      BRIDGE_ID.VTRANSFER,
      'reason:',
      e,
      'falling back to setHandler',
    );
    const m = await vtransferBridgeManagerP;
    kit = await provideKit(m);
    await E(m).setHandler(kit.bridgeHandler);
    console.info('Successfully setHandler for', BRIDGE_ID.VTRANSFER);
  }

  const newTransferMiddleware = await E(vats.transfer).makeTransferMiddleware(
    kit,
  );
  transferMiddleware.reset();
  transferMiddleware.resolve(newTransferMiddleware);
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
