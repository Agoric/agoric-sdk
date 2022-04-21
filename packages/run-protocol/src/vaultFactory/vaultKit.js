// @ts-check
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { makeVaultTitle } from './vaultTitle';

/**
 * Create a kit of utilities for use of the (inner) vault.
 *
 * @param {InnerVault} inner
 * @param {Notifier<import('./vaultManager').AssetState>} assetNotifier
 */
export const makeVaultKit = (inner, assetNotifier) => {
  const { title, helper } = makeVaultTitle(inner);
  const vaultKit = harden({
    publicNotifiers: {
      vault: title.getNotifier(),
      asset: assetNotifier,
    },
    invitationMakers: Far('invitation makers', {
      AdjustBalances: title.makeAdjustBalancesInvitation,
      CloseVault: title.makeCloseInvitation,
      TransferVault: title.makeTransferInvitation,
    }),
    vault: title,
    vaultUpdater: helper.getUpdater(),
  });
  return vaultKit;
};

/** @typedef {(ReturnType<typeof makeVaultKit>)} VaultKit */
